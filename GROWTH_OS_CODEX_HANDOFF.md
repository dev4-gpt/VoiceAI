# 🚀 GrowthVoice OS — Developer & Codex Integration Guide

> **Welcome Codex / AI Engineers!**  
> This document is designed specifically for **Codex** and automated coding agents to rapidly ingest, understand, and integrate new business use cases into **GrowthVoice OS**.

---

## 📌 Executive Architecture & System Topology

GrowthVoice OS is a sovereign, voice-first growth operating system that automates **client acquisition**, **inbound voice qualification**, and **omnichannel social syndication** for high-ticket enterprises, agencies, consultants, and creators.

### Monorepo Stack
* **Web Command Console (`apps/web`)**: React 18, Vite, Tailwind CSS, Lucide Icons, native WebGL Raymarching Shader Reactor (`NeuralAudioOrb.tsx`). Running on `http://localhost:3000`.
* **Autonomous Orchestrator (`apps/orchestrator`)**: Node.js, Express, WebSocket (`ws`), AssemblyAI Voice Agent API (`universal-3-5-pro`), DeepSeek LLM, Redis 7. Running on `http://localhost:4000`.
* **Shared Types (`packages/shared`)**: Monorepo contracts, BANT schemas, tool definitions, and content models.
* **Persistent Obsidian Vault (`vault/`)**: Local-first markdown second-brain storing client brand voices, dossiers, knowledge graphs, credentials, and social publications.

---

## ⚠️ Current Implementation Status — Read This Before Building On Top

This is a working prototype, not a fully wired production system. Several capabilities below are described as "autonomous" or "live" in spirit, but are only *actually real* when a specific API key or flag is configured — otherwise the code intentionally falls back to a clearly-labeled simulation so the rest of the flow (UI, vault logging, demo) still works end-to-end. Codex/agents integrating a new business should check this table before assuming any given call reaches a real third-party API:

| Capability | Real when... | Simulated fallback |
| :--- | :--- | :--- |
| Voice session (AssemblyAI) | `ASSEMBLYAI_API_KEY` env var set | `demo_token_...` mock session token |
| Anna chat / content generation (DeepSeek) | `DEEPSEEK_API_KEY` env var set | Hardcoded canned response (`deepseekService.generateFallback`) |
| Twitter/X publish | `ENABLE_REAL_PUBLISHING=true` + complete OAuth1 credentials (`apiKey`/`apiSecret`/`accessToken`/`tokenSecret`) for the client | Fabricated post ID/URL, `isSimulated: true`, no real tweet is posted |
| LinkedIn publish | `ENABLE_REAL_PUBLISHING=true` + a valid `accessToken` scoped for `w_member_social` (obtained out-of-band — this app does not implement the OAuth2 consent flow) | Fabricated post ID/URL, `isSimulated: true` |
| YouTube publish | **Not implemented.** The stored credential (a bare API key) is read-only and cannot authenticate a publish call — real publishing needs a full OAuth2 authorization-code + refresh-token flow | Always simulated, labeled `status: 'stub_unsupported'` |
| Substack publish | `webhookUrl` configured for the client | Real `fetch()` POST is attempted; on failure, reports `status: 'failed'` (previously this silently reported success even when the webhook call failed — fixed) |
| `/api/evals/*` | N/A — always static | Returns hardcoded demo numbers (`mode: 'static_demo'`), not a computed evaluation |

Check every publish receipt's `isSimulated` field at runtime rather than assuming success means a real post landed. When integrating a real business, real publishing for Twitter/LinkedIn requires manually obtaining long-lived API tokens from each platform's developer console (no in-app OAuth flow exists) and setting `ENABLE_REAL_PUBLISHING=true`.

---

## 🧠 Core System Capabilities

### 1. Universal GrowthOS Advisory Voice (Anna)
* **Positioning**: Anna is firmly anchored as **Senior Growth Operating Architect at GrowthOS** (the universal autonomous revenue operating layer).
* **Persona Rule**: Anna **never** pretends to be an internal employee of client companies or claims "we built this" / "we have done this". Instead, Anna acts with the diagnostic authority of a top-tier management consultancy (unit economics, CAC, funnel leakage, model routing).
* **Source Locations**:
  * System prompt & text chat: [`apps/orchestrator/src/routes/token.ts`](apps/orchestrator/src/routes/token.ts)
  * Brand Voice service & greetings: [`apps/orchestrator/src/services/brandVoiceService.ts`](apps/orchestrator/src/services/brandVoiceService.ts)
  * Web persona configurations: [`apps/web/src/App.tsx`](apps/web/src/App.tsx) (`getPersonaConfig`)

### 2. Multi-Mode 3D Glassy Voice Reactor Suite
* **Default Look**: **The Cymatic Plane (Liquid & Organic)** runs by default on app launch without clicking any options.
* **Supported Styles**:
  1. `cymatic` — **The Cymatic Plane**: Harmonic standing waves deforming with speech amplitude.
  2. `prism` — **The Frosted Prism**: Crystalline faceted geometry with specular edge refraction.
  3. `gyroscope` — **The Glass Gyroscope**: Triple concentric gimbal rings orbiting an illuminated nucleus.
  4. `monolith` — **The Monolith Lightbox**: Apple-minimalist chamfered slab with subsurface light pillar.
  5. `ribbon` — **The Neural Ribbon**: Continuous Möbius glass band.
  6. `droplet` — **The Liquid Droplet**: Mercury fluid core with high surface tension.
  7. `waveform` — 2D acoustic frequency bins.
* **Selector**: Both **Text Dropdown Box** and **Quick-Pick Button Chips** on the front page.
* **Source Location**: [`apps/web/src/components/NeuralAudioOrb.tsx`](apps/web/src/components/NeuralAudioOrb.tsx)

