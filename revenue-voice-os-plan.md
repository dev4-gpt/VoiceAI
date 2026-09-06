# AI Growth Operator Voice OS – AssemblyAI Hackathon Plan

## 1. Problem & Vision

Creators with large audiences make most of their money from digital products (courses, communities, mentorship, templates), but they rarely have the time or skills to run reliable sales, operations, and retention funnels.

A **human growth operator** solves this by building and running the back‑end systems for the creator (offers, funnels, CRM, retention) in exchange for **15–50% of profits**, instead of a small affiliate cut.[web:131][web:135]

Our hackathon project turns this into an **AI Growth Operator Voice OS**:

- A **voice‑first, creator‑focused revenue OS** built on **AssemblyAI’s Voice Agent API**.
- Handles after‑hours inbound calls, outbound lead‑gen campaigns, and renewal/retention workflows.
- Integrates with CRM, marketing tools, telephony, and billing, so the creator can stay the on‑camera talent while the system runs sales and operations.


## 2. Hackathon & AssemblyAI Alignment

We strictly follow AssemblyAI’s **Coding Agent Instructions** and the lablab hackathon requirements.

### Mode and product choice

- **Mode:** Realtime managed **Voice Agent API** (speech‑in / speech‑out, STT + LLM + TTS + turn detection + tool calling in one WebSocket).[web:99][web:105][file:1]
- **Region:** US base URLs (primary user base and infra in US).[file:1][web:111]
- **Models:**
  - Voice Agent / realtime: `speech_model=universal-3-5-pro` – flagship realtime model with ~1s end‑to‑end latency and 18 languages + code‑switching.[file:1][web:103][web:105]
  - Optional pre‑recorded analytics: `speech_models: ["universal-3-5-pro", "universal-2"]` – ordered fallback list for multi‑language coverage.[file:1]

### Operating rules we explicitly follow

From Section 0 of the Coding Agent Instructions:[file:1]

- **Discovery → Recommendation → Code:** We gather requirements, post a Recommendation block, and only then implement.
- **Prefer official SDKs:** `assemblyai` Python/Node for any pre‑recorded or LLM Gateway calls; Voice Agent WS for managed agents.[file:1]
- **Auth pattern:** Raw key in server‑side env vars only.
  - REST, streaming, LLM Gateway: `Authorization: YOUR_API_KEY` (no Bearer).[file:1][web:104]
  - Voice Agent WS: `Authorization: Bearer YOUR_API_KEY` (only exception).[file:1][web:105]
- **No client‑side keys:** Browsers/mobile clients always use short‑lived tokens minted by our backend via `/v1/token`.[file:1][web:104]
- **Explicit termination:** Every realtime/Voice Agent session ends with a `Terminate` message to avoid abandoned billable sessions.[file:1][web:105]
- **No deprecated LeMUR params:** Use LLM Gateway instead of `auto_chapters`, `summarization`, etc.[file:1][web:112]
- **Live docs:** Always fetch `llms.txt` / `llms-full.txt` to verify parameters per model + mode before recommending or coding.[file:1][web:102]

### Hackathon deliverables (lablab)

- Public web demo (client + backend + Voice Agent pipeline).
- GitHub repo with README, diagrams, and explicit AssemblyAI usage.
- Short video demo walking through 2–3 core flows.
- Concise pitch framing this as an **AI Growth Operator OS for creators**.[web:46][web:55]


## 3. High‑Level Architecture

Four layers:

1. **Client layer** – Web app and/or telephony edge handling mic/audio capture, transcripts display, and call controls.[web:73]
2. **Voice layer** – AssemblyAI Voice Agent API (`wss://agents.assemblyai.com/v1/ws`), which collapses STT + LLM + TTS + turn detection + tool calling.[web:99][web:105]
3. **Revenue OS backend** – Orchestrator + specialized revenue agents (Lead Gen, SDR, Business Value, GTM, CRM Sync, Retention/CS) implemented as tool functions behind the Voice Agent.[web:131][web:135]
4. **External systems** – CRM, marketing platform, telephony provider, billing/subscription, analytics warehouse.[web:85][web:90][web:96]

**Data flow (simplified):**

User → Web/Telephony Client → Voice Agent WS → Orchestrator → Specialized Agents → CRM/Marketing/Billing/Analytics.

The Voice Agent’s internal LLM decides which tools to call and uses the tool results to craft spoken replies.[web:105][web:106]


