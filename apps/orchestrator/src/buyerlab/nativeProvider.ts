import { BuyerLabNotFoundError, BuyerLabStore } from './store';
import { BuyerLlm, LlmOutputError, parseJsonObject } from './llm';
import { buildOutcome, normaliseReaction } from './normaliser';
import { buildReactPrompt, renderSources, selectSourcesFor } from './prompts';
import type { CallBudget, NormalizedOutcome, Persona, PersonaOutcome, Progress, ProviderHandle, RunSpec, SimulationProvider, Source } from './types';

export interface NativeDeps {
  store: BuyerLabStore;
  llm: BuyerLlm;
  now?: () => number;
  /** Per model call. Kept under the ~45 s advance budget. */
  stepTimeoutMs?: number;
  /** Personas reacted to in parallel. */
  concurrency?: number;
  /** A `running` step older than this is treated as crashed and taken over. */
  staleAfterMs?: number;
  maxAttempts?: number;
}

export class OutcomeNotReadyError extends Error {
  constructor() {
    super('The run has no completed steps yet.');
    this.name = 'OutcomeNotReadyError';
  }
}
export class NotBuiltError extends Error {
  constructor(what: string) {
    super(`${what} is not built yet.`);
    this.name = 'NotBuiltError';
  }
}
class StepTimeoutError extends Error {
  constructor() {
    super('The model call timed out.');
    this.name = 'StepTimeoutError';
  }
}

export const personaStepKey = (personaId: string) => `react:${personaId}`;
/** Do not start a model call with less than this left before the deadline. */
const MIN_WINDOW_MS = 12_000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new StepTimeoutError()), ms);
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(timer));
}

interface StepOutput {
  outcome: PersonaOutcome;
  model: string;
}

export class NativeProvider implements SimulationProvider {
  readonly id = 'native' as const;
  private readonly now: () => number;
  private readonly stepTimeoutMs: number;
  private readonly concurrency: number;
  private readonly staleAfterMs: number;
  private readonly maxAttempts: number;

  constructor(private readonly deps: NativeDeps) {
    this.now = deps.now ?? (() => Date.now());
    this.stepTimeoutMs = deps.stepTimeoutMs ?? 40_000;
    this.concurrency = deps.concurrency ?? 3;
    this.staleAfterMs = deps.staleAfterMs ?? 90_000;
    this.maxAttempts = deps.maxAttempts ?? 3;
  }

  async start(run: RunSpec): Promise<ProviderHandle> {
    const { store } = this.deps;
    const personas = await store.listPersonas(run.tenantId, run.projectId);
    const sources = await store.listSources(run.tenantId, run.projectId);
    const unknownPersona = run.personaIds.length === 0 || run.personaIds.some((id) => !personas.some((p) => p.id === id));
    const unknownSource = run.sourceIds.length === 0 || run.sourceIds.some((id) => !sources.some((s) => s.id === id));
    if (unknownPersona) throw new BuyerLabNotFoundError('persona');
    if (unknownSource) throw new BuyerLabNotFoundError('source');
    return { runId: run.runId, tenantId: run.tenantId };
  }

  private async load(handle: ProviderHandle) {
    const { store } = this.deps;
    const run = await store.getRun(handle.tenantId, handle.runId);
    if (!run) throw new BuyerLabNotFoundError('run');
    const personas = (await store.listPersonas(handle.tenantId, run.projectId)).filter((p) => run.config.personaIds.includes(p.id));
    const sources = (await store.listSources(handle.tenantId, run.projectId)).filter((s) => run.config.sourceIds.includes(s.id));
    return { run, personas, sources };
  }

  async advance(handle: ProviderHandle, budget: CallBudget): Promise<Progress> {
    const { store } = this.deps;
    const { run, personas, sources } = await this.load(handle);
    const attempted = new Set<string>();
    let budgetExhausted = false;

    while (this.budgetLeftMs(budget) >= MIN_WINDOW_MS) {
      const fresh = await store.getRun(handle.tenantId, handle.runId);
      if (!fresh) throw new BuyerLabNotFoundError('run');
      const steps = new Map((await store.listSteps(handle.tenantId, handle.runId)).map((s) => [s.stepKey, s.status]));
      const pending = personas.filter((p) => {
        const st = steps.get(personaStepKey(p.id));
        return st !== 'done' && st !== 'failed' && !attempted.has(p.id);
      });
      if (pending.length === 0) break;

      const callsLeft = fresh.callBudget - fresh.callsUsed;
      // A persona with no visible sources costs no call, so it is handled even at zero budget.
      const runnable = pending.filter((p) => selectSourcesFor(sources, p.surfaces).length > 0);
      if (callsLeft <= 0 && runnable.length > 0 && runnable.length === pending.length) {
        budgetExhausted = true;
        break;
      }

      const batch = pending.slice(0, Math.max(this.concurrency, 1));
      batch.forEach((p) => attempted.add(p.id));
      const outcomes = await Promise.all(batch.map((p) => this.runStep(handle, fresh.callBudget, p, sources, budget)));
      if (outcomes.every((o) => o === 'skipped')) break; // everything left is owned by another poll
      if (outcomes.includes('budget')) {
        budgetExhausted = true;
        break;
      }
    }

    return this.progress(handle, personas, budgetExhausted);
  }

