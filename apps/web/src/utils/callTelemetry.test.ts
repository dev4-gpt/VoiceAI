import { describe, it, expect, vi } from 'vitest';
import { CallTelemetry, type AgentMessage, type TelemetryBatch } from './callTelemetry';

/**
 * The live socket is untestable — it needs a real AssemblyAI session, a
 * microphone and a human. So this file is where the measurement contract is
 * actually pinned down: a scripted event sequence and a clock we own.
 *
 * Every timestamp below is an explicit argument, so nothing here depends on how
 * fast the test machine runs.
 */

function makeTelemetry(opts: Partial<ConstructorParameters<typeof CallTelemetry>[0]> = {}) {
  return new CallTelemetry({
    callId: 'call-1',
    clock: () => 0,
    startedAtEpoch: 1_700_000_000_000,
    ...opts
  });
}

function drive(t: CallTelemetry, script: Array<[number, AgentMessage]>) {
  for (const [at, msg] of script) t.handleAgentMessage(msg, at);
}

describe('CallTelemetry — greeting time-to-first-audio', () => {
  it('measures TTFA from session.update to the first greeting audio frame', () => {
    const t = makeTelemetry();
    t.markSessionUpdateSent(1000);
    drive(t, [
      [1100, { type: 'reply.started' }],
      [1400, { type: 'reply.audio' }],
      [1410, { type: 'reply.audio' }],
      [2200, { type: 'reply.done' }]
    ]);

    expect(t.greetingTimeToFirstAudioMs).toBe(400);
    // Later frames must not move the measurement.
    expect(t.snapshot().greetingTtfaMs).toBe(400);
  });

  it('attributes audio arriving before any input.speech.stopped to the greeting, not turn 0', () => {
    const t = makeTelemetry();
    t.markSessionUpdateSent(1000);
    drive(t, [
      [1100, { type: 'reply.started' }],
      [1400, { type: 'reply.audio' }],
      [2200, { type: 'reply.done' }]
    ]);

    expect(t.completedTurns()).toHaveLength(0);
    expect(t.turnCount).toBe(0);

    // The first real turn is index 0 and carries its own, separate latency.
    drive(t, [
      [5000, { type: 'input.speech.stopped' }],
      [5100, { type: 'reply.started' }],
      [5300, { type: 'reply.audio' }],
      [6000, { type: 'reply.done' }]
    ]);

    const turns = t.completedTurns();
    expect(turns).toHaveLength(1);
    expect(turns[0].turnIndex).toBe(0);
    expect(turns[0].responseLatencyMs).toBe(300);
    expect(turns[0].generationLatencyMs).toBe(200);
    // The greeting number is untouched by the turn, and vice versa.
    expect(t.snapshot().greetingTtfaMs).toBe(400);
  });

  it('reports a null TTFA rather than guessing when no greeting audio ever arrives', () => {
    const t = makeTelemetry();
    t.markSessionUpdateSent(1000);
    drive(t, [[2000, { type: 'reply.done' }]]);
    expect(t.snapshot().greetingTtfaMs).toBeNull();
  });
});

describe('CallTelemetry — per-turn latency', () => {
  it('measures response latency from speech.stopped and generation latency from reply.started', () => {
    const t = makeTelemetry();
    t.markSessionUpdateSent(0);
    drive(t, [
      [100, { type: 'reply.audio' }],
      [900, { type: 'reply.done' }],
      [2000, { type: 'input.speech.started' }],
      [3000, { type: 'input.speech.stopped' }],
      [3250, { type: 'reply.started' }],
      [3600, { type: 'reply.audio' }],
      [3640, { type: 'reply.audio' }],
      [4500, { type: 'reply.done' }]
    ]);

    const [turn] = t.completedTurns();
    expect(turn.responseLatencyMs).toBe(600);
    expect(turn.generationLatencyMs).toBe(350);
    expect(turn.interrupted).toBe(false);
  });

  it('leaves generation latency null when reply.started never arrives', () => {
    const t = makeTelemetry();
    drive(t, [
      [1000, { type: 'input.speech.stopped' }],
      [1500, { type: 'reply.audio' }],
      [2000, { type: 'reply.done' }]
    ]);
    const [turn] = t.completedTurns();
    expect(turn.responseLatencyMs).toBe(500);
    expect(turn.generationLatencyMs).toBeNull();
  });

  it('re-anchors on a repeated speech.stopped instead of opening a dead turn', () => {
    const t = makeTelemetry();
    drive(t, [
      [1000, { type: 'input.speech.stopped' }],
      [1200, { type: 'input.speech.stopped' }],
      [1500, { type: 'reply.audio' }],
      [2000, { type: 'reply.done' }]
    ]);
    const turns = t.completedTurns();
    expect(turns).toHaveLength(1);
    expect(turns[0].responseLatencyMs).toBe(300);
  });
});

