/**
 * Real voice-call telemetry.
 *
 * The audio path runs browser <-> AssemblyAI directly, so the server never sees
 * a frame and cannot time anything. Every latency this project is allowed to
 * quote has to be measured here, in the same tick that the event arrives.
 *
 * Rules this file holds to:
 *
 *  1. No React. State lives on the instance so that recording a timestamp never
 *     schedules a render — a render between "audio arrived" and "timestamp
 *     taken" would be measured as latency.
 *  2. The clock is injected. `performance.now()` in production, a scripted
 *     counter in tests, which is the only way any of this is verifiable without
 *     a live call.
 *  3. The greeting's time-to-first-audio is kept separate from per-turn
 *     latency and is never averaged into it. The greeting has no user
 *     utterance in front of it, so it measures a different thing (session setup
 *     plus generation) and mixing the two produces a number that describes
 *     neither.
 *  4. Nothing is inferred. A turn with no first-audio frame reports `null`, not
 *     a guess.
 */

export type Clock = () => number;

/** The subset of the AssemblyAI event contract this class reads. */
export interface AgentMessage {
  type?: string;
  status?: string;
  call_id?: string;
  name?: string;
  [key: string]: unknown;
}

export interface TurnMetric {
  turnIndex: number;
  /** input.speech.stopped -> first reply.audio frame. */
  responseLatencyMs: number | null;
  /** reply.started -> first reply.audio frame. */
  generationLatencyMs: number | null;
  /** True when reply.done reported status === 'interrupted'. */
  interrupted: boolean;
  /** First agent audio -> the user talking over it. */
  bargeInOffsetMs: number | null;
  toolCalls: number;
  /** tool.call -> tool.result, for the last tool of the turn. */
  toolLatencyMs: number | null;
}

export interface CallTelemetryRecord {
  callId: string;
  persona: string | null;
  companyName: string | null;
  /** Wall-clock epoch ms, for ordering rows server-side. */
  startedAt: number;
  endedAt: number | null;
  durationMs: number | null;
  endReason: string | null;
  /** Session.update sent -> first greeting audio frame. Never pooled with turns. */
  greetingTtfaMs: number | null;
  greetingBargeInOffsetMs: number | null;
  turnCount: number;
  interruptionCount: number;
  /**
   * Agent audio that belonged to neither the greeting nor an open turn. Counted
   * rather than attributed, so it cannot quietly distort a percentile.
   */
  unattributedReplies: number;
}

export interface TelemetryBatch {
  callId: string;
  record: CallTelemetryRecord;
  turns: TurnMetric[];
}

export interface CallTelemetryOptions {
  callId: string;
  clock?: Clock;
  /** Wall-clock epoch ms of call start. Injectable for deterministic tests. */
  startedAtEpoch?: number;
  persona?: string | null;
  companyName?: string | null;
  /** Emit a batch once this many completed turns are unsent. */
  flushEveryTurns?: number;
  onFlush?: (batch: TelemetryBatch) => void;
}

interface OpenTurn extends TurnMetric {
  speechStoppedAt: number | null;
  replyStartedAt: number | null;
  firstAudioAt: number | null;
  pendingTools: Map<string, number>;
}

const DEFAULT_FLUSH_EVERY_TURNS = 20;

export class CallTelemetry {
  public readonly callId: string;

  private readonly clock: Clock;
  private readonly persona: string | null;
  private readonly companyName: string | null;
  private readonly flushEveryTurns: number;
  private readonly onFlush?: (batch: TelemetryBatch) => void;

  private readonly startedAtEpoch: number;
  private readonly startedAtClock: number;

  private sessionUpdateAt: number | null = null;
  private greetingFirstAudioAt: number | null = null;
  private greetingTtfaMs: number | null = null;
  private greetingBargeInOffsetMs: number | null = null;
  private greetingDone = false;

  /** True between reply.started / first reply.audio and reply.done. */
  private replyActive = false;
  /** First audio timestamp of whichever reply is currently speaking. */
  private activeReplyFirstAudioAt: number | null = null;

  private current: OpenTurn | null = null;
  private turns: TurnMetric[] = [];
  private sentTurns = 0;
  private hasDrained = false;

  private interruptionCount = 0;
  private unattributedReplies = 0;

  private endedAtClock: number | null = null;
  private endReason: string | null = null;
  private finalized = false;

  constructor(opts: CallTelemetryOptions) {
    this.callId = opts.callId;
    this.clock = opts.clock || (() => Date.now());
    this.persona = opts.persona ?? null;
    this.companyName = opts.companyName ?? null;
    this.flushEveryTurns = opts.flushEveryTurns ?? DEFAULT_FLUSH_EVERY_TURNS;
    this.onFlush = opts.onFlush;
    this.startedAtEpoch = opts.startedAtEpoch ?? Date.now();
    this.startedAtClock = this.clock();
  }

