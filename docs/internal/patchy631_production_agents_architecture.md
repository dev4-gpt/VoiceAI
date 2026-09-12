# 🧠 patchy631/ai-engineering-hub Production Agents & Cindy Zhu Scroll Architecture

> **Internal / historical document.** Kept for reference; it reflects plans or
> research at the time it was written, not the current product. For what the code
> does today, see the [README](../../README.md) and the status table in
> [CLAUDE.md](../../CLAUDE.md).


This document synthesizes key architectural patterns from [`patchy631/ai-engineering-hub`](https://github.com/patchy631/ai-engineering-hub) and details the implementation of the **Cindy Zhu 5k Scroll Animation & 3D Depth Engine** ([Cindy Zhu Guide Reference](https://cindyzhu.com.au/guides/5k-scroll-animation)).

---

## 1. Production Agents Breakdown (`patchy631/ai-engineering-hub`)

The `patchy631/ai-engineering-hub` repository contains **93+ battle-tested AI engineering projects**. Below is an exhaustive audit of the key production agents that directly map to the **GrowthVoice OS** infrastructure:

### A. Conversational Voice & Real-Time Telephony Agents
1. **`mcp-voice-agent` & `rag-voice-agent`**:
   - **Core Innovation**: Decouples Voice Activity Detection (VAD) / Speech-to-Text (AssemblyAI) from LLM tool execution using Model Context Protocol (MCP).
   - **Application in GrowthVoice OS**: When Anna detects an inbound objection or prospect intent, she triggers local MCP tools (`query_knowledge_vault`, `calculate_leakage`, `schedule_strategy_call`) with zero network hopping.
2. **`real-time-voicebot` & `multimodal-rag-assemblyai`**:
   - **Core Innovation**: Asynchronous streaming pipeline with ultra-low latency chunking (<350ms TTFB) and audio frame indexing.
   - **Application in GrowthVoice OS**: Powers our duplex WebRTC/WebSocket audio pipeline, keeping agent interruption delays strictly under 50ms.

### B. Observability, Evaluation & Reliability Engines
3. **`eval-and-observability`**:
   - **Core Innovation**: Full automated test harness measuring both non-deterministic LLM output and deterministic JSON schemas using pass@k and pass^k reliability metrics.
   - **Application in GrowthVoice OS**: Implemented in our **Anthropic Evals Dashboard**, tracking TTFA (410ms), p95 turn latency (1,450ms), and 5-trial pass rates across BANT qualification, objection handling, and prompt injection defense.
4. **`guidelines-vs-traditional-prompt` & `build-code-harness`**:
   - **Core Innovation**: Enforces structured system prompt contracts with negative constraints and validation checkpoints.
   - **Application in GrowthVoice OS**: Drives our Anti-Slop verification filter, rejecting cliché terms and enforcing high-ticket conversational tone.

### C. Persistent Memory, Temporal Knowledge Graphs & GraphRAG
5. **`graphiti-mcp` & `database-memory-agent`**:
   - **Core Innovation**: In-memory temporal knowledge graph storing dynamic entity-relationship edges (e.g. `Client -> Lead -> Objection -> Offer`) with fast query traversal.
   - **Application in GrowthVoice OS**: Powers `data/knowledge_graph.json`, our FalkorDB/Cypher exporters, and the interactive 3D node network.
6. **`zep-memory-assistant` & `agent-with-mcp-memory`**:
   - **Core Innovation**: Episodic and semantic summary compression, allowing agents to remember user preferences across sessions without context window overflow.
   - **Application in GrowthVoice OS**: Stored in `data/local_profile.json` to keep client dossiers persistent and air-gapped on the local machine.

### D. Multi-Channel Content Factory & Inbound Discovery
7. **`motia-content-creation` & `content_planner_flow`**:
   - **Core Innovation**: Multi-stage research pipelines that take a core thesis, split it into 3 parallel research lanes, and synthesize format-specific assets (X threads, newsletters, webinars).
   - **Application in GrowthVoice OS**: Direct architecture for **Hermes Content Factory Studio**, generating customized inbound audits and multi-channel outreach deliverables.
8. **`Website-to-API-with-FireCrawl` & `firecrawl-agent`**:
   - **Core Innovation**: Autonomous web crawler that transforms raw founder URLs into structured JSON schemas and value props.
   - **Application in GrowthVoice OS**: Integrated into `services/scraper.js` and `r.jina.ai` extraction for the Dossier modal.

---

## 2. Cindy Zhu 5k Scroll Animation & 3D Depth Engine Architecture

Reference: [Build a $5k scroll animation with zero code · Cindy Zhu](https://cindyzhu.com.au/guides/5k-scroll-animation)

### The Core Technique
1. **The Principle**: Instead of scrubbing a video element (which stutters and decodes erratically), Apple and high-end agency sites paint frame-accurate image sequences onto an HTML5 Canvas tied directly to `window.scrollY`.
2. **The Flow / AI Pipeline**:
   - **Step 1 (Start & End Frames)**: Generate matching start (assembled product) and end (exploded 3D view) frames using Google Flow / Whisk with identical lighting, angle, and camera perspective.
   - **Step 2 (In-Between Interpolation)**: Run Google Flow **Frames to Video: First + Last** to interpolate smooth motion.
   - **Step 3 (Slicing)**: Convert video to 30fps image sequence (e.g. 120-240 frames).
   - **Step 4 (Canvas Scrubbing)**: A canvas renders `images[currentFrame]` calculated from:
     $$\text{frameIndex} = \lfloor (\text{scrollFraction}) \times (\text{totalFrames} - 1) \rfloor$$

### GrowthVoice OS Native 3D Depth Integration
Rather than requiring static raster images, GrowthVoice OS achieves **true real-time GPU 3D camera depth navigation**:
1. **Interactive 3D Camera Zoom (Z-Axis Depth)**:
   - Users can toggle **"3D Spatial Mode"** or scroll to drive the camera into the interface.
   - Perspective projection transforms flat 2D cards into floating glassmorphic planes tilted along the Z-axis (`translateZ`, `perspective: 1200px`, `rotateX`).
2. **GPU WebGL Shaders**:
   - The **3D Neural Audio Orb** and **Vercel Ambient Cyber Grid** run entirely on hardware GPU buffers at 60 FPS, responding dynamically to voice activity, audio frequencies, and cursor hover coordinates.