### 3. Client-Separated Cloud Credentials Architecture
* **Isolation**: Each client maintains isolated credentials under `vault/Clients/<Client_Name>/Credentials.json` and `ConnectedPlatforms.md`.
* **Supported Platforms**:
  * **Twitter / X**: `apiKey`, `apiSecret`, `accessToken`, `tokenSecret`, `bearerToken`, `accountHandle`.
  * **LinkedIn**: `clientId`, `clientSecret`, `accessToken`, `accountHandle`.
  * **Substack / Webhook CMS**: `webhookUrl`, `bearerToken`, `accountHandle`.
  * **YouTube**: `apiKey`, `channelId`, `accountHandle`.
  * **Cloud Storage (S3 / R2)**: `bucket`, `endpoint`, `accessKeyId`, `secretAccessKey`.
* **Masked Security**: Secret keys are never exposed in the UI (`xak_••••••••1029`).
* **Source Locations**:
  * Backend: [`apps/orchestrator/src/services/clientCredentialsService.ts`](apps/orchestrator/src/services/clientCredentialsService.ts)
  * REST API: [`apps/orchestrator/src/routes/credentials.ts`](apps/orchestrator/src/routes/credentials.ts)
  * UI Modal: [`apps/web/src/components/ClientCredentialsModal.tsx`](apps/web/src/components/ClientCredentialsModal.tsx)

### 4. End-to-End Autonomous Social Publishing Pipeline
* **Flow**: `1. Research Vault ➔ 2. Anna Voice Consultation ➔ 3. Omnichannel Content Studio ➔ 4. Cloud Social Dispatch`
* **Execution**:
  * Ingests Brand Voice and conversation takeaways.
  * Formulates 5-part Twitter threads, LinkedIn authority posts, and Substack newsletters.
  * Dispatches directly to connected client platform APIs.
  * Logs immutable audit trails with transaction hashes to `vault/Clients/<Client_Name>/SocialFeed.md`.
* **Source Locations**:
  * Engine: [`apps/orchestrator/src/services/socialPublishingService.ts`](apps/orchestrator/src/services/socialPublishingService.ts)
  * API: [`apps/orchestrator/src/routes/content.ts`](apps/orchestrator/src/routes/content.ts)
  * UI: [`apps/web/src/components/ContentFactoryStudio.tsx`](apps/web/src/components/ContentFactoryStudio.tsx)

---

## 🛠️ How to Integrate Your Own Business Use Case (In 3 Steps)

### Step 1: Create Your Client Profile & Brand Voice
Add your business under the Obsidian vault at `vault/Clients/<Your_Business_Name>/BrandVoice.md`:
```markdown
# 🎙️ Brand Voice DNA: Your Business Name

**Company Name:** Your Business Name
**Tone Archetype:** Enterprise Advisor (or Tactical Operator / Empathetic Mentor / Visionary Founder)
**Core Value Proposition:** High-ticket AI automation and growth consulting for B2B enterprises.
**Target Audience:** Founders, CEOs, and agency operators.
**Signature Lexicon:** revenue architecture, pipeline velocity, unit economics, deterministic guardrails.
**Banned Terms:** hacks, cheap, get rich quick, untested.
```
*Or simply create it via the Web Console UI by clicking `[+] Add` in the Client Manager bar.*

### Step 2: Configure Your Cloud Social Credentials
Send a `POST` request to `/api/credentials/<Your_Business_Name>` or use the `[Keys]` button in the Web Console:
```bash
curl -X POST http://localhost:4000/api/credentials/Your_Business_Name \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "twitter",
    "accountHandle": "@YourHandle",
    "secrets": {
      "apiKey": "your_api_key",
      "apiSecret": "your_api_secret",
      "bearerToken": "your_bearer_token"
    },
    "autoPublishEnabled": true
  }'
```

### Step 3: Run the Autonomous Social Pipeline
Trigger the pipeline programmatically:
```bash
curl -X POST http://localhost:4000/api/content/auto-pipeline \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Your Business Name",
    "transcriptExcerpt": "Latest breakthrough from Anna consultation or customer voice call",
    "platforms": ["twitter", "linkedin", "substack"]
  }'
```
Or click **"Run Autonomous Sync"** in the Content Factory Studio tab on [`http://localhost:3000`](http://localhost:3000).

---

## 📡 Essential API Quick Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Service health & registered tools |
| `POST` | `/api/voice/token` | Generate AssemblyAI live session token with Brand Voice injection |
| `POST` | `/api/voice/chat` | Multi-turn conversational consultation with Anna (GrowthOS persona) |
| `GET` | `/api/credentials/:clientId` | Get masked connected platform credentials |
| `POST` | `/api/credentials/:clientId` | Save/update platform credentials |
| `POST` | `/api/credentials/:clientId/verify` | Test connection and measure API latency |
| `POST` | `/api/content/publish` | Publish drafted content pack across connected platforms |
| `POST` | `/api/content/auto-pipeline` | Run complete 4-step autonomous research ➔ talk ➔ publish loop |
| `GET` | `/api/content/publications/:companyName` | Retrieve publication history from Obsidian vault |
| `GET` | `/api/crm/leads` | Retrieve qualified leads and Obsidian dossier paths |

**Auth note**: `/api/credentials/*` and the state-changing `/api/content/publish`, `/api/content/auto-pipeline`, `/api/content/dispatch` routes require `Authorization: Bearer <ORCHESTRATOR_API_KEY>` once that env var is set (local demo mode, with it unset, leaves them open).

---

## 🐳 Docker Deployment

To build and run all services:
```bash
docker compose up -d --build
```
* Web Console: `http://localhost:3000`
* Orchestrator: `http://localhost:4000`
* Redis: `localhost:6379`