## 4. Voice Agent Session Design

### Auth and connection

- Backend opens WS to `wss://agents.assemblyai.com/v1/ws` with header `Authorization: Bearer YOUR_API_KEY`.[file:1][web:105]
- Browser/mobile client first calls our `/api/voice-token` endpoint.
  - Backend calls `https://agents.assemblyai.com/v1/token?expires_in_seconds=...` using raw key.
  - Client then connects to `wss://agents.assemblyai.com/v1/ws?token=<token>&speech_model=universal-3-5-pro&mode=balanced`.

### Session update payload

Immediately after connect, backend sends a `session.update` message:[file:1][web:105]

- `system_prompt` – defines persona: "You are an AI growth operator for online creators."
- `greeting` – initial message.
- `input.format.encoding` – `audio/pcm` at 24 kHz mono.
- `output.voice` – default voice (e.g., `"anna"`).
- `language_detection: true` – auto language detection on U3.5 Pro realtime.[file:1][web:103]
- `keyterms_prompt` – per‑creator vocabulary (product names, brand terms).
- `tools` – flat schema list of backend functions.

### Tools (functions) exposed to the Voice Agent

Each business agent maps to one or more tools:

- `create_lead` – create/update lead in CRM, attach source, call context, and initial score.[web:80][web:85]
- `qualify_lead` – perform BANT/timeline questions and compute a qualification score.[web:69][web:83]
- `schedule_meeting` – book meetings in the creator’s or AE’s calendar.
- `update_crm` – generic CRM field/stage/tag updates.[web:85][web:89]
- `plan_campaign` / `record_experiment_result` – GTM experimentation & A/B tracking.[web:135][web:64]
- `log_renewal` / `log_churn_reason` – update renewal status and reasons for retention analytics.[web:86][web:88][web:93]

Voice Agent’s LLM:

1. Reads each user turn (transcript + context).
2. Decides which tools to call.
3. Uses tool results to craft a conversational reply.


## 5. Specialized Revenue Agents

Internally (in our backend), each tool is implemented by a module/"agent" that encapsulates domain logic:

- **Lead Gen Agent**
  - Owns top‑of‑funnel: inbound form callbacks, after‑hours calls, outbound campaigns, and reactivation of old leads.[web:79][web:80][web:84]
  - Writes leads + scores to CRM and triggers nurture sequences.

- **SDR Agent**
  - Deeper discovery, qualification, and meeting booking; moves qualified leads to opportunity stages.[web:69][web:73][web:83]

- **Business Value Agent**
  - Maps pains to outcomes and crafts ROI stories using product catalogs and creator‑specific playbooks.[web:131][web:139]

- **GTM Agent**
  - Designs offers and campaigns, manages segments, defines script variants, and runs A/B tests; logs performance metrics for each variant.[web:135][web:64][web:72]

- **CRM Sync Agent**
  - Provides a consistent interface to the chosen CRM (Salesforce, HubSpot, etc.), handles idempotent updates and field mapping.[web:85][web:89]

- **Retention / CS Agent**
  - Handles renewal reminders, save attempts, win‑back campaigns, and NPS/CSAT survey flows using billing + CRM data.[web:86][web:88][web:90][web:93]

The **Orchestrator** is a thin layer that:

- Receives tool‑call requests from Voice Agent.
- Routes calls to the appropriate backend module.
- Normalizes their JSON responses back into the tool schema.


## 6. Key Call Flows

### 6.1 After‑hours inbound revenue call

1. Prospect calls published number or clicks "Call now" in web app.
2. Web/telephony client streams audio to Voice Agent WS.
3. Voice Agent produces Turn events with transcripts.
4. LLM decides to call `create_lead` → Lead Gen Agent creates/updates a lead in CRM.
5. LLM then calls `qualify_lead` → SDR logic scores and classifies lead.
6. If qualified, LLM calls `schedule_meeting` → meeting booked and confirmation sent.
7. Voice Agent responds with natural language confirmation and follow‑up instructions.[web:73][web:80][web:83]

### 6.2 Outbound lead‑gen campaigns

1. GTM Agent defines segments, campaign offers, and scripts.
2. Scheduler/dialer initiates outbound calls → Voice Agent.
3. Voice Agent handles the conversation; tools `create_lead`, `qualify_lead`, and `schedule_meeting` are called as needed.
4. GTM Agent records outcomes and updates campaign performance metrics (conversion, cost per qualified lead).[web:80][web:74][web:81]

