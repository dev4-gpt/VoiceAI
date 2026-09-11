/**
 * Vercel serverless entry for the orchestrator.
 *
 * Lives at the repo root because both apps depend on the `@voice-os/shared`
 * workspace package, so the deploy must upload the whole monorepo — a deploy
 * scoped to apps/orchestrator cannot resolve it.
 *
 * Frontend and API ship as one project, so the browser calls the API
 * same-origin and no CORS or VITE_ORCHESTRATOR_URL wiring is needed.
 *
 * apps/orchestrator/src/index.ts skips server.listen() when VERCEL is set and
 * exports the Express app instead, so the same source runs here, under Docker,
 * and locally. The /ws/telemetry socket does not survive a serverless boundary;
 * that only costs live dashboard updates, because voice tool calls complete over
 * HTTP and browser audio goes straight to AssemblyAI.
 */
export { default } from '../apps/orchestrator/src/index';
