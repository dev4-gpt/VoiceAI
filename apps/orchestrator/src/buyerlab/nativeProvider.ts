import { createHash } from 'crypto';
import { BuyerLabNotFoundError, BuyerLabStore } from './store';
import { BuyerLlm, LlmOutputError, parseJsonObject } from './llm';
import { buildOutcome, normaliseReaction, normaliseConversation } from './normaliser';
import { buildConversationClaimsPrompt, buildReactPrompt, renderSources, selectSourcesFor } from './prompts';
import { createConverseAgentLlm, runConversation, transcriptText } from './converse';
import { generateChatReply } from './chat';
import type { AgentLLM } from '../services/agentLoop';
import type { CallBudget, Claim, NormalizedOutcome, Persona, PersonaOutcome, Progress, Project, ProviderHandle, RunSpec, SimulationProvider, Source } from './types';

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
  /** BYOK key used for self-test converse's agent-side model calls. */
  apiKey?: string;
  /** Factory for the converse step's agent-side LLM. Defaults to the real DeepSeek-backed agent. */
  agentLlmFactory?: (apiKey?: string) => AgentLLM;
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
/** Generous, non-refunded reservation for one persona's converse step (buyer + agent + claims calls). */
const CONVERSE_CALL_RESERVE = 10;

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
  private readonly agentLlmFactory: (apiKey?: string) => AgentLLM;

  constructor(private readonly deps: NativeDeps) {
    this.now = deps.now ?? (() => Date.now());
    this.stepTimeoutMs = deps.stepTimeoutMs ?? 40_000;
    this.concurrency = deps.concurrency ?? 3;
    this.staleAfterMs = deps.staleAfterMs ?? 90_000;
    this.maxAttempts = deps.maxAttempts ?? 3;
    this.agentLlmFactory = deps.agentLlmFactory ?? createConverseAgentLlm;
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
    const project = await store.getProject(handle.tenantId, run.projectId);
    if (!project) throw new BuyerLabNotFoundError('project');
    const personas = (await store.listPersonas(handle.tenantId, run.projectId)).filter((p) => run.config.personaIds.includes(p.id));
    const sources = (await store.listSources(handle.tenantId, run.projectId)).filter((s) => run.config.sourceIds.includes(s.id));
    return { run, project, personas, sources };
  }

  async advance(handle: ProviderHandle, budget: CallBudget): Promise<Progress> {
    const { store } = this.deps;
    const { run, project, personas, sources } = await this.load(handle);
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
      const noSource = pending.filter((p) => selectSourcesFor(sources, p.surfaces).length === 0);
      if (callsLeft <= 0 && runnable.length > 0 && runnable.length === pending.length) {
        budgetExhausted = true;
        break;
      }

      // Take all no-source personas (cost 0), cap runnable to min(concurrency, callsLeft) to avoid claiming steps we can't afford.
      const maxRunnable = Math.min(this.concurrency - noSource.length, Math.max(callsLeft, 0));
      const batch = [...noSource, ...runnable.slice(0, maxRunnable)];
      batch.forEach((p) => attempted.add(p.id));
      const outcomes = await Promise.all(batch.map((p) => this.runStep(handle, fresh.callBudget, p, sources, budget)));
      if (outcomes.every((o) => o === 'skipped')) break; // everything left is owned by another poll
      if (outcomes.includes('budget')) {
        budgetExhausted = true;
        break;
      }
    }

    if (project.selfTest) await this.advanceConverse(handle, project, personas, budget);
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
      const applied = await store.finishStep(handle.tenantId, handle.runId, key, 'failed', { error: 'NO_SOURCES' }, claim.attempt);
      return applied ? 'failed' : 'skipped';
    }

    // Build prompt before reserving the call, so a throw here does not leak a reserved call.
    const rendered = renderSources(visible);
    const prompt = buildReactPrompt({ persona, rendered });

    // Reserve the call before making it; a lost race over the last call is refunded.
    const total = await store.addCalls(handle.tenantId, handle.runId, 1);
    if (total > callBudget) {
      await store.addCalls(handle.tenantId, handle.runId, -1);
      const applied = await store.finishStep(handle.tenantId, handle.runId, key, 'retry', { error: 'BUDGET' }, claim.attempt);
      return applied ? 'budget' : 'skipped';
    }

    let outcome: PersonaOutcome;
    let modelName: string;
    try {
      const res = await withTimeout(llm({ system: prompt.system, user: prompt.user, maxTokens: 2500 }), Math.min(this.stepTimeoutMs, Math.max(this.budgetLeftMs(budget), 1000)));
      outcome = normaliseReaction({ persona, raw: parseJsonObject(res.content), refs: rendered.refs });
      modelName = res.model;
    } catch (err) {
      // Only the error's name is recorded: never a message, which may echo model or key material.
      const name = err instanceof LlmOutputError ? 'LlmOutputError' : (err as { name?: string })?.name ?? 'Error';
      const applied = await store.finishStep(handle.tenantId, handle.runId, key, 'retry', { error: name }, claim.attempt);
      return applied ? 'retry' : 'skipped';
    }

    // finishStep('done') outside try/catch so a failed write does not turn the step into 'retry'.
    const out: StepOutput & Record<string, unknown> = { outcome, model: modelName, truncatedRefs: rendered.truncatedRefs };
    const applied = await store.finishStep(handle.tenantId, handle.runId, key, 'done', out, claim.attempt);
    return applied ? 'done' : 'skipped';
  }

  private converseStepKey(personaId: string) {
    return `converse:${personaId}`;
  }

  /** Best-effort, self-test-only enrichment. Never affects react-step accounting or run completion. */
  private async advanceConverse(handle: ProviderHandle, project: Project, personas: Persona[], budget: CallBudget): Promise<void> {
    if (this.budgetLeftMs(budget) < MIN_WINDOW_MS) return;
    const { store } = this.deps;
    const steps = new Map((await store.listSteps(handle.tenantId, handle.runId)).map((s) => [s.stepKey, s.status]));
    const ready = personas.filter((p) => {
      const react = steps.get(personaStepKey(p.id));
      const converse = steps.get(this.converseStepKey(p.id));
      return react === 'done' && converse !== 'done' && converse !== 'failed';
    });
    const batch = ready.slice(0, this.concurrency);
    await Promise.all(batch.map((p) => (this.budgetLeftMs(budget) < MIN_WINDOW_MS ? Promise.resolve() : this.runConverseStep(handle, project, p, budget))));
  }

  private async runConverseStep(handle: ProviderHandle, project: Project, persona: Persona, budget: CallBudget): Promise<void> {
    const { store, llm } = this.deps;
    const key = this.converseStepKey(persona.id);
    const claim = await store.claimStep(handle.tenantId, handle.runId, key, { staleAfterMs: this.staleAfterMs, maxAttempts: this.maxAttempts });
    if (!claim.claimed) return;

    // Reserve a generous, non-refunded block: a conversation's call count is variable (see plan Task 5).
    const fresh = await store.getRun(handle.tenantId, handle.runId);
    const total = fresh ? await store.addCalls(handle.tenantId, handle.runId, CONVERSE_CALL_RESERVE) : 0;
    if (!fresh || total > fresh.callBudget) {
      await store.finishStep(handle.tenantId, handle.runId, key, 'failed', { error: 'BUDGET' }, claim.attempt);
      return;
    }

    try {
      const agentLlm = this.agentLlmFactory(this.deps.apiKey);
      const turns = await withTimeout(runConversation(persona, llm, agentLlm), Math.min(this.stepTimeoutMs, Math.max(this.budgetLeftMs(budget), 1000)));
      if (turns.length === 0) {
        await store.finishStep(handle.tenantId, handle.runId, key, 'failed', { error: 'NO_CONVERSATION' }, claim.attempt);
        return;
      }
      const transcript = transcriptText(turns);
      const hash = createHash('sha256').update(transcript).digest('hex');
      const { added } = await store.addSources(handle.tenantId, project.id, [
        { kind: 'agent', surface: 'public', label: `Conversation with ${persona.spec.name}`, url: null, contentHash: hash, text: transcript, meta: {} }
      ]);
      const sourceId = added[0]?.id ?? hash;
      const claimsPrompt = buildConversationClaimsPrompt(persona, transcript);
      const res = await llm({ system: claimsPrompt.system, user: claimsPrompt.user, maxTokens: 1200 });
      const { claims } = normaliseConversation({ personaId: persona.id, sourceId, transcript, raw: parseJsonObject(res.content) });
      await store.finishStep(handle.tenantId, handle.runId, key, 'done', { claims }, claim.attempt);
    } catch (err) {
      // Only the error's name is recorded: never a message, which may echo model or key material.
      const name = (err as { name?: string })?.name ?? 'Error';
      await store.finishStep(handle.tenantId, handle.runId, key, 'failed', { error: name }, claim.attempt);
    }
  }

  private async progress(handle: ProviderHandle, personas: Persona[], budgetExhausted: boolean): Promise<Progress> {
    const { store } = this.deps;
    const run = await store.getRun(handle.tenantId, handle.runId);
    const steps = await store.listSteps(handle.tenantId, handle.runId);
    const status = (p: Persona) => {
      const step = steps.find((s) => s.stepKey === personaStepKey(p.id));
      if (!step) return undefined;
      // A running step is only considered running if it started recently; otherwise it is stale and we can reclaim it.
      if (step.status === 'running' && this.now() - Date.parse(step.startedAt) >= this.staleAfterMs) {
        return undefined; // Stale, will be reclaimed on next advance
      }
      return step.status;
    };
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
      if (step?.status !== 'done' || !step.output) continue;
      const stepOutput = step.output as StepOutput;
      const converseStep = steps.find((s) => s.stepKey === this.converseStepKey(p.id));
      const conversation = converseStep?.status === 'done' && converseStep.output ? (converseStep.output as { claims: Claim[] }).claims : [];
      done.push({ outcome: { ...stepOutput.outcome, conversation }, model: stepOutput.model });
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

  async chat(handle: ProviderHandle, personaId: string, message: string): Promise<string> {
    const { store, llm } = this.deps;
    const { run, personas, sources } = await this.load(handle);
    const persona = personas.find((p) => p.id === personaId);
    if (!persona) throw new BuyerLabNotFoundError('persona');
    await store.appendChatTurn(handle.tenantId, run.id, personaId, { role: 'user', text: message });
    const history = await store.listChatTurns(handle.tenantId, run.id, personaId);
    const replyText = await generateChatReply(persona, sources, history, message, llm);
    await store.appendChatTurn(handle.tenantId, run.id, personaId, { role: 'persona', text: replyText });
    return replyText;
  }
}