describe('CallTelemetry — phantom turn protection', () => {
  it('does not create a turn from a duplicate reply.started', () => {
    const t = makeTelemetry();
    drive(t, [
      [1000, { type: 'input.speech.stopped' }],
      [1100, { type: 'reply.started' }],
      [1150, { type: 'reply.started' }],
      [1180, { type: 'reply.started' }],
      [1400, { type: 'reply.audio' }],
      [2000, { type: 'reply.done' }]
    ]);

    const turns = t.completedTurns();
    expect(turns).toHaveLength(1);
    // The first reply.started wins: a duplicate must not shorten the measurement.
    expect(turns[0].generationLatencyMs).toBe(300);
  });

  it('does not create a turn from a reply.started with no user utterance in front of it', () => {
    const t = makeTelemetry();
    t.markSessionUpdateSent(0);
    drive(t, [
      [100, { type: 'reply.audio' }],
      [800, { type: 'reply.done' }],
      // Agent volunteers a second utterance with no user turn between.
      [1000, { type: 'reply.started' }],
      [1300, { type: 'reply.audio' }],
      [1900, { type: 'reply.done' }]
    ]);

    expect(t.completedTurns()).toHaveLength(0);
    expect(t.snapshot().unattributedReplies).toBe(1);
    expect(t.snapshot().greetingTtfaMs).toBe(100);
  });

  it('does not create a turn from out-of-order reply.done', () => {
    const t = makeTelemetry();
    drive(t, [
      [500, { type: 'reply.done' }],
      [600, { type: 'reply.done' }]
    ]);
    expect(t.completedTurns()).toHaveLength(0);
  });
});

describe('CallTelemetry — interruptions', () => {
  it('counts a barge-in only while the agent is emitting audio, and records its offset', () => {
    const t = makeTelemetry();
    drive(t, [
      [1000, { type: 'input.speech.stopped' }],
      [1400, { type: 'reply.audio' }],
      [1900, { type: 'input.speech.started' }],
      [2000, { type: 'reply.done', status: 'interrupted' }],
      // Agent is silent now; normal user speech is not a barge-in.
      [2500, { type: 'input.speech.started' }],
      [3000, { type: 'input.speech.stopped' }],
      [3400, { type: 'reply.audio' }],
      [4000, { type: 'reply.done' }]
    ]);

    expect(t.interruptions).toBe(1);
    const turns = t.completedTurns();
    expect(turns).toHaveLength(2);
    expect(turns[0].interrupted).toBe(true);
    expect(turns[0].bargeInOffsetMs).toBe(500);
    expect(turns[1].interrupted).toBe(false);
    expect(turns[1].bargeInOffsetMs).toBeNull();
  });

  it('attributes a barge-in over the greeting to the greeting, not to a turn', () => {
    const t = makeTelemetry();
    t.markSessionUpdateSent(0);
    drive(t, [
      [300, { type: 'reply.audio' }],
      [900, { type: 'input.speech.started' }],
      [1000, { type: 'reply.done', status: 'interrupted' }]
    ]);

    expect(t.interruptions).toBe(1);
    expect(t.completedTurns()).toHaveLength(0);
    expect(t.snapshot().greetingBargeInOffsetMs).toBe(600);
  });

  it('counts each barge-in once per reply', () => {
    const t = makeTelemetry();
    drive(t, [
      [1000, { type: 'input.speech.stopped' }],
      [1400, { type: 'reply.audio' }],
      [1900, { type: 'input.speech.started' }],
      [1950, { type: 'input.speech.started' }],
      [2000, { type: 'reply.done', status: 'interrupted' }]
    ]);
    // Both arrive while audio is active, so both are genuine talk-over events;
    // the recorded offset stays the first one.
    expect(t.interruptions).toBe(2);
    expect(t.completedTurns()[0].bargeInOffsetMs).toBe(500);
  });
});

