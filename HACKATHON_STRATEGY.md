# AssemblyAI Voice Agent Hackathon (lablab.ai) — Strategy & Submission Blueprint

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
| **Use of AssemblyAI Technology** | Going beyond basic transcription; utilizing real-time Voice Agent features. | Deep utilization of Voice Agent API (`universal-3-5-pro`), dynamic `UpdateConfiguration` (`agent_context`, `keyterms_prompt`), flat tool calling, and low-latency full-duplex speech. |
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
