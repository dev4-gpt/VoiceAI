# 📐 GrowthVoice OS — Complete System Architecture & Diagram Index

This directory contains the official architectural diagrams, sequence flows, state machines, and component specifications for **GrowthVoice OS**, built for the **AssemblyAI Voice Agent Hackathon** on [lablab.ai](https://lablab.ai).

The diagrams incorporate standards from:
* **[Archify](https://github.com/tt-a1i/archify):** Typed Architecture Intermediate Representation (`archify-spec.json`), verifiable data flows, and layer separation.
* **[Synaptic](https://github.com/Synaptic-MCP/Synaptic):** Cognitive agentic mesh, sensory perception cortex, short/long-term synaptic memory fabric, and motor effector tool actuators.
* **Mermaid & Obsidian:** 100% native GitHub Markdown rendering + Obsidian Graph View compatibility.

---

## 🗂️ Diagram Index

| # | Diagram Name | File Link | Focus Area |
| :-: | :--- | :--- | :--- |
| **01** | **Storage & Data Lifecycle** | [`01_storage_data_flow.mmd`](01_storage_data_flow.mmd) | Ephemeral frontend state, Redis cache, and persistent Knowledge Graph / Obsidian Vault sync. |
| **02** | **Knowledge Graph Flywheel** | [`02_knowledge_graph_flywheel.mmd`](02_knowledge_graph_flywheel.mmd) | 18 nodes, 15 typed edges, and community clusters from voice inbound to content syndication. |
| **03** | **End-to-End Multi-Tab Architecture** | [`03_end_to_end_multitab_architecture.mmd`](03_end_to_end_multitab_architecture.mmd) | Tab separation and verification showing voice controls strictly isolated to Voice Console. |
| **04** | **Voice Agent & Sub-50ms Barge-In** | [`04_voice_agent_audio_worklet_bargein.mmd`](04_voice_agent_audio_worklet_bargein.mmd) | Full-duplex 24kHz mono PCM16, JWT token minting, VAD turn detection, and audio buffer flush. |
| **05** | **Hermes Content Factory & Self-Healing** | [`05_hermes_content_factory_self_healing.mmd`](05_hermes_content_factory_self_healing.mmd) | Raja Ashok 10-step blueprint, 3 parallel research lanes, and autonomous prompt mutation. |
| **06** | **Anthropic Evals & DeepSeek Judge** | [`06_anthropic_evals_deepseek_judge.mmd`](06_anthropic_evals_deepseek_judge.mmd) | $pass@k$ and $pass^k$ statistical scoring across 20 trials with Model-as-a-Judge grading. |
| **07** | **Deterministic Policy Clamping** | [`07_deterministic_policy_guardrail.mmd`](07_deterministic_policy_guardrail.mmd) | State machine enforcing 15% discount ceiling and injecting value-add growth audits. |
| **08** | **Docker Infrastructure & Isolation** | [`08_docker_infrastructure_isolation.mmd`](08_docker_infrastructure_isolation.mmd) | Microservices network topology, port mapping (3000, 4000, 6379), and host volume mounts. |
| **09** | **Synaptic Cognitive Agent Mesh** | [`09_synaptic_cognitive_agent_mesh.mmd`](09_synaptic_cognitive_agent_mesh.mmd) | Brain-inspired cognitive mesh connecting sensory cortex, working memory, and generative syndication. |
| **IR** | **Archify Typed Specification** | [`archify-spec.json`](archify-spec.json) | Archify-compliant JSON Intermediate Representation defining components, layers, and guardrails. |

---

## 1. Storage & Complete Data Lifecycle

```mermaid
graph TD
    subgraph CLIENT["Frontend Layer (Port 3000)"]
        UI["Voice Web Console (React 18 + Vite)"]
        AUDIO["AudioWorklet (24kHz Mono PCM16)"]
        HUD["Live Transcript HUD & Tool Chips"]
        UI --- AUDIO
        UI --- HUD
    end

    subgraph PROXY["Reverse Proxy & Edge"]
        NGINX["Nginx Container (:3000)"]
        NGINX -->|/api REST| ORCH
        NGINX -->|/ws Telemetry WS| WS
        UI --> NGINX
    end

    subgraph ORCHESTRATOR["Node.js Orchestrator Layer (Port 4000)"]
        WS["Telemetry WebSocket Server (/ws/telemetry)"]
        ORCH["Express API Engine"]
        DISPATCH["Flat Tool Dispatcher"]
        G_SVC["GraphDatabaseService"]
        CF_ENG["Hermes Content Factory Engine"]
        ORCH --- WS
        ORCH --- DISPATCH
        ORCH --- G_SVC
        ORCH --- CF_ENG
    end

    subgraph REDIS_LAYER["Ephemeral Cache Layer"]
        REDIS[("Redis 7 Cache (:6379)")]
        ORCH <-->|Session JWTs & Telemetry| REDIS
    end

    subgraph PERSISTENCE["Persistent Knowledge Graph & Vault Storage"]
        JSON_DB[("knowledge_graph.json (18 Nodes, 15 Edges)")]
        VAULT["Obsidian Markdown Vault (/vault/)"]
        CYPHER["Cypher DDL Export (/data/knowledge_graph.cypher)"]
        GRAPHML["GraphML XML Export (/data/knowledge_graph.graphml)"]
        GRAPHIFY["Graphify D3 Knowledge Graph (/graphify-out/)"]

        G_SVC -->|Auto-Persist| JSON_DB
        G_SVC -->|1-Click Sync| VAULT
        G_SVC -->|Export| CYPHER
        G_SVC -->|Export| GRAPHML
        JSON_DB -->|Extract & Cluster| GRAPHIFY
    end

    subgraph EXTERNAL["External AI APIs"]
        AAI["AssemblyAI Voice Agent API (universal-3-5-pro)"]
        DS["DeepSeek API (R1 Reasoner & V3 Chat)"]
        ORCH <-->|Mint Token & Full-Duplex Audio| AAI
        CF_ENG <-->|Reasoning & Self-Healing| DS
    end
```

---

## 2. Knowledge Graph Flywheel (Revenue & Content Mesh)

```mermaid
graph TD
    subgraph INBOUND_SESSIONS["Spoken Voice Sessions"]
        VS1["🎙️ Voice Session: Jason Miller<br/>(After-Hours Inbound SDR)"]
        VS2["🎙️ Voice Session: Sarah Jenkins<br/>(Retention & Churn Save)"]
    end

    subgraph REVENUE_PIPELINE["CRM & Revenue Tier"]
        LEAD["👤 Lead: Jason Miller<br/>• Budget: $5k-$15k<br/>• BANT Score: 85<br/>• Status: Call Scheduled"]
        OFFER["💼 Offer: Pro Mentorship<br/>• Price: $2,997 ($497/mo)<br/>• Format: Cohort + 1-on-1"]
        MEMBER["👤 Member: Sarah Jenkins<br/>• Tier: VIP Mastermind ($997/mo)<br/>• Status: Retained"]
    end

    subgraph GUARDRAIL_POLICIES["Deterministic Business Guardrails"]
        POLICY1["🛡️ Guardrail: 15% Max Discount<br/>(Deterministic Code Clamp)"]
        POLICY2["🛡️ Guardrail: Real-Time PII Masking"]
    end

    subgraph OBJECTIONS_CAPTURED["Voice-Captured Objections"]
        OBJ1["⚠️ Objection: Price vs Risk<br/>'Will this work with zero audience?'"]
        OBJ2["⚠️ Objection: Cash Flow Tight<br/>'Can I get 35% discount or cancel?'"]
    end

    subgraph RESEARCH_LANES["Hermes 3 Parallel Research Lanes"]
        RL1["🔬 Lane 1: Creator RAG (0.96)<br/>Internal Offer Tiers & Pricing Sprints"]
        RL2["🔬 Lane 2: Market Trends (0.89)<br/>Action Guarantee 4.2x Completion Benchmark"]
        RL3["🔬 Lane 3: Community Analytics (0.94)<br/>Student Voice Calls: Zero Audience Fear"]
    end

    subgraph CONTENT_SYNTHESIS["Hermes Content Pack & Self-Healing"]
        PACK["📦 Content Pack: 14-Day Guarantee (job_cf_101)<br/>Thesis: 'Buyers buy risk removal and speed'"]
        A_TWITTER["🐦 X Thread (5 Tweets)<br/>Constraint: ≤280 chars per tweet"]
        A_EMAIL["📧 Newsletter<br/>'The 3-Sentence Reframe ($42k Closed)'"]
        A_WEBINAR["🎬 Webinar Pitch Script<br/>14-Day Action Guarantee Close"]
        HEAL["🔄 Self-Healing Loop<br/>Tweet #3: 312 chars ➔ 234 chars (Healed)"]
    end

    %% Relationships
    VS1 -->|QUALIFIED_AS| LEAD
    LEAD -->|ASSOCIATED_WITH| OFFER
    VS2 -->|RAISED_OBJECTION| OBJ2
    VS2 -->|TRIGGERED_POLICY| POLICY1
    OBJ2 -->|ASSOCIATED_WITH| MEMBER

    VS1 -->|RAISED_OBJECTION| OBJ1
    OBJ1 -->|RESEARCHED_IN| RL1
    OBJ1 -->|RESEARCHED_IN| RL2
    OBJ1 -->|RESEARCHED_IN| RL3

    RL1 -->|SYNTHESIZED_INTO| PACK
    RL2 -->|SYNTHESIZED_INTO| PACK
    RL3 -->|SYNTHESIZED_INTO| PACK

    PACK -->|CONTAINS_ASSET| A_TWITTER
    PACK -->|CONTAINS_ASSET| A_EMAIL
    PACK -->|CONTAINS_ASSET| A_WEBINAR
    A_TWITTER -->|HEALED_BY| HEAL
```

---

## 3. End-to-End Multi-Tab Architecture

```mermaid
graph TD
    subgraph TAB1["1. Voice Console (Isolated Voice Runtime)"]
        MIC["🎙️ Web AudioWorklet (24kHz Mono)"]
        WAVE["🌊 60 FPS Canvas Visualizer"]
        HUD["💬 Live Transcript HUD"]
        PERS["🎭 Persona Switcher (Inbound / Outbound / Churn)"]
        SIM["⚡ 1-Click Interactive Demo Buttons"]
        MIC --- WAVE
        MIC --- HUD
        PERS --- HUD
        SIM --- HUD
    end

    subgraph TAB2["2. Revenue CRM Pipeline"]
        STAGE1["Stage: New Leads"]
        STAGE2["Stage: BANT Qualified (≥60)"]
        STAGE3["Stage: Strategy Call Booked"]
        STAGE4["Stage: Enrolled / Closed"]
        ROSTER["👥 Retained Members Roster"]
        STAGE1 --> STAGE2 --> STAGE3 --> STAGE4
    end

    subgraph TAB3["3. Hermes Content Studio"]
        L1["Creator RAG Lane"]
        L2["Market Trends Lane"]
        L3["Community Objections Lane"]
        REPAIR["🛡️ Self-Healing Rule Gate (≤280 chars)"]
        ASSETS["📦 Verified Multi-Channel Asset Drafts"]
        GATE["🟢 Creator 1-Click Approval Gate"]
        L1 & L2 & L3 --> REPAIR --> ASSETS --> GATE
    end

    subgraph TAB4["4. Anthropic Evals Suite"]
        TRIALS["20 Stochastic Voice Trials"]
        METRICS["pass@k (100%) & pass^k (88.4%)"]
        JUDGE["DeepSeek-R1 Model-as-a-Judge"]
        TASKS["4 Production Task Benches"]
        TRIALS --> TASKS --> JUDGE --> METRICS
    end

    subgraph TAB5["5. Knowledge Graph & Vault"]
        NODES["18 Graph Nodes & 15 Typed Edges"]
        SEARCH["Node Search & Type Filters"]
        OBS_PREV["Obsidian [[Wikilink]] Preview"]
        EXPORTS["1-Click Sync: Obsidian / Cypher / GraphML"]
        NODES --- SEARCH --- OBS_PREV --- EXPORTS
    end

    %% Cross-Tab Signals
    SIM -->|qualify_lead| STAGE3
    SIM -->|process_retention_offer| ROSTER
    SIM -->|run_content_factory| L1 & L2 & L3
    GATE -->|publish_pack| NODES
```

---

## 4. Voice Agent & Sub-50ms Barge-In Pipeline

```mermaid
sequenceDiagram
    autonumber
    actor User as 👤 Creator / Prospect
    participant Worklet as 🎙️ Browser AudioWorklet (24kHz Mono)
    participant Console as 🖥️ Web Console (React)
    participant Orch as ⚙️ Node.js Orchestrator (:4000)
    participant AAI as ⚡ AssemblyAI Voice Agent API (universal-3-5-pro)
    participant Tool as 🛠️ Flat Tool Dispatcher

    Note over Console,Orch: Session Initialization & Ephemeral Token Minting
    Console->>Orch: POST /api/voice/token
    Orch->>AAI: GET /v1/token?expires_in_seconds=300
    AAI-->>Orch: 200 OK (Single-Use JWT)
    Orch-->>Console: { token: "jwt_...", isDemo: false }

    Note over Console,AAI: WebSocket Handshake & Full-Duplex Audio Stream
    Console->>AAI: Connect wss://agents.assemblyai.com/v1/ws?token=jwt
    AAI-->>Console: 101 Switching Protocols (Session Established)

    Note over User,Worklet: User Speaks: "We need high-ticket funnel in 3 weeks, budget 10k"
    User->>Worklet: Spoken Voice (Acoustic Pressure)
    Worklet->>Worklet: Downsample to 24,000 Hz Mono PCM16
    Worklet->>AAI: Binary Audio Frames (Base64 Chunks)

    Note over AAI: Real-Time Universal-3.5 Pro ASR & VAD Turn Detection
    AAI->>Console: {"type": "transcript", "text": "We need high-ticket funnel..."}
    AAI->>Console: {"type": "tool_call", "name": "qualify_lead", "args": {"budget": "5k_to_15k", "score": 85}}
    
    Console->>Orch: Dispatch Tool Call (qualify_lead)
    Orch->>Tool: executeTool("qualify_lead", args)
    Tool-->>Orch: { status: "qualified", bantScore: 85 }
    Orch-->>Console: Tool Result Synced (Broadcast WS)
    Console->>AAI: {"type": "tool_response", "call_id": "...", "output": "{score: 85}"}

    Note over AAI,User: Voice Agent TTS Synthesis & Playback
    AAI-->>Console: Binary Audio PCM16 (Voice: Anna)
    Console->>User: Spoken Audio: "Fantastic Jason! You're an ideal fit..."

    Note over User,Console: Sub-50ms Barge-In Interruption Event
    User->>Worklet: User Speaks While Agent Is Talking!
    Worklet->>AAI: New Audio Frames Detected
    AAI-->>Console: {"type": "interruption", "timestamp": "..."}
    Console->>Console: 🛑 Instant AudioContext Buffer Flush (<50ms)
    Console->>User: Immediate Silence (Zero Agent Over-talk)
```

---

## 5. Hermes Content Factory & Autonomous Self-Healing

```mermaid
flowchart TD
    STEP1["Step 01: Voice Objection Captured<br/><i>'Will this work with zero audience?'</i>"] --> STEP2["Step 02: Instant Spoken Voice Ack (<1s)<br/><i>'Queued Hermes Content Factory. 3 lanes active.'</i>"]
    
    STEP2 --> PARALLEL{"Step 03-05: 3 Parallel Research Lanes"}

    subgraph THREE_LANES["Parallel Background Research Execution"]
        LANE1["🔬 Lane 1: Creator RAG (0.96)<br/>Internal Offer Sprints & Pricing"]
        LANE2["🔬 Lane 2: Market Trends (0.89)<br/>Action Guarantee 4.2x Completion Rate"]
        LANE3["🔬 Lane 3: Community Objections (0.94)<br/>90-Day Voice Call Objection Analytics"]
    end

    PARALLEL --> LANE1
    PARALLEL --> LANE2
    PARALLEL --> LANE3

    LANE1 --> STEP6["Step 06: Synthesis with DeepSeek-R1<br/>Generate 5-Tweet Thread, Newsletter, Webinar Script"]
    LANE2 --> STEP6
    LANE3 --> STEP6

    STEP6 --> STEP7["Step 07: Multi-Asset Draft Assembly"]

    STEP7 --> GATE8{"Step 08: Autonomous Self-Healing Gate"}

    subgraph HEALING_LOOP["Self-Healing Validation Rules"]
        CHECK1{"Rule 1: Tweet ≤ 280 chars?"}
        CHECK2{"Rule 2: Refund Guarantee Cited?"}
        CHECK3{"Rule 3: PII Redacted?"}

        CHECK1 -- No (e.g. 312 chars) --> MUTATE["DeepSeek-R1 Prompt Mutation<br/>Condense syntax & adjectives"]
        MUTATE --> RE_EVAL["Re-evaluate Length: 234 chars (PASS)"]
        RE_EVAL --> PASS["All Quality Gates Passed ✅"]
        CHECK1 -- Yes --> PASS
        CHECK2 -- Verified --> PASS
        CHECK3 -- Scrubbed --> PASS
    end

    GATE8 --> HEALING_LOOP

    PASS --> STEP9["Step 09: Creator Human Approval Boundary Gate<br/>Status: needs_approval (Pulsing Amber)"]
    
    STEP9 -->|Creator Clicks 'Approve & Publish'| STEP10["Step 10: Multi-Channel Syndication & Graph Commit<br/>• Published to X, Substack, Zoom<br/>• Saved to Obsidian Vault & Knowledge Graph"]
```

---

## 6. Anthropic Evals Suite & DeepSeek Model Judge

```mermaid
flowchart LR
    subgraph TASKS["Anthropic Evaluation Task Suite"]
        T1["Task 01: Inbound BANT Qualification"]
        T2["Task 02: Tough Pricing Objection RAG"]
        T3["Task 03: Churn Save Discount Clamping"]
        T4["Task 04: Prompt Injection Defense"]
    end

    subgraph RUNNER["Monte Carlo Multi-Trial Execution"]
        TRIALS["20 Stochastic Trials per Task"]
        VOICE_SYS["GrowthVoice OS Target System"]
        TRIALS --> VOICE_SYS
    end

    TASKS --> RUNNER

    subgraph GRADERS["Dual Layer Evaluation Architecture"]
        DET_GRADERS["1. Deterministic Rule Graders<br/>• Schema Validation (JSON)<br/>• State Mutation in CRM<br/>• Hard Policy Limit Check"]
        JUDGE["2. DeepSeek-R1 Model-as-a-Judge<br/>• Chain-of-Thought Grading<br/>• Semantic Policy Alignment<br/>• Conversational Empathy"]
    end

    VOICE_SYS --> DET_GRADERS
    VOICE_SYS --> JUDGE

    subgraph METRICS["Statistical Aggregator & Scorecard"]
        PASS_AT_K["pass@k (k=5): 100.0%<br/><i>Probability of at least 1 success</i>"]
        PASS_TO_K["pass^k (k=5): 88.4%<br/><i>Strict consistency across ALL 5 trials</i>"]
        LATENCY["Latency Telemetry<br/>• TTFA: 410ms<br/>• Turn p95: 1,450ms"]
    end

    DET_GRADERS --> METRICS
    JUDGE --> METRICS
```

---

## 7. Deterministic Policy Clamping State Machine

```mermaid
stateDiagram-v2
    [*] --> InboundDemand: Member demands "35% Discount or Cancel"
    
    state "Autonomous SDR Analysis" as SDR {
        InboundDemand --> SentimentAnalysis: Detect Churn Risk
        SentimentAnalysis --> LLMProposal: Model Proposes 35% Concession
    }

    state "Deterministic Guardrail Interceptor" as Guardrail {
        LLMProposal --> CheckPolicyCeiling: evaluate(requestedDiscount > MAX_DISCOUNT_15)
        CheckPolicyCeiling --> ClampEnforced: Clamp discount to 15.0%
        ClampEnforced --> AddValueBonus: Inject "1-on-1 Growth Audit Call"
    }

    state "CRM & Verbal Response" as Output {
        AddValueBonus --> SpokenOffer: Voice Agent delivers empathetic clamped offer
        SpokenOffer --> CRMUpdate: Member marked "active_retained" with 15% discount
    }

    CRMUpdate --> [*]: Revenue Protected & Churn Averted
```

---

## 8. Docker Infrastructure & Microservices Isolation

```mermaid
graph TD
    subgraph HOST_MACHINE["Host Machine (macOS / Linux)"]
        BROWSER["Web Browser (:3000)"]
        LOCAL_VAULT["Local Obsidian Vault (./vault)"]
        LOCAL_DATA["Local Graph Store (./data)"]
        LOCAL_GFY["Graphify Reports (./graphify-out)"]
    end

    subgraph DOCKER_ENGINE["Docker Daemon Substrate"]
        subgraph BRIDGE_NET["Isolated Docker Bridge Network: voice-net"]
            
            subgraph WEB_CONTAINER["Container: voice-web-console (:3000)"]
                NGINX["Nginx Alpine Engine"]
                STATIC["Pre-built React 18 SPA (Vite)"]
                NGINX --- STATIC
            end

            subgraph ORCH_CONTAINER["Container: voice-orchestrator (:4000)"]
                NODE["Node.js 20 LTS Runtime"]
                EXPRESS["Express REST Engine"]
                WSS["WebSocket Server (/ws/telemetry)"]
                GRAPH_SVC["GraphDatabaseService"]
                NODE --- EXPRESS
                NODE --- WSS
                NODE --- GRAPH_SVC
            end

            subgraph REDIS_CONTAINER["Container: voice-redis-cache (:6379)"]
                REDIS["Redis 7 Alpine Engine"]
                R_VOL[("Internal Volume: redis-data")]
                REDIS --- R_VOL
            end

        end
    end

    %% Port Mappings
    BROWSER -->|HTTP / WS :3000| NGINX
    NGINX -->|Reverse Proxy /api| EXPRESS
    NGINX -->|Reverse Proxy /ws| WSS
    EXPRESS <-->|ioredis :6379| REDIS

    %% Volume Mappings
    LOCAL_DATA <-->|Bind Mount| ORCH_CONTAINER
    LOCAL_VAULT <-->|Bind Mount| ORCH_CONTAINER
    LOCAL_GFY <-->|Bind Mount| ORCH_CONTAINER
```

---

## 9. Synaptic Cognitive Agent Mesh

```mermaid
graph TD
    subgraph SENSORY_AFFERENT["Sensory & Perceptual Cortex"]
        ACOUSTIC["🎙️ 24kHz Mono PCM16 Stream"]
        ASR_PERCEPT["⚡ AssemblyAI Universal-3.5 Pro<br/>• Real-Time Tokenized Transcripts<br/>• Phonetic Turn Boundary Detection"]
        ACOUSTIC --> ASR_PERCEPT
    end

    subgraph SYNAPTIC_CORE["Central Cognitive Synapse Router"]
        ROUTER["🧠 Central Synaptic Orchestrator"]
        REASONER["🔬 DeepSeek-R1 Cognitive Core<br/>• Chain-of-Thought Reflection<br/>• Intent Disambiguation<br/>• Safety & Policy Arbitration"]
        ROUTER <--> REASONER
    end

    ASR_PERCEPT -->|Sensory Ingestion| ROUTER

    subgraph MEMORY_FABRIC["Synaptic Memory & Association Mesh"]
        ST_MEM[("⚡ Short-Term Working Memory<br/>(Redis 7 Ephemeral Session Cache)")]
        LT_MEM[("🌐 Long-Term Associative Graph<br/>(18-Node Knowledge Graph & Obsidian Vault)<br/>• [[Leads]] • [[Objections]] • [[Content-Packs]]")]
        ROUTER <--> ST_MEM
        ROUTER <--> LT_MEM
    end

    subgraph EFFERENT_MOTOR["Effector & Actuator Motor Layer"]
        TOOL_CRM["💼 CRM Tool Actuator<br/>create_or_update_lead & qualify_lead"]
        TOOL_CAL["📅 Calendar Actuator<br/>schedule_growth_consultation"]
        TOOL_GUARD["🛡️ Guardrail Clamping Actuator<br/>process_retention_offer (≤15%)"]
        ROUTER --> TOOL_CRM
        ROUTER --> TOOL_CAL
        ROUTER --> TOOL_GUARD
    end

    subgraph GENERATIVE_CORTEX["Generative Syndication Cortex (Hermes Engine)"]
        FACTORY["⚙️ Hermes Autonomous Content Factory"]
        LANE_RAG["Creator Offer RAG"]
        LANE_TRENDS["Market Trends"]
        LANE_OBJ["Community Analytics"]
        HEAL_REFLEX["🔄 Self-Healing Reflex Loop (≤280 Chars)"]
        SYNDICATE["📣 Multi-Channel Output<br/>• X Thread • Newsletter • Webinar"]

        ROUTER -->|Async Trigger| FACTORY
        FACTORY --> LANE_RAG & LANE_TRENDS & LANE_OBJ
        LANE_RAG & LANE_TRENDS & LANE_OBJ --> HEAL_REFLEX --> SYNDICATE
    end
```