  /**
   * Call this immediately BEFORE ws.send(sessionUpdate). It is the only honest
   * zero point for greeting TTFA: the greeting text is carried in that frame,
   * so nothing the agent says can precede it.
   */
  public markSessionUpdateSent(nowMs: number = this.clock()): void {
    if (this.sessionUpdateAt === null) this.sessionUpdateAt = nowMs;
  }

  /**
   * One call at the top of ws.onmessage, after JSON.parse.
   *
   * The caller must take `nowMs` (or let this take it) BEFORE any decoding or
   * playback work — base64 decoding a PCM frame is real milliseconds and would
   * otherwise be charged to the model.
   */
  public handleAgentMessage(msg: AgentMessage, nowMs: number = this.clock()): void {
    if (this.finalized || !msg) return;

    switch (msg.type) {
      case 'input.speech.started':
        this.onSpeechStarted(nowMs);
        return;

      case 'input.speech.stopped':
        this.onSpeechStopped(nowMs);
        return;

      case 'reply.started':
        this.onReplyStarted(nowMs);
        return;

      case 'reply.audio':
        this.onReplyAudio(nowMs);
        return;

      case 'reply.done':
        this.onReplyDone(nowMs, msg.status === 'interrupted');
        return;

      case 'tool.call':
        this.markToolCall(typeof msg.call_id === 'string' ? msg.call_id : null, nowMs);
        return;

      default:
        return;
    }
  }

  public markToolCall(toolCallId: string | null, nowMs: number = this.clock()): void {
    if (this.finalized) return;
    const turn = this.current;
    if (!turn) return;
    turn.toolCalls += 1;
    turn.pendingTools.set(toolCallId || `anon_${turn.toolCalls}`, nowMs);
  }

  public markToolResult(toolCallId: string | null, nowMs: number = this.clock()): void {
    if (this.finalized) return;
    const turn = this.current;
    if (!turn) return;
    const key = toolCallId || `anon_${turn.toolCalls}`;
    const startedAt = turn.pendingTools.get(key);
    if (startedAt === undefined) return;
    turn.pendingTools.delete(key);
    turn.toolLatencyMs = nowMs - startedAt;
  }

  // --------------------------------------------------------------------------
  // Event handling
  // --------------------------------------------------------------------------

  private onSpeechStarted(nowMs: number): void {
    // Talking over the agent is a barge-in. Only count it while the agent is
    // actually emitting audio, otherwise every normal user turn would count.
    if (!this.replyActive) return;
    this.interruptionCount += 1;

    const offset =
      this.activeReplyFirstAudioAt === null ? null : nowMs - this.activeReplyFirstAudioAt;

    if (this.current) {
      if (this.current.bargeInOffsetMs === null) this.current.bargeInOffsetMs = offset;
    } else if (this.greetingBargeInOffsetMs === null) {
      this.greetingBargeInOffsetMs = offset;
    }
  }

  private onSpeechStopped(nowMs: number): void {
    if (this.current) {
      // A second stop before the agent has answered is re-triggered VAD, not a
      // new turn. The latest silence is the real anchor, so move it rather than
      // opening a turn that will never get a reply.
      if (this.current.firstAudioAt === null && this.current.replyStartedAt === null) {
        this.current.speechStoppedAt = nowMs;
      }
      return;
    }
    this.current = {
      turnIndex: this.turns.length,
      speechStoppedAt: nowMs,
      replyStartedAt: null,
      firstAudioAt: null,
      responseLatencyMs: null,
      generationLatencyMs: null,
      interrupted: false,
      bargeInOffsetMs: null,
      toolCalls: 0,
      toolLatencyMs: null,
      pendingTools: new Map()
    };
  }

  private onReplyStarted(nowMs: number): void {
    this.replyActive = true;
    // Never create a turn here. A duplicated or out-of-order reply.started —
    // and the greeting, which has no user utterance at all — would otherwise
    // manufacture a turn with a null anchor that later pollutes the sample.
    if (this.current && this.current.replyStartedAt === null) {
      this.current.replyStartedAt = nowMs;
    }
  }