  private budgetLeftMs(budget: CallBudget) {
    return budget.deadlineAt - this.now();
  }

  private async runStep(handle: ProviderHandle, callBudget: number, persona: Persona, sources: Source[], budget: CallBudget): Promise<'done' | 'retry' | 'failed' | 'skipped' | 'budget'> {
    const { store, llm } = this.deps;
    const key = personaStepKey(persona.id);
    const claim = await store.claimStep(handle.tenantId, handle.runId, key, { staleAfterMs: this.staleAfterMs, maxAttempts: this.maxAttempts });
    if (!claim.claimed) return 'skipped';

    const visible = selectSourcesFor(sources, persona.surfaces);
    if (visible.length === 0) {
      await store.finishStep(handle.tenantId, handle.runId, key, 'failed', { error: 'NO_SOURCES' });
      return 'failed';
    }

    // Reserve the call before making it; a lost race over the last call is refunded.
    const total = await store.addCalls(handle.tenantId, handle.runId, 1);
    if (total > callBudget) {
      await store.addCalls(handle.tenantId, handle.runId, -1);
      await store.finishStep(handle.tenantId, handle.runId, key, 'retry', { error: 'BUDGET' });
      return 'budget';
    }

    const rendered = renderSources(visible);
    const prompt = buildReactPrompt({ persona, rendered });
    try {
      const res = await withTimeout(llm({ system: prompt.system, user: prompt.user, maxTokens: 2500 }), Math.min(this.stepTimeoutMs, Math.max(this.budgetLeftMs(budget), 1000)));
      const outcome = normaliseReaction({ persona, raw: parseJsonObject(res.content), refs: rendered.refs });
      const out: StepOutput & Record<string, unknown> = { outcome, model: res.model, promptTokens: res.promptTokens, completionTokens: res.completionTokens, truncatedRefs: rendered.truncatedRefs };
      await store.finishStep(handle.tenantId, handle.runId, key, 'done', out);
      return 'done';
    } catch (err) {
      // Only the error's name is recorded: never a message, which may echo model or key material.
      const name = err instanceof LlmOutputError ? 'LlmOutputError' : (err as { name?: string })?.name ?? 'Error';
      await store.finishStep(handle.tenantId, handle.runId, key, 'retry', { error: name });
      return 'retry';
    }
  }

  private async progress(handle: ProviderHandle, personas: Persona[], budgetExhausted: boolean): Promise<Progress> {
    const { store } = this.deps;
    const run = await store.getRun(handle.tenantId, handle.runId);
    const steps = await store.listSteps(handle.tenantId, handle.runId);
    const status = (p: Persona) => steps.find((s) => s.stepKey === personaStepKey(p.id))?.status;
    const completedSteps = personas.filter((p) => status(p) === 'done').length;
    const failedSteps = personas.filter((p) => status(p) === 'failed').length;
    const running = personas.some((p) => status(p) === 'running');
    const finished = completedSteps + failedSteps === personas.length;
    return {
      done: finished || (budgetExhausted && !running),
      completedSteps,
      failedSteps,
      totalSteps: personas.length,
      callsUsed: run?.callsUsed ?? 0,
      budgetExhausted
    };
  }

  async outcome(handle: ProviderHandle): Promise<NormalizedOutcome> {
    const { store } = this.deps;
    const { run, personas, sources } = await this.load(handle);
    const steps = await store.listSteps(handle.tenantId, handle.runId);
    const done: Array<{ outcome: PersonaOutcome; model: string }> = [];
    for (const p of personas) {
      const step = steps.find((s) => s.stepKey === personaStepKey(p.id));
      if (step?.status === 'done' && step.output) done.push(step.output as StepOutput);
    }
    if (done.length === 0) throw new OutcomeNotReadyError();
    const seen = new Set(personas.flatMap((p) => selectSourcesFor(sources, p.surfaces).map((s) => s.id)));
    return buildOutcome({
      provider: 'native',
      model: done[0].model,
      personas: done.map((d) => d.outcome),
      expectedPersonaIds: personas.map((p) => p.id),
      sources: sources.filter((s) => seen.has(s.id)),
      callsUsed: run.callsUsed
    });
  }

  async chat(_handle: ProviderHandle, _personaId: string, _message: string): Promise<string> {
    throw new NotBuiltError('Persona chat');
  }
}
