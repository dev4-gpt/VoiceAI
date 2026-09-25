// scripts/buyerlab-selftest-check.ts
/**
 * Real-model check for Buyer Lab sub-project 2: creates a self-test project (StratosGTM
 * itself), runs the panel including the converse stage, generates a report, asks one chat
 * question, and re-tests. Prints what happened at every stage. Spends the SERVER's DeepSeek key
 * (cents). Writes then deletes a project. Run only with the owner's yes.
 *
 *   npx ts-node --transpile-only scripts/buyerlab-selftest-check.ts [--keep]
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });
import { eq } from 'drizzle-orm';
import { getDb } from '../apps/orchestrator/src/db/client';
import { organizations } from '../apps/orchestrator/src/db/schema';
import { drizzleBuyerLabStore as store } from '../apps/orchestrator/src/db/repository/buyerlab';
import { createBuyerLlm } from '../apps/orchestrator/src/buyerlab/llm';
import { inferPanel } from '../apps/orchestrator/src/buyerlab/panel';
import { NativeProvider } from '../apps/orchestrator/src/buyerlab/nativeProvider';
import { advanceRun, startRun, retestRun } from '../apps/orchestrator/src/buyerlab/runner';
import { generateReport } from '../apps/orchestrator/src/buyerlab/report';

async function main() {
  if (!process.env.DEEPSEEK_API_KEY) throw new Error('DEEPSEEK_API_KEY is not set.');
  const [ws] = await getDb().select({ id: organizations.id, name: organizations.name }).from(organizations).where(eq(organizations.serverKeyAccess, true)).limit(1);
  if (!ws) throw new Error('No workspace has server_key_access. Grant one first.');
  const tenantId = ws.id;
  console.log(`Workspace "${ws.name}" (server-key grant). Spending the server DeepSeek key.`);

  const project = await store.createProject(tenantId, { name: 'Buyer Lab self-test check', targetUrl: null, brief: 'StratosGTM, an autonomous voice-first growth operating system.', selfTest: true });
  try {
    await store.addSources(tenantId, project.id, [
      { kind: 'brief', surface: 'public', label: 'Product summary', url: null, contentHash: 'selftest-brief', text: 'StratosGTM is an autonomous voice-first growth operating system built for founders and agencies, powered by AssemblyAI voice agents and DeepSeek text models. It qualifies leads, books consultations and handles retention over voice, with US AI-disclosure and 13-state all-party consent built in.', meta: {} }
    ]);
    const llm = createBuyerLlm(undefined);
    const stored = await store.listSources(tenantId, project.id);
    const inferred = await inferPanel({ project, sources: stored, size: 5, llm });
    const personas = await store.replacePanel(tenantId, project.id, inferred.personas);
    console.log(`Panel: ${personas.map((p) => p.archetype).join(', ')}`);

    const deps = { store, provider: () => new NativeProvider({ store, llm, apiKey: undefined }) };
    const run = await startRun(deps, { tenantId, projectId: project.id, provider: 'native', fundedBy: 'server_grant' });
    let state = await advanceRun(deps, tenantId, run.id);
    while (state.run.status === 'queued' || state.run.status === 'running') {
      console.log(`  ${state.run.status} ${state.progress?.completedSteps ?? 0}/${state.progress?.totalSteps ?? '?'}`);
      state = await advanceRun(deps, tenantId, run.id);
    }
    const outcome = await store.getOutcome(tenantId, run.id);
    if (!outcome) throw new Error(`Run ended ${state.run.status} with no outcome.`);
    console.log(`\nMEASURED: status ${state.run.status}, ${outcome.personas.length} personas, ${outcome.callsUsed} calls`);
    for (const p of outcome.personas) console.log(`  ${p.archetype.padEnd(20)} intent ${p.intent.score}/10, ${p.claims.length} claims, ${p.conversation.length} conversation claims`);

    const { report } = await generateReport(outcome, llm);
    console.log(`\nREPORT: "${report.headline}" — ${report.findings.length} findings, ${report.recommendations.length} recommendations`);

    const firstPersona = personas[0];
    const provider = new NativeProvider({ store, llm, apiKey: undefined });
    const chatReply = await provider.chat({ runId: run.id, tenantId }, firstPersona.id, 'What made you hesitate?');
    console.log(`\nCHAT (${firstPersona.spec.name}): "${chatReply}"`);

    const retest = await retestRun(deps, { tenantId, projectId: project.id, baseRunId: run.id, provider: 'native', fundedBy: 'server_grant' });
    let retestState = await advanceRun(deps, tenantId, retest.id);
    while (retestState.run.status === 'queued' || retestState.run.status === 'running') retestState = await advanceRun(deps, tenantId, retest.id);
    const retestOutcome = await store.getOutcome(tenantId, retest.id);
    console.log(`\nRETEST: status ${retestState.run.status}${retestOutcome ? `, ${retestOutcome.personas.length} personas` : ''}`);
  } finally {
    if (!process.argv.includes('--keep')) {
      await store.deleteProject(tenantId, project.id);
      console.log('\nProject deleted.');
    }
  }
}

main().catch((e) => {
  console.error('Check failed:', (e as Error).name, (e as { cause?: { code?: string } })?.cause?.code ?? '');
  process.exit(1);
});
