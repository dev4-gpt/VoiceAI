import { MemoryBuyerLabStore, mkPersona } from './helpers';
import { BuyerLabNotFoundError } from '../../buyerlab/store';
import type { NormalizedOutcome } from '../../buyerlab/types';

const A = 'tenant-a';
const B = 'tenant-b';
let now = 1_000_000;
const clock = () => now;
const outcome = { provider: 'native', panelSize: 0 } as unknown as NormalizedOutcome;

async function seed() {
  const store = new MemoryBuyerLabStore(clock);
  const project = await store.createProject(A, { name: 'Veloce', targetUrl: 'https://veloceos.cloud', brief: null });
  return { store, project };
}

describe('BuyerLabStore contract (memory implementation)', () => {
  beforeEach(() => {
    now = 1_000_000;
  });

  it('never shows one tenant another tenant\'s project, and answers not-found for it', async () => {
    const { store, project } = await seed();
    expect(await store.getProject(B, project.id)).toBeNull();
    expect(await store.listProjects(B)).toEqual([]);
    expect(await store.deleteProject(B, project.id)).toBe(false);
    expect(await store.listSources(B, project.id)).toEqual([]);
    expect(await store.listPersonas(B, project.id)).toEqual([]);
    await expect(store.addSources(B, project.id, [])).rejects.toBeInstanceOf(BuyerLabNotFoundError);
    await expect(store.replacePanel(B, project.id, [])).rejects.toBeInstanceOf(BuyerLabNotFoundError);
    await expect(
      store.createRun(B, { projectId: project.id, provider: 'native', config: { personaIds: [], sourceIds: [] }, callBudget: 5, fundedBy: 'byok' })
    ).rejects.toBeInstanceOf(BuyerLabNotFoundError);
    expect(await store.getProject(A, project.id)).not.toBeNull();
  });

  it('adds sources once per content hash', async () => {
    const { store, project } = await seed();
    const src = { kind: 'crawl' as const, surface: 'public' as const, label: 'Home', url: 'https://a.com/', contentHash: 'h1', text: 'x'.repeat(50), meta: {} };
    const first = await store.addSources(A, project.id, [src]);
    const again = await store.addSources(A, project.id, [src, { ...src, contentHash: 'h2' }]);
    expect(first.added).toHaveLength(1);
    expect(again.added).toHaveLength(1);
    expect(again.duplicates).toBe(1);
    expect(await store.listSources(A, project.id)).toHaveLength(2);
  });

  it('replaces the panel wholesale', async () => {
    const { store, project } = await seed();
    const p = (n: string) => {
      const { id, projectId, ...rest } = mkPersona({ spec: { ...mkPersona().spec, name: n } });
      return rest;
    };
    const one = await store.replacePanel(A, project.id, [p('One'), p('Two')]);
    const two = await store.replacePanel(A, project.id, [p('Three')]);
    expect(one).toHaveLength(2);
    expect((await store.listPersonas(A, project.id)).map((x) => x.spec.name)).toEqual(['Three']);
    expect(two[0].id).not.toBe(one[0].id);
  });

  it('accumulates calls and scopes runs by tenant', async () => {
    const { store, project } = await seed();
    const run = await store.createRun(A, { projectId: project.id, provider: 'native', config: { personaIds: ['x'], sourceIds: ['y'] }, callBudget: 5, fundedBy: 'byok' });
    expect(run.status).toBe('queued');
    expect(await store.addCalls(A, run.id, 2)).toBe(2);
    expect(await store.addCalls(A, run.id, 1)).toBe(3);
    expect(await store.getRun(B, run.id)).toBeNull();
    expect((await store.latestRun(A, project.id))!.id).toBe(run.id);
    expect(await store.latestRun(B, project.id)).toBeNull();
    await store.updateRun(A, run.id, { status: 'running', startedAt: new Date(now).toISOString() });
    expect((await store.getRun(A, run.id))!.status).toBe('running');
  });

  describe('claimStep (the double-charge guard)', () => {
    const opts = { staleAfterMs: 90_000, maxAttempts: 3 };
    async function run() {
      const { store, project } = await seed();
      const r = await store.createRun(A, { projectId: project.id, provider: 'native', config: { personaIds: [], sourceIds: [] }, callBudget: 5, fundedBy: 'byok' });
      return { store, r };
    }

    it('lets exactly one of two concurrent claimers run the step', async () => {
      const { store, r } = await run();
      const results = await Promise.all([store.claimStep(A, r.id, 'react:u1', opts), store.claimStep(A, r.id, 'react:u1', opts)]);
      expect(results.filter((x) => x.claimed)).toHaveLength(1);
    });

    it('does not reclaim a fresh running step, but reclaims a stale one with attempt + 1', async () => {
      const { store, r } = await run();
      expect(await store.claimStep(A, r.id, 'k', opts)).toEqual({ claimed: true, attempt: 1 });
      now += 60_000;
      expect((await store.claimStep(A, r.id, 'k', opts)).claimed).toBe(false);
      now += 40_000;
      expect(await store.claimStep(A, r.id, 'k', opts)).toEqual({ claimed: true, attempt: 2 });
    });

    it('reclaims a step released for retry, and gives up after maxAttempts', async () => {
      const { store, r } = await run();
      for (let attempt = 1; attempt <= 3; attempt++) {
        expect(await store.claimStep(A, r.id, 'k', opts)).toEqual({ claimed: true, attempt });
        await store.finishStep(A, r.id, 'k', 'retry', { error: 'boom' });
      }
      expect((await store.claimStep(A, r.id, 'k', opts)).claimed).toBe(false);
      expect((await store.listSteps(A, r.id)).find((s) => s.stepKey === 'k')!.status).toBe('failed');
    });

    it('never reclaims a finished step', async () => {
      const { store, r } = await run();
      await store.claimStep(A, r.id, 'k', opts);
      await store.finishStep(A, r.id, 'k', 'done', { ok: true });
      now += 1_000_000;
      expect((await store.claimStep(A, r.id, 'k', opts)).claimed).toBe(false);
      expect((await store.listSteps(A, r.id))[0]).toMatchObject({ status: 'done', output: { ok: true } });
    });
  });

  it('stores an outcome per run, scoped by tenant', async () => {
    const { store, project } = await seed();
    const r = await store.createRun(A, { projectId: project.id, provider: 'native', config: { personaIds: [], sourceIds: [] }, callBudget: 5, fundedBy: 'byok' });
    await store.saveOutcome(A, r.id, outcome);
    expect(await store.getOutcome(A, r.id)).toEqual(outcome);
    expect(await store.getOutcome(B, r.id)).toBeNull();
  });

  it('deleting a project removes its sources, personas, runs, steps and outcome', async () => {
    const { store, project } = await seed();
    await store.addSources(A, project.id, [{ kind: 'crawl', surface: 'public', label: 'x', url: null, contentHash: 'h', text: 'y'.repeat(40), meta: {} }]);
    const r = await store.createRun(A, { projectId: project.id, provider: 'native', config: { personaIds: [], sourceIds: [] }, callBudget: 5, fundedBy: 'byok' });
    await store.claimStep(A, r.id, 'k', { staleAfterMs: 1, maxAttempts: 3 });
    await store.saveOutcome(A, r.id, outcome);
    expect(await store.deleteProject(A, project.id)).toBe(true);
    expect(await store.listSources(A, project.id)).toEqual([]);
    expect(await store.getRun(A, r.id)).toBeNull();
    expect(await store.listSteps(A, r.id)).toEqual([]);
    expect(await store.getOutcome(A, r.id)).toBeNull();
  });
});
