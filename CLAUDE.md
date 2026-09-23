# 🤖 CLAUDE.md — OmniVox Project Guidelines & Context

Welcome, Claude! This file provides the essential context, commands, architecture, and coding guidelines for working with **OmniVox**.

---

## 🌟 What This Project Is

**OmniVox** is an autonomous, voice-first growth operating system built for founders, creators, agencies, and enterprise operators. Powered by **AssemblyAI's Voice Agent API**, it:
1. **Captures and qualifies inbound buyers 24/7** in the browser, with the agent creating and qualifying CRM leads through registered tool calls. (Time-to-first-audio is not yet measured — do not quote a latency figure.)
2. **Acts as Anna, Senior Growth Operating Architect at GrowthOS** (an elite revenue systems consultancy advising clients—not an internal employee claiming credit).
3. **Renders an interactive 3D WebGL Glassy Voice Reactor** rendered on the GPU, defaulting to **The Cymatic Plane (Liquid & Organic)**.
4. **Isolates direct user credentials per client in the cloud/vault layer** for Twitter/X, LinkedIn, Substack, YouTube, and Cloud Storage.
5. **Executes an autonomous thought leadership pipeline (`Research ➔ Voice ➔ Create ➔ Publish`)** that turns sales conversations into syndicated Twitter threads, LinkedIn authority posts, and Substack newsletters.
6. **Persists everything into a local-first Obsidian Markdown Second-Brain (`vault/`)**.

---

## ⚠️ Current Implementation Status (read before integrating a real business)

Some capabilities are real only when the relevant API key/flag is configured; without it, the code falls back to a clearly-labeled simulation. Don't assume "autonomous" or "live" language elsewhere in this doc means every call hits a real third-party API — check this table first:

**Live deployment:** https://growthvoice-os.vercel.app (frontend + API as one Vercel project; Neon Postgres; Stripe in **test mode**).

