/**
 * Voice latency summarisation.
 *
 * The one rule this file exists to enforce: a percentile is only emitted when
 * there is enough measured data behind it. Below the threshold the caller gets
 * `insufficient_data` and a sample size — never a number that looks quotable.
 * This is the project's "no unmeasured latency figure" rule expressed as code
 * rather than as a note in a doc that a slide deck can ignore.
 *
 * `percentile` and `summarizeTurns` are pure and exported so they can be tested
 * without a database.
 */

/** Below this many measured turns, no percentile is produced. */
export const MIN_SAMPLE_SIZE = 20;

/** Server-side caps on an ingest payload. */
export const MAX_TURNS_PER_CALL = 200;
export const MAX_PAYLOAD_BYTES = 256 * 1024;

export interface LatencyDistribution {
  sampleSize: number;
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  mean: number;
}

export interface InsufficientData {
  status: 'insufficient_data';
  sampleSize: number;
  requiredSampleSize: number;
}

export interface TurnSample {
  responseLatencyMs?: number | null;
  generationLatencyMs?: number | null;
  interrupted?: boolean | null;
}

export interface SummaryInput {
  turns: TurnSample[];
  /** Greeting TTFA values, one per call. Kept out of the turn distribution. */
  greetingTtfaMs?: Array<number | null | undefined>;
  callCount?: number;
  minSampleSize?: number;
}

export interface TelemetrySummarySuccess {
  status: 'success';
  sampleSize: number;
  callCount: number;
  /** input.speech.stopped -> first agent audio frame. */
  responseLatencyMs: LatencyDistribution;
  /** reply.started -> first agent audio frame. */
  generationLatencyMs: LatencyDistribution | InsufficientData;
  /**
   * Session.update -> first greeting audio. Reported as its own distribution
   * and never merged into responseLatencyMs: the greeting has no user
   * utterance in front of it, so pooling them describes neither.
   */
  greetingTtfaMs: LatencyDistribution | InsufficientData;
  interruptionRate: number;
}

export type TelemetrySummary = TelemetrySummarySuccess | InsufficientData;

function isMeasurement(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

/**
 * Nearest-rank percentile over an unsorted array of samples.
 *
 * Nearest rank rather than interpolation: an interpolated p95 reports a latency
 * that no call actually experienced, which is exactly the kind of invented
 * number this module is here to prevent. Returns null for an empty input.
 */
export function percentile(values: number[], p: number): number | null {
  const clean = values.filter(isMeasurement);
  if (clean.length === 0) return null;
  if (p <= 0) return Math.min(...clean);
  if (p >= 100) return Math.max(...clean);

  const sorted = clean.slice().sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length);
  const index = Math.min(sorted.length - 1, Math.max(0, rank - 1));
  return sorted[index];
}

function distribution(values: number[], minSampleSize: number): LatencyDistribution | InsufficientData {
  const clean = values.filter(isMeasurement);
  if (clean.length < minSampleSize) {
    return {
      status: 'insufficient_data',
      sampleSize: clean.length,
      requiredSampleSize: minSampleSize
    };
  }
  const sorted = clean.slice().sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  return {
    sampleSize: sorted.length,
    p50: percentile(sorted, 50) as number,
    p90: percentile(sorted, 90) as number,
    p95: percentile(sorted, 95) as number,
    p99: percentile(sorted, 99) as number,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean: Math.round((sum / sorted.length) * 10) / 10
  };
}

/**
 * Summarise measured turns.
 *
 * "Measured" means the turn has a real response latency — a turn where the user
 * spoke and the agent never produced audio contributes nothing, because there
 * is nothing to measure. That is why the reported sampleSize can be smaller
 * than the number of stored turns.
 */
export function summarizeTurns(input: SummaryInput): TelemetrySummary {
  const minSampleSize = input.minSampleSize ?? MIN_SAMPLE_SIZE;
  const turns = input.turns || [];

  const responseValues: number[] = [];
  const generationValues: number[] = [];
  let interrupted = 0;

  for (const turn of turns) {
    if (isMeasurement(turn.responseLatencyMs)) responseValues.push(turn.responseLatencyMs);
    if (isMeasurement(turn.generationLatencyMs)) generationValues.push(turn.generationLatencyMs);
    if (turn.interrupted) interrupted += 1;
  }

  if (responseValues.length < minSampleSize) {
    return {
      status: 'insufficient_data',
      sampleSize: responseValues.length,
      requiredSampleSize: minSampleSize
    };
  }

  const response = distribution(responseValues, minSampleSize) as LatencyDistribution;

  return {
    status: 'success',
    sampleSize: responseValues.length,
    callCount: input.callCount ?? 0,
    responseLatencyMs: response,
    generationLatencyMs: distribution(generationValues, minSampleSize),
    greetingTtfaMs: distribution(
      (input.greetingTtfaMs || []).filter(isMeasurement) as number[],
      minSampleSize
    ),
    interruptionRate: turns.length === 0 ? 0 : Math.round((interrupted / turns.length) * 1000) / 1000
  };
}