describe('CallTelemetry — tool calls', () => {
  it('measures tool.call -> markToolResult within the open turn', () => {
    const t = makeTelemetry();
    t.handleAgentMessage({ type: 'input.speech.stopped' }, 1000);
    t.handleAgentMessage({ type: 'tool.call', call_id: 'tc-1', name: 'create_lead' }, 1200);
    t.markToolResult('tc-1', 1700);
    t.handleAgentMessage({ type: 'reply.audio' }, 1800);
    t.handleAgentMessage({ type: 'reply.done' }, 2400);

    const [turn] = t.completedTurns();
    expect(turn.toolCalls).toBe(1);
    expect(turn.toolLatencyMs).toBe(500);
  });
});

describe('CallTelemetry — batching and finalize', () => {
  it('flushes once the configured number of turns has completed', () => {
    const batches: TelemetryBatch[] = [];
    const t = makeTelemetry({ flushEveryTurns: 3, onFlush: (b) => batches.push(b) });

    let clock = 0;
    for (let i = 0; i < 7; i++) {
      drive(t, [
        [(clock += 100), { type: 'input.speech.stopped' }],
        [(clock += 200), { type: 'reply.audio' }],
        [(clock += 400), { type: 'reply.done' }]
      ]);
    }

    expect(batches).toHaveLength(2);
    expect(batches[0].turns.map((x) => x.turnIndex)).toEqual([0, 1, 2]);
    expect(batches[1].turns.map((x) => x.turnIndex)).toEqual([3, 4, 5]);

    const final = t.finalize('ended', 9999);
    expect(final.turns.map((x) => x.turnIndex)).toEqual([6]);
    expect(final.record.turnCount).toBe(7);
  });

  it('closes an in-flight turn on finalize and reports duration and reason', () => {
    const t = makeTelemetry();
    t.markSessionUpdateSent(0);
    drive(t, [
      [1000, { type: 'input.speech.stopped' }],
      [1300, { type: 'reply.audio' }]
    ]);

    const batch = t.finalize('pagehide', 5000);
    expect(batch.record.endReason).toBe('pagehide');
    expect(batch.record.durationMs).toBe(5000);
    expect(batch.record.endedAt).toBe(1_700_000_000_000 + 5000);
    expect(batch.turns).toHaveLength(1);
    expect(batch.turns[0].responseLatencyMs).toBe(300);
  });

  it('is idempotent: the first finalize wins and later events are ignored', () => {
    const t = makeTelemetry();
    drive(t, [
      [1000, { type: 'input.speech.stopped' }],
      [1300, { type: 'reply.audio' }],
      [1800, { type: 'reply.done' }]
    ]);

    const first = t.finalize('user_ended', 4000);
    t.handleAgentMessage({ type: 'input.speech.stopped' }, 4500);
    t.handleAgentMessage({ type: 'reply.audio' }, 4800);
    const second = t.finalize('ws_close', 9000);

    expect(second.record.endReason).toBe('user_ended');
    expect(second.record.durationMs).toBe(4000);
    expect(second.record.turnCount).toBe(1);
    expect(first.turns).toHaveLength(1);
    // Already shipped, so the second call must not resend them.
    expect(second.turns).toHaveLength(0);
  });

  it('never schedules work per audio frame', () => {
    const t = makeTelemetry();
    const spy = vi.spyOn(globalThis, 'setTimeout');
    t.markSessionUpdateSent(0);
    for (let i = 0; i < 500; i++) t.handleAgentMessage({ type: 'reply.audio' }, 100 + i);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