| Capability | Real when... | Otherwise... |
| :--- | :--- | :--- |
| Voice (AssemblyAI) | `ASSEMBLYAI_API_KEY` set | `POST /api/voice/token` returns **503 `VOICE_UNCONFIGURED`** and the UI refuses to start a call. It never fakes a session. |
| Voice agent tool calls | Always, when voice is live | Tools are registered in `session.update` and executed over HTTP (`/api/crm/tools/execute`); results return as `tool.result`. Verified against the live API: 7/7 tools register. |
| `embed.js` widget | `ASSEMBLYAI_API_KEY` set | Real mic → token → AssemblyAI WebSocket → audio playback, registering the same 7 tools as the console and executing `tool.call` over HTTP. Widget origins are scoped by `WIDGET_ALLOWED_ORIGINS`; token minting is rate-limited per IP. |
| US AI disclosure & consent | Always | Disclosure prepended to the greeting; explicit opt-in in the 13 all-party-consent states; strictest policy when location is unknown. Consent records are append-only and persisted before the call starts. **Engineering implementation, not legal advice.** |
| Anna chat / content synthesis (DeepSeek) | `DEEPSEEK_API_KEY` set | An honest placeholder flagged `isFallback: true` — no invented metrics, testimonials, or claimed model reasoning. Callers must check the flag before publishing. |
| Persistence (leads, members, subscriptions, consent, credentials) | `DATABASE_URL` set | In-memory only, and the app logs that it will forget on restart. With a database: write-through cache over Postgres, hydrated on boot, writes awaited before each response. |
| Third-party credentials at rest | `DATABASE_URL` **and** `MASTER_KEY` set | Encrypted AES-256-GCM with per-row data keys. Without `MASTER_KEY` the app **refuses to persist** rather than store plaintext. `vault/.../Credentials.json` holds **masked** values only. |
| Credential "verify" button | **Never tests the key** | Returns `verified: false` and says so. Real per-platform checks (e.g. X `GET /2/users/me`) are not implemented; the first real publish surfaces a bad key. |
| Billing / checkout | `STRIPE_SECRET_KEY` set | Real Stripe Checkout Session (subscription mode). **503 `BILLING_UNCONFIGURED`** otherwise. A plan activates **only** via the signature-verified webhook `POST /api/billing/webhook`; `past_due`/`canceled`/`unpaid` grant zero minutes. Currently test keys — no real money. |
| Twitter/X, LinkedIn publish | `ENABLE_REAL_PUBLISHING=true` **and** complete OAuth credentials | A simulated receipt (`isSimulated: true`). `isSimulated` is true unless a real call **succeeded** — a failed real attempt is also `true`. |
| YouTube publish | Not supported — needs OAuth2 consent + refresh tokens | Always an honestly-labeled `stub_unsupported` receipt |
| Substack publish | `webhookUrl` configured | Real webhook `fetch()`; failure reported as `status: 'failed'` |
| Usage metering | Console calls, when `DATABASE_URL` is set and `CALL_TOKEN_SECRET` (or `MASTER_KEY`) can sign the call token | Enforced at **mint time only**: audio goes browser to AssemblyAI directly, so there is no mid-call cutoff. An exhausted allowance returns **402 `MINUTES_EXHAUSTED`** and the session is capped through `max_session_duration_seconds`. Billed seconds are the client's report clamped to the signed token's lifetime. Metering fails **open** if the datastore or secret is unavailable, and anonymous console calls are non-billable. **Embedded-widget calls are not instrumented** and are unattributed. **There are no free credits for clients.** A signed-in workspace uses its own AssemblyAI key (billed to them directly, so it skips our minutes gate), or the owner grants it the server's keys with `organizations.server_key_access` (default false, fails closed), or it needs a paid subscription; otherwise it gets 402. `FREE_TRIAL_MINUTES` is supported but deliberately unset. Anonymous demo sessions stay open for judges but are capped at five minutes (`ANON_MAX_SESSION_SECONDS`). |
| Sign-in and private workspaces | `NEON_AUTH_BASE_URL` (orchestrator) and `VITE_NEON_AUTH_URL` (web build) set | Sign-in button hidden; `/api/me/*` returns 503 `AUTH_UNCONFIGURED`. Any Google account gets its own workspace; users never see each other. |
| BYOK keys (DeepSeek, AssemblyAI, LinkedIn, X, dev.to) | Signed in, and `DATABASE_URL` + `MASTER_KEY` set | 503 `KEY_STORAGE_UNCONFIGURED`. Stored encrypted per workspace, shown as last-4 only. A signed-in caller's own AssemblyAI and DeepSeek keys **are** used for voice token minting and chat (`token.ts:25-37`, shipped in `777adbe`); LinkedIn/X/dev.to keys are stored but not yet used. Signed-in workspaces are excluded from the legacy company-name credential store. |
| Key "Test" button | DeepSeek, AssemblyAI, dev.to, LinkedIn: free read-only call | X is never called (paid API reads) and says so. |
| Owner-only demo routes (content trigger/audit/dispatch/jobs approve/reject/publish/auto-pipeline, compliance log, all Instatic routes, billing usage/record-call) | `ORCHESTRATOR_API_KEY` set | Local dev: open. **Production: 503 `ADMIN_UNCONFIGURED`.** The voice agent's CRM tools, the CRM board and checkout stay open without the key, as before. |
| RAG engine | **Never** | 4 hardcoded documents with substring keyword scoring. No embeddings. |
| Calendar booking | **Never** | Writes a confirmation code into the lead record. No calendar integration. |
| Latency / eval metrics | Latency: once real calls are recorded. Evals: once a run is recorded | **Latency** is measured client-side (caller's voice ends to the agent's first audio). `GET /api/telemetry/summary` returns `insufficient_data` below 20 measured turns, and no calls are recorded yet, so **no latency figure may be quoted**. `postEndpointLatencyMs` alone (about 8 ms in a real capture) is not the user's latency and must never be quoted. **Evals** run the real agent loop and tools with deterministic graders. `/api/evals/report` returns `no_data` until a run exists, and `mode: 'offline'` runs (a stub LLM replaying fixtures) check the harness only and are not a model measurement. No measured run is recorded yet. |
| Buyer Lab (simulated buyer panels) | Signed in, `DATABASE_URL` set, and the workspace has its own DeepSeek key or the owner's `server_key_access` grant | **402 `KEY_REQUIRED`**; there are no free credits. Personas are LLM-simulated, so the output is **hypotheses, not measurements**: every claim must carry a verbatim quote found in the material that persona was shown (claims without one are dropped and counted) and no probability, conversion or revenue figure is ever produced. Native engine only; the MiroFish engine answers 501 until sub-project 3. A page that renders in the browser has no server-readable text, and a signed-in app cannot be crawled, so its text is pasted and tagged `public` or `signed_in`. Real-model check on 2026-09-21 (`veloceos.cloud`, public site only): 6 personas, 45 claims kept and 3 dropped (94% verifiable), injected-page intent delta 0.0 (k=3), 6 model calls at a few cents. Converse (a live exchange with the agent) runs automatically only for a project flagged self-test (OmniVox's own Anna — the only agent this codebase can call directly), over a fresh in-memory CRM per conversation, never the real CRM. For every other project, converse is a manual, assisted-research step: paste the transcript in like any other signed-in text. The report cites claim ids only, resolved and dropped before it is stored — never free text presented as evidence. Chat and re-test are real, tenant-scoped and no-free-credits like everything else. |
| Live dashboard updates | Local / Docker only | The `/ws/telemetry` socket cannot open on Vercel. The dashboard loads over HTTP instead, so this costs freshness, not content. |