// ----------------------------------------------------------------------------
// Ingest validation
// ----------------------------------------------------------------------------

export interface ValidatedTurn {
  turnIndex: number;
  responseLatencyMs: number | null;
  generationLatencyMs: number | null;
  interrupted: boolean;
  bargeInOffsetMs: number | null;
  toolCalls: number;
  toolLatencyMs: number | null;
}

export interface ValidatedCall {
  callId: string;
  persona: string | null;
  companyName: string | null;
  startedAt: Date;
  endedAt: Date | null;
  durationMs: number | null;
  endReason: string | null;
  greetingTtfaMs: number | null;
  greetingBargeInOffsetMs: number | null;
  turnCount: number;
  interruptionCount: number;
  turns: ValidatedTurn[];
}

export type ValidationResult =
  | { ok: true; value: ValidatedCall }
  | { ok: false; status: number; code: string; error: string };

function optionalNumber(value: unknown): number | null {
  return isMeasurement(value) ? Math.round(value) : null;
}

function optionalText(value: unknown, max = 200): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function toDate(value: unknown): Date | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Validate an ingest payload. This endpoint is reachable by any embedded
 * widget, so it rejects on size before it does anything expensive and coerces
 * every field rather than trusting the client's shapes.
 */
export function validateCallPayload(body: unknown, rawBytes?: number): ValidationResult {
  if (typeof rawBytes === 'number' && rawBytes > MAX_PAYLOAD_BYTES) {
    return {
      ok: false,
      status: 413,
      code: 'PAYLOAD_TOO_LARGE',
      error: `Telemetry payload exceeds ${MAX_PAYLOAD_BYTES} bytes.`
    };
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, status: 400, code: 'INVALID_PAYLOAD', error: 'Expected a JSON object.' };
  }

  const payload = body as Record<string, unknown>;
  const callId = optionalText(payload.callId, 128);
  if (!callId) {
    return { ok: false, status: 400, code: 'INVALID_PAYLOAD', error: 'callId is required.' };
  }

  const rawTurns = Array.isArray(payload.turns) ? payload.turns : [];
  if (rawTurns.length > MAX_TURNS_PER_CALL) {
    return {
      ok: false,
      status: 400,
      code: 'TOO_MANY_TURNS',
      error: `A call may report at most ${MAX_TURNS_PER_CALL} turns per request.`
    };
  }

  const seen = new Set<number>();
  const turns: ValidatedTurn[] = [];
  for (const entry of rawTurns) {
    if (!entry || typeof entry !== 'object') continue;
    const turn = entry as Record<string, unknown>;
    const turnIndex = optionalNumber(turn.turnIndex);
    if (turnIndex === null) continue;
    // The table is unique on (call_id, turn_index); dropping duplicates here
    // keeps one bad batch from failing the whole insert.
    if (seen.has(turnIndex)) continue;
    seen.add(turnIndex);
    turns.push({
      turnIndex,
      responseLatencyMs: optionalNumber(turn.responseLatencyMs),
      generationLatencyMs: optionalNumber(turn.generationLatencyMs),
      interrupted: Boolean(turn.interrupted),
      bargeInOffsetMs: optionalNumber(turn.bargeInOffsetMs),
      toolCalls: optionalNumber(turn.toolCalls) ?? 0,
      toolLatencyMs: optionalNumber(turn.toolLatencyMs)
    });
  }

  return {
    ok: true,
    value: {
      callId,
      persona: optionalText(payload.persona, 64),
      companyName: optionalText(payload.companyName, 200),
      startedAt: toDate(payload.startedAt) ?? new Date(),
      endedAt: toDate(payload.endedAt),
      durationMs: optionalNumber(payload.durationMs),
      endReason: optionalText(payload.endReason, 64),
      greetingTtfaMs: optionalNumber(payload.greetingTtfaMs),
      greetingBargeInOffsetMs: optionalNumber(payload.greetingBargeInOffsetMs),
      turnCount: optionalNumber(payload.turnCount) ?? turns.length,
      interruptionCount: optionalNumber(payload.interruptionCount) ?? 0,
      turns
    }
  };
}
