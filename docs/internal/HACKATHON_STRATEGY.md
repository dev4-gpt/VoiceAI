# AssemblyAI Voice Agent Hackathon (lablab.ai) — Strategy & Submission Blueprint

> **Historical planning document — superseded.** Written early in the build, before
> the product was audited. Figures marked *corrected* have been fixed in place;
> anything else here reflects intent at the time, not the current product. For
> current pricing, unit economics and capabilities, see the [README](../../README.md)
> and the status table in [CLAUDE.md](../../CLAUDE.md).


> **Event:** [AssemblyAI - Voice Agent Hackathon on lablab.ai](https://lablab.ai/event/assemblyai-voice-agent-hackathon)  
> **Dates:** September 1 – September 30, 2026  
> **Prize Pool:** $10,000 ($5,000 Cash + $5,000 AssemblyAI Credits)  
> **Project Title:** **GrowthVoice OS — The Autonomous AI Growth Operator for Creators**

---

## 1. Hackathon Track & Theme Alignment

While the core challenge is **"building intelligent voice agents on AssemblyAI's voice infrastructure"**, projects that win top honors at lablab.ai clearly demonstrate measurable business value, architectural sophistication, and deep technical utilization of the sponsor's tech stack.

### How GrowthVoice OS Maps to Winning Themes:
1. **High-Velocity Revenue Automation (Sales / SDR):** Replaces missed after-hours creator website forms with a live spoken conversational agent that conducts BANT qualification and calendar booking in real time.
2. **Customer Retention & Churn Rescue:** Real-time speech-in/speech-out objection handling that negotiates retention terms under strict business rules.
3. **Enterprise Multi-Agent Architecture:** Shows how AssemblyAI's Voice Agent API acts as the conversational orchestrator over specialized business microservices (Lead Gen, SDR, RAG Knowledge, Retention).
4. **Reliability & Production Readiness:** Built according to the **Production GenAI Systems** blueprint (Anthropic Evals, multi-layer caching, observability) and **Docker's State of Agentic AI** containerized guidelines.

---

## 2. Lablab.ai Judging Criteria & Scoring Optimization

Judges on lablab.ai evaluate submissions across four core dimensions:

| Criterion | What Judges Look For | How GrowthVoice OS Dominates |
| :--- | :--- | :--- |
| **Technical Implementation & Depth** | Clean code, proper SDK/API usage, robust handling of async streams, error resilience, audio pipeline. | Strictly follows AssemblyAI Coding Agent rules: ephemeral token minting, 24 kHz mono PCM16, flat tool schema, interruption handling, explicit `Terminate`. |
| **Use of AssemblyAI Technology** | Going beyond basic transcription; utilizing real-time Voice Agent features. | Voice Agent API end to end: server-minted ephemeral tokens, `session.update` with 7 registered tools, the `tool.call` → `tool.result` loop, and barge-in via `interrupt_response`. (*corrected* — previously cited a model name and config fields the code does not use.) |
| **Innovation & Concept** | A novel, high-impact use case that moves beyond generic AI voice bots. | Replaces the \$10k/mo human "Growth Operator" agency model with an autonomous Voice OS capturing after-hours creator revenue. |
| **Business Value & Usability** | Clear ROI, practical utility, polished UI/UX, measurable metrics. | Direct revenue metric tracking (qualified leads, meetings booked, churn save rate) displayed in a dark-mode, glassmorphic operator dashboard. |
| **Presentation & Documentation** | Clear README, architecture diagrams, concise video walkthrough (≤5 mins). | Architectural diagrams, complete Docker Compose setup, interactive Evals dashboard, and polished video storyboard. |

---

## 3. Video Demo Script & Storyboard (3:30 Minutes)

A winning lablab.ai demo video must be crisp, engaging, and show live functionality.

### **Scene 1: The Problem & The Hook (0:00 – 0:45)**
* **Visual:** High-energy intro showing creator sales pages (Skool, Teachable, Kajabi, YouTube) with visitors dropping off late at night.
* **Voiceover:** *"Online creators and digital educators lose up to 60% of high-intent sales because prospective students want questions answered immediately, not in an email 18 hours later. Human growth operators charge 30% to 50% profit shares to run these sales funnels. Today, we introduce **GrowthVoice OS**—the autonomous AI Growth Operator powered by AssemblyAI's real-time Voice Agent API."*

### **Scene 2: Live Inbound Qualification & Booking (0:45 – 1:45)**
* **Visual:** Split screen showing the dark-mode Web Voice Console on the left and the Live CRM Kanban board on the right.
* **Action:** 
  1. The user clicks "Start Inbound Call". The 60 FPS canvas waveform responds instantly.
  2. The AssemblyAI agent greets the user with low-latency spoken audio (`anna` voice): *"Hey! Welcome to Alex's Growth Accelerator. What brings you by today?"*
  3. The user asks about pricing and course curriculum. 
  4. The screen highlights the live HUD: tool call `get_product_knowledge` fetches verified pricing from the Hybrid RAG engine.
  5. The user gives their budget and email. The agent calls `create_or_update_lead` and `qualify_lead`. 
  6. The CRM board shifts the card to **"Qualified Lead ($5k Tier)"** in real time!
  7. The agent books a strategy call using `schedule_growth_consultation`.

### **Scene 3: Interruption & Churn Save with Guardrails (1:45 – 2:35)**
* **Visual:** Switch call scenario to "Membership Cancellation / Churn Save".
* **Action:**
  1. User: *"I need to cancel my subscription, it's just getting too expensive."*
  2. The agent begins speaking an objection response; the user interrupts (*"Wait, is there any discount?"*).
  3. The visualizer highlights the **instant barge-in abort** without audio pop or delay.
  4. The agent proposes a 25% discount.
  5. The screen zooms into the **Deterministic Guardrails HUD**: the backend intercepts the proposal and clamps it to the authorized policy ceiling of 15% + a free strategy audit.
  6. Tool `process_retention_offer` executes and the member is saved!

### **Scene 4: Engineering Rigor — Docker, Evals & Observability (2:35 – 3:15)**
* **Visual:** The Evals & Telemetry Tab in the dashboard.
* **Voiceover:** *"Under the hood, GrowthVoice OS isn't just a voice demo. It's built on production GenAI foundations. We integrate the Anthropic Evals framework running automated test suites that measure both pass@k and pass^k consistency across non-deterministic speech turns. The entire stack is containerized with Docker Compose, providing isolated, sandboxed tool runtimes."*

### **Scene 5: Summary & Call to Action (3:15 – 3:30)**
* **Visual:** Summary slide with GitHub repository link, AssemblyAI integration callouts, and creator revenue impact metrics.

---

## 4. Lablab.ai Submission Checklist

- [x] **Project Name:** GrowthVoice OS — Autonomous AI Growth Operator
- [x] **Short Description (≤ 255 chars):** Voice-first autonomous Growth Operator OS for online creators, powered by AssemblyAI Voice Agent API, hybrid RAG, deterministic guardrails, and Anthropic evals.
- [x] **Long Description (≥ 100 words):** Comprehensive description detailing problem, solution, architecture, and business metrics.
- [x] **Cover Image:** 16:9 high-resolution graphic with dark glassmorphism styling and AssemblyAI branding.
- [x] **Public GitHub Repository:** Monorepo with clear `README.md`, `ARCHITECTURE.md`, `docker-compose.yml`, and tests.
- [x] **Video Presentation (YouTube / Loom, ≤ 5 min):** Demonstrating the 3 key voice workflows and real-time CRM updates.
- [x] **Working Demo / Deployment:** Local Docker Compose runnable or hosted cloud demo.

---

## 5. Pricing & Unit Economics (*corrected*)

The original version of this section costed voice at ~$0.018/min and claimed
87–93% gross margins and a ">14.6x LTV:CAC". All three were wrong: the product runs
on AssemblyAI's **Voice Agent API at $4.50/hour ($0.075/min), all-in**, and there is
no retention or acquisition data to support any LTV:CAC figure. Tiers were re-priced
from the real cost.

| Plan | Monthly | Annual (per mo) | Voice minutes | Overage |
| :--- | ---: | ---: | ---: | ---: |
| Starter | $149 | $119 | 500 | $0.30 / min |
| Pro | $449 | $359 | 1,500 | $0.25 / min |
| Enterprise | $1,497 | $1,197 | 5,000 | $0.20 / min |

- **Gross margin at 100% use of included minutes, after Stripe fees:** ~72% monthly,
  ~66% annual, on every tier. Real margins run higher at typical usage.
- **Overage margin:** 72% / 67% / 60%. Never below cost; a test enforces the floors.
- **Break-even for the customer:** at a $3,500 contract value, one extra closed deal
  every 7.8 months pays for Pro.
- Latency tiers ("<350ms TTFA", "<250ms GPU edge"), voice cloning, "zero-data vault"
  and webhook SLAs were listed here but never built or measured; they are removed.

---

## 6. 1-Line Embeddable Widget (`embed.js`) Architecture

Customer onboarding requires zero engineering overhead. Any creator, agency, or B2B SaaS founder can deploy Anna to their site by adding one script tag before `</body>`:

```html
<!-- GrowthVoice OS Spoken Assistant Embed -->
<script
  src="https://growthvoice-os.vercel.app/embed.js"
  data-company="DesignAcademy Studio"
  data-client-id="lead_jm_901"
  data-accent="#d4af37"
  data-position="bottom-right">
</script>
```

### Technical Specs:
1. **Zero External Dependencies:** Pure vanilla JavaScript IIFE with scoped CSS and dynamic DOM injection.
2. **Ephemeral Token Handshake:** Requests secure minting via `POST /api/voice/token` without exposing server secrets or AssemblyAI master keys.
3. **Responsive Glassmorphism:** Renders a floating, pulsing droplet that expands into a 3D canvas voice visualizer with live transcript streaming and barge-in capability.
4. **Live Verification Sandbox:** Includes an automated testbed at `http://localhost:4000/widget-preview` simulating external customer site integration.

---

## 7. Hackathon Judge Pitching Cheat Sheet ($10,000 Grand Prize Narrative)

When presenting to AssemblyAI and lablab.ai judges, follow this 3-step anchor formula:

1. **The $10k Revenue Bleed Problem:**
   *"50 million online creators and tech businesses lose 60% of high-intent traffic because 32% of visitors browse outside business hours. Static contact forms convert at 0.8%. Human SDR agencies charge $10,000/mo plus 40% commission."*

2. **The AssemblyAI Voice Agent Moat:** (*corrected* — the original quoted
   `universal-3-5-pro` and "sub-350ms time-to-first-audio"; the API has no model
   selection field and latency was never measured)
   *"GrowthVoice OS runs on AssemblyAI's Voice Agent API: the agent registers seven
   tools and calls them mid-conversation, so a lead lands in the CRM while the visitor
   is still talking — and it discloses it is an AI, and asks consent where state law
   requires it, before it listens."*

3. **The Business Model:** (*corrected* — the original claimed "88% gross margins"
   and "a 21x return"; both came from arithmetic errors)
   *"Three subscription tiers priced from real cost: about 72% gross margin even at
   full usage. For a customer, one extra closed deal every eight months pays for Pro."*