Every publish receipt includes `isSimulated: boolean` — check it at runtime; don't infer it from response shape.

---

## 🏗️ Repository Architecture

* `apps/web/`: React 18, Vite, Tailwind CSS, Lucide icons.
  * Entry: `apps/web/src/App.tsx`
  * 3D Shader Visualizer: `apps/web/src/components/NeuralAudioOrb.tsx` (6 SDF styles: Cymatic Plane default, Frosted Prism, Glass Gyroscope, Monolith Lightbox, Neural Ribbon, Liquid Droplet)
  * Keys panel (BYOK) and account menu: `apps/web/src/components/KeysPanel.tsx`, `apps/web/src/components/AccountMenu.tsx`
  * Content Studio & Pipeline: `apps/web/src/components/ContentFactoryStudio.tsx`
  * Transcript HUD: `apps/web/src/components/LiveTranscriptHUD.tsx`
* `apps/orchestrator/`: Node.js, Express, WebSocket (`ws`), Redis 7, DeepSeek LLM.
  * Entry: `apps/orchestrator/src/index.ts`
  * Voice Token & Anna Persona: `apps/orchestrator/src/routes/token.ts`
  * Brand Voice Service: `apps/orchestrator/src/services/brandVoiceService.ts`
  * Per-user routes (profile, BYOK keys): `apps/orchestrator/src/routes/me.ts`
  * Social Publishing Service: `apps/orchestrator/src/services/socialPublishingService.ts`
  * Content & Pipeline Routes: `apps/orchestrator/src/routes/content.ts`
* `packages/shared/`: TypeScript interfaces and data contracts.
  * `packages/shared/src/types.ts`
* `vault/`: Obsidian vault containing markdown dossiers, brand voices, credentials, and social feeds:
  * `vault/Clients/<Client_Name>/BrandVoice.md`
  * `vault/Clients/<Client_Name>/Credentials.json` & `ConnectedPlatforms.md`
  * `vault/Clients/<Client_Name>/SocialFeed.md`
  * `vault/Clients/<Client_Name>/Dossier.md`

---

## ⚡ Quickstart Commands

```bash
# Start all containers in background
docker compose up -d --build

# View container status
docker compose ps

# View live orchestrator logs
docker compose logs -f orchestrator

# View live web console logs
docker compose logs -f web

# Stop containers
docker compose down
```

* **Web Console:** [`http://localhost:3000`](http://localhost:3000)
* **Orchestrator API:** `http://localhost:4000`
* **Redis Cache:** `localhost:6379`

---

## 🎯 How to Integrate a User's Business

When the user asks you to plug their business into OmniVox:

### 1. Add Brand Voice & Value Proposition
Create or edit `vault/Clients/<Company_Name>/BrandVoice.md`:
* Set `Company Name`, `Tone Archetype` (`Enterprise Advisor`, `Tactical Operator`, `Empathetic Mentor`, or `Visionary Founder`).
* Set `Core Value Proposition`, `Target Audience`, and `Signature Lexicon`.

### 2. Configure Cloud Social Credentials
Sign in to the console with Google and open **Keys**. Keys are saved to your private workspace through `PUT /api/me/credentials/:platform` with a signed-in session token; there is no company-name credentials route any more.

### 3. Run Autonomous Research-Talk-Publish Loop
```bash
curl -X POST http://localhost:4000/api/content/auto-pipeline \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "<Company_Name>",
    "transcriptExcerpt": "Core discussion topic or voice transcript",
    "platforms": ["twitter", "linkedin", "substack"]
  }'
```

---

## 🛡️ Critical Operational Rules

1. **Anna's Persona Integrity**:
   * Never claim Anna is an internal employee of the client company (e.g. avoid "At Veloce we are all about...", "we built this").
   * Anna represents **GrowthOS**, advising the client as a high-conviction revenue operating system and management consultancy.
   * Avoid hollow cheerleading ("I love that mindset!"). Emphasize unit economics, CAC, funnel leakage, and deterministic agent loops.
2. **Client Credential Isolation**:
   * Never mix keys across different clients. Each client's secrets are stored **encrypted** in Postgres (`platform_credentials`, one row per tenant and platform) and are masked in the UI.
   * `vault/Clients/<Client_Name>/Credentials.json` is a **masked** Obsidian summary, never a source of secrets. Do not write real tokens there, and never commit it (it is gitignored).
   * Never log, print, or paste a decrypted secret. Losing or changing `MASTER_KEY` makes every stored credential unreadable.
3. **Docker Rebuild**:
   * Because the app runs in Docker, after modifying code in `apps/web/` or `apps/orchestrator/`, rebuild the containers with `docker compose build && docker compose up -d`.
