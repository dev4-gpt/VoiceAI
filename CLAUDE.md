# 🤖 CLAUDE.md — GrowthVoice OS Project Guidelines & Context

Welcome, Claude! This file provides the essential context, commands, architecture, and coding guidelines for working with **GrowthVoice OS**.

---

## 🌟 What This Project Is

**GrowthVoice OS** is an autonomous, voice-first growth operating system built for founders, creators, agencies, and enterprise operators. Powered by **AssemblyAI's Voice Agent API (`universal-3-5-pro`)**, it:
1. **Captures and qualifies inbound buyers 24/7** with under 400ms time-to-first-audio.
2. **Acts as Anna, Senior Growth Operating Architect at GrowthOS** (an elite revenue systems consultancy advising clients—not an internal employee claiming credit).
3. **Renders an interactive 3D WebGL Glassy Voice Reactor** running at 60 FPS on the GPU, defaulting to **The Cymatic Plane (Liquid & Organic)**.
4. **Isolates direct user credentials per client in the cloud/vault layer** for Twitter/X, LinkedIn, Substack, YouTube, and Cloud Storage.
5. **Executes an autonomous thought leadership pipeline (`Research ➔ Voice ➔ Create ➔ Publish`)** that turns sales conversations into syndicated Twitter threads, LinkedIn authority posts, and Substack newsletters.
6. **Persists everything into a local-first Obsidian Markdown Second-Brain (`vault/`)**.

---

## ⚠️ Current Implementation Status (read before integrating a real business)

Some capabilities are real only when the relevant API key/flag is configured; without it, the code falls back to a clearly-labeled simulation. Don't assume "autonomous" or "live" language elsewhere in this doc means every call hits a real third-party API — check this table first:

| Capability | Real when... | Falls back to... |
| :--- | :--- | :--- |
| Voice (AssemblyAI) | `ASSEMBLYAI_API_KEY` set | A `demo_token_...` mock session token |
| Anna chat / content synthesis (DeepSeek) | `DEEPSEEK_API_KEY` set | A canned, hardcoded response (`deepseekService.generateFallback`) |
| Twitter/X, LinkedIn publish | `ENABLE_REAL_PUBLISHING=true` **and** complete OAuth credentials stored for that client | A simulated receipt (`isSimulated: true`) with a fabricated post ID/URL — no real post is made |
| YouTube publish | Not supported yet — the stored credential shape (a bare API key) can't authenticate a publish call; real publishing needs OAuth2 user consent + refresh tokens, which isn't implemented | Always a simulated, honestly-labeled `stub_unsupported` receipt |
| Substack publish | `webhookUrl` configured | A real webhook `fetch()` is attempted; failure is reported as `status: 'failed'`, not silently swallowed |
| `/api/evals/*` | N/A | Always returns static demo numbers (`mode: 'static_demo'`) — not a real evaluator |
| Billing / checkout | **Never — no Stripe integration exists yet** | `simulateCheckout()` returns a fabricated `cs_`-prefixed session id and a `checkout.growthvoice.os` URL, then self-activates the plan. **No money moves and no payment provider is contacted.** |
| `embed.js` widget | **Never — not yet wired to audio** | A scripted preview: no `getUserMedia`, no WebSocket, no AssemblyAI call. Plays two hardcoded lines on a timer. Labeled as a scripted demo in its own UI. |
| Usage metering | **Never for real calls** | `recordCallUsage` is only reachable via `POST /api/billing/record-call`. Live AssemblyAI sessions do not meter. Dashboard usage figures come from `seedDefaultUsage()`. |
| CRM / leads / billing state | **Never — no database** | All state is in-memory `Map`s seeded at boot. Nothing survives a restart; `clientCredentialsService` writes `Credentials.json` but never reads it back. |
| RAG engine | **Never** | 4 hardcoded documents with substring keyword scoring. No embeddings, no vector store. |
| Calendar booking | **Never** | Writes a confirmation code into the in-memory lead record. No Google Calendar or Cal.com integration. |
| Latency / eval metrics | **Never** | Every TTFA, p50/p95, and eval score in the UI is a hardcoded constant. Nothing is measured at runtime yet. |
| Voice agent tool calls | **Never — tools are not registered** | `VOICE_AGENT_TOOLS` is exposed over HTTP and logged at startup, but is **not** sent in `session.update`, so `tool.call` cannot fire. A live voice call creates no lead and books nothing. Fixed in Track B. |

Every publish receipt includes `isSimulated: boolean` so you can check at runtime whether a given post was real or simulated — don't infer it from response shape alone.

---

## 🏗️ Repository Architecture

* `apps/web/`: React 18, Vite, Tailwind CSS, Lucide icons.
  * Entry: `apps/web/src/App.tsx`
  * 3D Shader Visualizer: `apps/web/src/components/NeuralAudioOrb.tsx` (6 SDF styles: Cymatic Plane default, Frosted Prism, Glass Gyroscope, Monolith Lightbox, Neural Ribbon, Liquid Droplet)
  * Client Credentials Modal: `apps/web/src/components/ClientCredentialsModal.tsx`
  * Content Studio & Pipeline: `apps/web/src/components/ContentFactoryStudio.tsx`
  * Transcript HUD: `apps/web/src/components/LiveTranscriptHUD.tsx`
* `apps/orchestrator/`: Node.js, Express, WebSocket (`ws`), Redis 7, DeepSeek LLM.
  * Entry: `apps/orchestrator/src/index.ts`
  * Voice Token & Anna Persona: `apps/orchestrator/src/routes/token.ts`
  * Brand Voice Service: `apps/orchestrator/src/services/brandVoiceService.ts`
  * Client Credentials Service: `apps/orchestrator/src/services/clientCredentialsService.ts`
  * Social Publishing Service: `apps/orchestrator/src/services/socialPublishingService.ts`
  * Content & Pipeline Routes: `apps/orchestrator/src/routes/content.ts`
  * Credentials Routes: `apps/orchestrator/src/routes/credentials.ts`
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

When the user asks you to plug their business into GrowthVoice OS:

### 1. Add Brand Voice & Value Proposition
Create or edit `vault/Clients/<Company_Name>/BrandVoice.md`:
* Set `Company Name`, `Tone Archetype` (`Enterprise Advisor`, `Tactical Operator`, `Empathetic Mentor`, or `Visionary Founder`).
* Set `Core Value Proposition`, `Target Audience`, and `Signature Lexicon`.

### 2. Configure Cloud Social Credentials
Send a POST request or guide the user to the `[Keys]` modal in the UI:
```bash
curl -X POST http://localhost:4000/api/credentials/<Company_Name> \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "twitter",
    "accountHandle": "@Handle",
    "secrets": { "apiKey": "...", "apiSecret": "...", "bearerToken": "..." },
    "autoPublishEnabled": true
  }'
```

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
   * Never mix keys across different clients. Each client's secrets live strictly in `vault/Clients/<Client_Name>/Credentials.json` and are masked in the UI.
3. **Docker Rebuild**:
   * Because the app runs in Docker, after modifying code in `apps/web/` or `apps/orchestrator/`, rebuild the containers with `docker compose build && docker compose up -d`.