  private onReplyAudio(nowMs: number): void {
    this.replyActive = true;

    const turn = this.current;
    if (turn) {
      if (turn.firstAudioAt !== null) return;
      turn.firstAudioAt = nowMs;
      this.activeReplyFirstAudioAt = nowMs;
      if (turn.speechStoppedAt !== null) {
        turn.responseLatencyMs = nowMs - turn.speechStoppedAt;
      }
      if (turn.replyStartedAt !== null) {
        turn.generationLatencyMs = nowMs - turn.replyStartedAt;
      }
      return;
    }

    // No open turn: this is the greeting, which is measured from session.update
    // and kept out of the per-turn distribution entirely.
    if (!this.greetingDone && this.greetingFirstAudioAt === null) {
      this.greetingFirstAudioAt = nowMs;
      this.activeReplyFirstAudioAt = nowMs;
      if (this.sessionUpdateAt !== null) {
        this.greetingTtfaMs = nowMs - this.sessionUpdateAt;
      }
      return;
    }

    // Agent audio with neither a greeting slot nor an open turn in front of it.
    // Counted, never attributed.
    if (this.activeReplyFirstAudioAt === null) {
      this.activeReplyFirstAudioAt = nowMs;
      this.unattributedReplies += 1;
    }
  }

  private onReplyDone(nowMs: number, interrupted: boolean): void {
    this.replyActive = false;
    this.activeReplyFirstAudioAt = null;

    if (this.current) {
      this.current.interrupted = this.current.interrupted || interrupted;
      this.closeCurrentTurn();
      this.maybeFlush();
      return;
    }

    if (!this.greetingDone) this.greetingDone = true;
    void nowMs;
  }

  private closeCurrentTurn(): void {
    const turn = this.current;
    if (!turn) return;
    this.current = null;
    this.turns.push({
      turnIndex: turn.turnIndex,
      responseLatencyMs: turn.responseLatencyMs,
      generationLatencyMs: turn.generationLatencyMs,
      interrupted: turn.interrupted,
      bargeInOffsetMs: turn.bargeInOffsetMs,
      toolCalls: turn.toolCalls,
      toolLatencyMs: turn.toolLatencyMs
    });
  }

  // --------------------------------------------------------------------------
  // Readout
  // --------------------------------------------------------------------------

  public get turnCount(): number {
    return this.turns.length + (this.current ? 1 : 0);
  }

  public get interruptions(): number {
    return this.interruptionCount;
  }

  public get greetingTimeToFirstAudioMs(): number | null {
    return this.greetingTtfaMs;
  }

  public snapshot(): CallTelemetryRecord {
    const endedAtClock = this.endedAtClock;
    return {
      callId: this.callId,
      persona: this.persona,
      companyName: this.companyName,
      startedAt: this.startedAtEpoch,
      endedAt:
        endedAtClock === null
          ? null
          : this.startedAtEpoch + (endedAtClock - this.startedAtClock),
      durationMs: endedAtClock === null ? null : endedAtClock - this.startedAtClock,
      endReason: this.endReason,
      greetingTtfaMs: this.greetingTtfaMs,
      greetingBargeInOffsetMs: this.greetingBargeInOffsetMs,
      turnCount: this.turns.length,
      interruptionCount: this.interruptionCount,
      unattributedReplies: this.unattributedReplies
    };
  }

  /** Every turn recorded so far, closed ones only. */
  public completedTurns(): TurnMetric[] {
    return this.turns.slice();
  }

  /**
   * Hand back the turns that have not been shipped yet. Returns null when there
   * is nothing new, so a periodic flush is free when the call is idle.
   */
  public drain(): TelemetryBatch | null {
    const turns = this.turns.slice(this.sentTurns);
    // The first drain always goes, even with no turns: it registers the call
    // and its greeting TTFA. After that, silence on the wire when nothing new
    // has been measured.
    if (turns.length === 0 && this.hasDrained) return null;
    this.sentTurns = this.turns.length;
    this.hasDrained = true;
    return { callId: this.callId, record: this.snapshot(), turns };
  }

  private maybeFlush(): void {
    if (!this.onFlush) return;
    if (this.turns.length - this.sentTurns < this.flushEveryTurns) return;
    const batch = this.drain();
    if (batch) this.onFlush(batch);
  }

  /**
   * Close the call. Safe to call more than once — the end-call button, the
   * socket's onclose and the pagehide listener all race, and the first one to
   * arrive is the honest end time.
   */
  public finalize(reason: string, nowMs: number = this.clock()): TelemetryBatch {
    if (!this.finalized) {
      this.closeCurrentTurn();
      this.endedAtClock = nowMs;
      this.endReason = reason;
      this.finalized = true;
    }
    const turns = this.turns.slice(this.sentTurns);
    this.sentTurns = this.turns.length;
    return { callId: this.callId, record: this.snapshot(), turns };
  }

  public get isFinalized(): boolean {
    return this.finalized;
  }
}

export function createCallId(): string {
  const cryptoObj = typeof globalThis !== 'undefined' ? (globalThis as any).crypto : undefined;
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID();
  }
  return `call_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
