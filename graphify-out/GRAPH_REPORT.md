# Graph Report - VoiceAI  (2026-09-06)

## Corpus Check
- 19 files · ~4,200 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 18 nodes · 15 edges · 6 communities (3 shown, 3 thin omitted)
- Extraction: 0% EXTRACTED · 100% INFERRED · 0% AMBIGUOUS · INFERRED: 15 edges (avg confidence: 1.0)
- Token cost: 1,420 input · 890 output

## Community Hubs (Navigation)
- Revenue & BANT Lead Funnel
- Objections & Policy Guardrails
- Hermes Multi-Channel Content Factory
- Autonomous Self-Healing Loop
- Community 4
- Community 5

## God Nodes (most connected - your core abstractions)
1. `Content Pack: Tough Pricing Objections & 14-Day Guarantee` - 6 edges
2. `Objection: Price vs Risk (Zero Audience Fear)` - 3 edges
3. `Voice Call: Sarah Jenkins (Churn Save & Retention)` - 2 edges
4. `Lead: Jason Miller` - 2 edges
5. `Objection: Cash Flow Tight (35% Discount Requested)` - 2 edges
6. `Research Lane: Creator Internal Offer RAG` - 2 edges
7. `Research Lane: Industry Benchmarks & Funnels` - 2 edges
8. `Research Lane: Student Voice Call Analytics` - 2 edges
9. `X Thread (5 Tweets)` - 2 edges
10. `Pro Mentorship ($2,997)` - 1 edges

## Surprising Connections (you probably didn't know these)
- `Content Pack: Tough Pricing Objections & 14-Day Guarantee` --CONTAINS_ASSET--> `X Thread (5 Tweets)`  [INFERRED]
  vault/ContentPack/pack_cf_101.md → vault/Asset/asset_x_thread.md
- `Research Lane: Creator Internal Offer RAG` --SYNTHESIZED_INTO--> `Content Pack: Tough Pricing Objections & 14-Day Guarantee`  [INFERRED]
  vault/ResearchLane/lane_creator_rag.md → vault/ContentPack/pack_cf_101.md
- `Research Lane: Industry Benchmarks & Funnels` --SYNTHESIZED_INTO--> `Content Pack: Tough Pricing Objections & 14-Day Guarantee`  [INFERRED]
  vault/ResearchLane/lane_market_trends.md → vault/ContentPack/pack_cf_101.md
- `Research Lane: Student Voice Call Analytics` --SYNTHESIZED_INTO--> `Content Pack: Tough Pricing Objections & 14-Day Guarantee`  [INFERRED]
  vault/ResearchLane/lane_community_objections.md → vault/ContentPack/pack_cf_101.md
- `Content Pack: Tough Pricing Objections & 14-Day Guarantee` --CONTAINS_ASSET--> `Newsletter: The 3-Sentence Reframe`  [INFERRED]
  vault/ContentPack/pack_cf_101.md → vault/Asset/asset_newsletter.md

## Communities (6 total, 3 thin omitted)

### Community 0 - "Revenue & BANT Lead Funnel"
Cohesion: 0.38
Nodes (7): Newsletter: The 3-Sentence Reframe, Webinar Pitch Script & Risk Reversal, Content Pack: Tough Pricing Objections & 14-Day Guarantee, Objection: Price vs Risk (Zero Audience Fear), Research Lane: Student Voice Call Analytics, Research Lane: Creator Internal Offer RAG, Research Lane: Industry Benchmarks & Funnels

### Community 1 - "Objections & Policy Guardrails"
Cohesion: 0.50
Nodes (4): Guardrail: Max 15% Autonomous Discount, Member: Sarah Jenkins, Objection: Cash Flow Tight (35% Discount Requested), Voice Call: Sarah Jenkins (Churn Save & Retention)

### Community 2 - "Hermes Multi-Channel Content Factory"
Cohesion: 0.67
Nodes (3): Lead: Jason Miller, Pro Mentorship ($2,997), Voice Call: Jason Miller (After-Hours Inbound SDR)

## Knowledge Gaps
- **9 isolated node(s):** `Pro Mentorship ($2,997)`, `VIP Mastermind ($7,500)`, `Guardrail: Max 15% Autonomous Discount`, `Guardrail: Real-Time PII Masking`, `Voice Call: Jason Miller (After-Hours Inbound SDR)` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 9 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Content Pack: Tough Pricing Objections & 14-Day Guarantee` connect `Revenue & BANT Lead Funnel` to `Autonomous Self-Healing Loop`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `Content Pack: Tough Pricing Objections & 14-Day Guarantee` (e.g. with `Newsletter: The 3-Sentence Reframe` and `Webinar Pitch Script & Risk Reversal`) actually correct?**
  _`Content Pack: Tough Pricing Objections & 14-Day Guarantee` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `Objection: Price vs Risk (Zero Audience Fear)` (e.g. with `Research Lane: Student Voice Call Analytics` and `Research Lane: Creator Internal Offer RAG`) actually correct?**
  _`Objection: Price vs Risk (Zero Audience Fear)` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `Voice Call: Sarah Jenkins (Churn Save & Retention)` (e.g. with `Guardrail: Max 15% Autonomous Discount` and `Objection: Cash Flow Tight (35% Discount Requested)`) actually correct?**
  _`Voice Call: Sarah Jenkins (Churn Save & Retention)` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Pro Mentorship ($2,997)`, `VIP Mastermind ($7,500)`, `Guardrail: Max 15% Autonomous Discount` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._