### 6.3 Renewal / retention flows

1. Billing system provides upcoming renewals or churn‑risk accounts to a job planner.[web:86][web:88][web:95]
2. Planner triggers outbound calls via Voice Agent.
3. Voice Agent handles objections and Q&A; tools `log_renewal` / `log_churn_reason` update CRM + billing.
4. High‑value or complex cases are escalated to human CS with full context.
5. Retention metrics (renewal rate, save rate, reasons) feed back into GTM Agent and reporting.[web:90][web:93][web:92]


## 7. Analytics & Evaluation

We align with modern voice‑agent evaluation frameworks (TTS quality, conversation quality, tool usage and task completion, intelligence, safety, reliability).[web:47][web:62][web:64][web:76]

Metrics we track:

- **Voice performance:**
  - Time‑to‑first audio byte (TTFA).
  - End‑to‑end turn latency (p50/p95).
  - Word Error Rate on domain audio.
  - MOS sampling for perceived quality.[web:103][web:76][web:47]

- **Business performance:**
  - Lead capture and qualification rates.
  - Meeting booking rate and show rate.
  - Renewal rate vs baseline, save rate on cancels.
  - CSAT/NPS where applicable.

- **Agent/experiment performance:**
  - Script variant conversion.
  - Segment‑level performance and cohort analyses.

Data pipeline:

1. Voice Agent + backend log per‑turn spans (timestamps, transcripts, tool calls, outcomes) to a warehouse.
2. Batch jobs compute metrics and write them to an analytics schema.
3. Dashboards visualize both voice performance and revenue outcomes.


## 8. Repo Structure (Monorepo)

Suggested layout:

```text
revenue-voice-os/
  README.md
  docs/
    PRD.md
    assemblyai.md
    architecture.md

  client/
    web/
      src/
        components/
        pages/
        utils/voice.ts       # Voice Agent WS client, audio, transcripts
      package.json

  backend/
    api/
      src/
        index.ts             # Server entry (FastAPI/Express)
        routes/
          tokens.ts          # /api/voice-token → Voice Agent token minting
          sessions.ts        # session.update helpers
        orchestrator/
          orchestrator.ts    # Glue between Voice Agent tools and agents
          agents/
            lead_gen.ts
            sdr.ts
            value.ts
            gtm.ts
            crm_sync.ts
            retention.ts
        integrations/
          assemblyai.ts      # Voice Agent + REST + LLM Gateway clients
          crm.ts             # Salesforce/HubSpot connectors
          marketing.ts       # ESP/SMS connectors
          billing.ts         # Billing/subscription APIs
          analytics.ts       # Warehouse client
      package.json

  infra/
    docker-compose.yml
    k8s/
    terraform/

  tests/
    voice-flows/
    agents/
```


## 9. Build Phases (Hackathon Timeline)

**Phase 1 – Voice skeleton (1–3 days)**

- Implement `/api/voice-token` and a basic web client that can talk to Voice Agent and echo back messages.
- Hard‑code a simple flow (e.g., collect name + email and confirm) using a single tool.

**Phase 2 – Lead Gen + SDR + CRM (3–5 days)**

- Implement `create_lead`, `qualify_lead`, `schedule_meeting`, and `update_crm` tools.
- Wire them to a real or mocked CRM.
- Demo after‑hours inbound flow end‑to‑end.

**Phase 3 – Retention + analytics (3–5 days)**

- Add Retention/CS Agent and renewal flows using a mocked billing system.
- Build minimal metrics logging (latency, booking rate, renewal rate).

**Phase 4 – GTM + polish (remaining time)**

- Implement GTM Agent for script experiments.
- Polish UI, diagrams, README, and recording of demo video.
- Prepare a short pitch that clearly frames this as an **AI Growth Operator OS on AssemblyAI’s Voice Agent API**.


## 10. How to Use This Doc in Antigravity or Other Agent Platforms

- Place this file as `docs/PRD.md` or `docs/overview.md` in your project.
- Point Google Antigravity or other agentic IDEs at the repo folder.
- In your agent prompts, explicitly reference this document (and `docs/assemblyai.md`) as the source of truth for architecture and AssemblyAI integration.

This gives autonomous agents enough context to start generating code, tests, and infra that stay aligned with both the hackathon requirements and AssemblyAI’s evolving documentation.
