const fs = require('fs');
const path = require('path');

const dataDir = path.resolve(__dirname, '..', 'data');
const vaultDir = path.resolve(__dirname, '..', 'vault');
const graphifyOutDir = path.resolve(__dirname, '..', 'graphify-out');

[dataDir, vaultDir, graphifyOutDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Graph Database Seed Data
const nodes = [
  // Offers
  {
    id: 'offer_pro_mentorship',
    label: 'Pro Mentorship ($2,997)',
    type: 'Offer',
    properties: { price: 2997, paymentPlan: '497/mo', format: 'Cohort + 1-on-1 Mentorship', tier: 'growth' }
  },
  {
    id: 'offer_vip_mastermind',
    label: 'VIP Mastermind ($7,500)',
    type: 'Offer',
    properties: { price: 7500, monthlyFee: 997, format: 'Private 1-on-1 + Retreats', tier: 'executive' }
  },

  // Guardrail Policies
  {
    id: 'policy_max_discount_15',
    label: 'Guardrail: Max 15% Autonomous Discount',
    type: 'GuardrailPolicy',
    properties: {
      maxDiscountPercent: 15,
      enforcement: 'deterministic_clamp',
      description: 'Enforces hard ceiling on autonomous discount concession during retention negotiations.'
    }
  },
  {
    id: 'policy_pii_redaction',
    label: 'Guardrail: Real-Time PII Masking',
    type: 'GuardrailPolicy',
    properties: { rules: ['credit_card_masking', 'ssn_masking', 'phone_masking'], active: true }
  },

  // Voice Sessions
  {
    id: 'session_inbound_jason',
    label: 'Voice Call: Jason Miller (After-Hours Inbound SDR)',
    type: 'VoiceSession',
    properties: {
      persona: 'inbound_sdr',
      durationSeconds: 142,
      sentiment: 'high_intent',
      audioFormat: '24kHz_mono_pcm16',
      asrEngine: 'universal-3-5-pro',
      vadBargeInDelayMs: 45
    }
  },
  {
    id: 'session_retention_sarah',
    label: 'Voice Call: Sarah Jenkins (Churn Save & Retention)',
    type: 'VoiceSession',
    properties: {
      persona: 'churn_retention',
      durationSeconds: 198,
      sentiment: 'retained',
      audioFormat: '24kHz_mono_pcm16',
      asrEngine: 'universal-3-5-pro',
      outcome: 'retained_clamped_15_percent'
    }
  },

  // CRM Leads & Members
  {
    id: 'lead_jason_miller',
    label: 'Lead: Jason Miller',
    type: 'Lead',
    properties: {
      email: 'jason.m@designacademy.io',
      communitySize: 15000,
      budget: '5k_to_15k',
      bantScore: 85,
      stage: 'call_scheduled',
      consultationSlot: 'Tomorrow at 2:00 PM EST',
      bookingCode: 'GROWTH-8271'
    }
  },
  {
    id: 'member_sarah_jenkins',
    label: 'Member: Sarah Jenkins',
    type: 'Member',
    properties: {
      memberId: 'mem_101',
      email: 'sarah.j@example.com',
      tier: 'vip_mastermind',
      monthlyFee: 997,
      status: 'active_retained',
      discountGrantedPercent: 15,
      bonusGranted: '1-on-1 Growth Audit Call'
    }
  },

  // Objections
  {
    id: 'obj_cashflow_tight',
    label: 'Objection: Cash Flow Tight (35% Discount Requested)',
    type: 'Objection',
    properties: {
      category: 'pricing_cashflow',
      verbatim: 'I love the mastermind, but my cash flow is tight this month. Can you give me a 35% discount or I will have to cancel?',
      resolutionPolicy: 'policy_max_discount_15'
    }
  },
  {
    id: 'obj_pricing_guarantee',
    label: 'Objection: Price vs Risk (Zero Audience Fear)',
    type: 'Objection',
    properties: {
      category: 'risk_reversal',
      verbatim: 'Will this work if I am starting from zero audience and haven’t launched high-ticket before?',
      resolution: '14_day_action_guarantee'
    }
  },

  // Research Lanes
  {
    id: 'lane_creator_rag',
    label: 'Research Lane: Creator Internal Offer RAG',
    type: 'ResearchLane',
    properties: {
      lane: 'creator_rag',
      sourceTitle: 'Creator Accelerator Pricing Tiers',
      relevanceScore: 0.96,
      excerpt: 'Self-Paced Sprint at $997, Pro Mentorship at $2,997 ($497/mo), Elite Mastermind at $7,500.'
    }
  },
  {
    id: 'lane_market_trends',
    label: 'Research Lane: Industry Benchmarks & Funnels',
    type: 'ResearchLane',
    properties: {
      lane: 'market_trends',
      sourceTitle: 'State of Digital Education 2026',
      relevanceScore: 0.89,
      excerpt: 'Action-based refund guarantees achieve 4.2x higher course completion rates.'
    }
  },
  {
    id: 'lane_community_objections',
    label: 'Research Lane: Student Voice Call Analytics',
    type: 'ResearchLane',
    properties: {
      lane: 'community_objections',
      sourceTitle: 'Student Inbound Voice Call Analytics (Last 90 Days)',
      relevanceScore: 0.94,
      excerpt: 'Top objection: Will this work if I am starting from zero audience?'
    }
  },

  // Content Pack
  {
    id: 'pack_cf_101',
    label: 'Content Pack: Tough Pricing Objections & 14-Day Guarantee',
    type: 'ContentPack',
    properties: {
      jobId: 'job_cf_101',
      thesis: 'High-ticket buyers do not buy information; they buy risk removal and speed of implementation.',
      status: 'needs_approval',
      synthesisModel: 'DeepSeek-R1',
      tokenCost: 0.032,
      inputTokens: 1420,
      outputTokens: 890
    }
  },

  // Assets
  {
    id: 'asset_x_thread',
    label: 'X Thread (5 Tweets)',
    type: 'Asset',
    properties: {
      channel: 'twitter',
      tweetCount: 5,
      maxLengthConstraint: 280,
      verifiedLength: true,
      hook: 'Most creators fail at high-ticket because they sell knowledge, not risk reversal.'
    }
  },
  {
    id: 'asset_newsletter',
    label: 'Newsletter: The 3-Sentence Reframe',
    type: 'Asset',
    properties: {
      channel: 'email',
      subject: 'The 3-Sentence Reframe That Closed $42,000 in Digital Products',
      cta: 'Book your 1-on-1 Growth Audit Call',
      status: 'ready'
    }
  },
  {
    id: 'asset_webinar_script',
    label: 'Webinar Pitch Script & Risk Reversal',
    type: 'Asset',
    properties: {
      channel: 'webinar_pitch',
      targetDurationMinutes: 15,
      coreGuarantee: '14-day action-based refund guarantee',
      status: 'ready'
    }
  },

  // Self-Healing Event
  {
    id: 'heal_tweet_3_length',
    label: 'Self-Healing Event: Tweet #3 Length Truncation',
    type: 'SelfHealingEvent',
    properties: {
      rule: 'tweet_length_exceeded_280',
      initialLength: 312,
      healedLength: 234,
      healedSuccessfully: true,
      reasoningEngine: 'DeepSeek-R1',
      summary: 'Autonomous prompt mutation tightened redundant adjectives down to 234 chars.'
    }
  }
];

const edges = [
  { id: 'e1', source: 'session_inbound_jason', target: 'lead_jason_miller', type: 'QUALIFIED_AS', label: 'BANT Score 85' },
  { id: 'e2', source: 'lead_jason_miller', target: 'offer_pro_mentorship', type: 'ASSOCIATED_WITH', label: 'Matched Tier' },
  { id: 'e3', source: 'session_retention_sarah', target: 'obj_cashflow_tight', type: 'RAISED_OBJECTION', label: 'Cash Flow Tight' },
  { id: 'e4', source: 'session_retention_sarah', target: 'policy_max_discount_15', type: 'TRIGGERED_POLICY', label: 'Clamped 35% to 15%' },
  { id: 'e5', source: 'obj_cashflow_tight', target: 'member_sarah_jenkins', type: 'ASSOCIATED_WITH', label: 'Member Retained' },
  { id: 'e6', source: 'obj_pricing_guarantee', target: 'lane_creator_rag', type: 'RESEARCHED_IN', label: 'Relevance 0.96' },
  { id: 'e7', source: 'obj_pricing_guarantee', target: 'lane_market_trends', type: 'RESEARCHED_IN', label: 'Relevance 0.89' },
  { id: 'e8', source: 'obj_pricing_guarantee', target: 'lane_community_objections', type: 'RESEARCHED_IN', label: 'Relevance 0.94' },
  { id: 'e9', source: 'lane_creator_rag', target: 'pack_cf_101', type: 'SYNTHESIZED_INTO' },
  { id: 'e10', source: 'lane_market_trends', target: 'pack_cf_101', type: 'SYNTHESIZED_INTO' },
  { id: 'e11', source: 'lane_community_objections', target: 'pack_cf_101', type: 'SYNTHESIZED_INTO' },
  { id: 'e12', source: 'pack_cf_101', target: 'asset_x_thread', type: 'CONTAINS_ASSET' },
  { id: 'e13', source: 'pack_cf_101', target: 'asset_newsletter', type: 'CONTAINS_ASSET' },
  { id: 'e14', source: 'pack_cf_101', target: 'asset_webinar_script', type: 'CONTAINS_ASSET' },
  { id: 'e15', source: 'asset_x_thread', target: 'heal_tweet_3_length', type: 'HEALED_BY', label: '312 -> 234 chars' }
];

// 1. Export JSON Graph
const jsonDbPath = path.join(dataDir, 'knowledge_graph.json');
fs.writeFileSync(jsonDbPath, JSON.stringify({ updatedAt: new Date().toISOString(), nodes, edges }, null, 2), 'utf-8');
console.log(`[Graph Export] Saved JSON database to ${jsonDbPath}`);

// 2. Export Cypher DDL (Neo4j / FalkorDB)
const cypherLines = [
  '// GrowthVoice OS Knowledge Graph Cypher DDL/DML Export',
  `// Generated at: ${new Date().toISOString()}`,
  ''
];
for (const node of nodes) {
  const sanitizedProps = JSON.stringify(node.properties).replace(/"(\w+)":/g, '$1:');
  cypherLines.push(`MERGE (n:${node.type} {id: "${node.id}"}) SET n.label = "${node.label.replace(/"/g, '\\"')}", n += ${sanitizedProps};`);
}
cypherLines.push('');
for (const edge of edges) {
  cypherLines.push(`MATCH (s {id: "${edge.source}"}), (t {id: "${edge.target}"}) MERGE (s)-[r:${edge.type} {label: "${edge.label || ''}"}]->(t);`);
}
const cypherPath = path.join(dataDir, 'knowledge_graph.cypher');
fs.writeFileSync(cypherPath, cypherLines.join('\n'), 'utf-8');
console.log(`[Graph Export] Saved Cypher script to ${cypherPath}`);

// 3. Export GraphML (Gephi / Cytoscape)
const graphmlLines = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<graphml xmlns="http://graphml.graphdrawing.org/xmlns"',
  '    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
  '    xsi:schemaLocation="http://graphml.graphdrawing.org/xmlns http://graphml.graphdrawing.org/xmlns/1.0/graphml.xsd">',
  '  <key id="label" for="node" attr.name="label" attr.type="string"/>',
  '  <key id="type" for="node" attr.name="type" attr.type="string"/>',
  '  <key id="edge_type" for="edge" attr.name="edge_type" attr.type="string"/>',
  '  <graph id="GrowthVoiceOS_KnowledgeGraph" edgedefault="directed">'
];
for (const node of nodes) {
  graphmlLines.push(`    <node id="${node.id}">`);
  graphmlLines.push(`      <data key="label">${node.label.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</data>`);
  graphmlLines.push(`      <data key="type">${node.type}</data>`);
  graphmlLines.push(`    </node>`);
}
for (const edge of edges) {
  graphmlLines.push(`    <edge id="${edge.id}" source="${edge.source}" target="${edge.target}">`);
  graphmlLines.push(`      <data key="edge_type">${edge.type}</data>`);
  graphmlLines.push(`    </edge>`);
}
graphmlLines.push('  </graph>', '</graphml>');
const graphmlPath = path.join(dataDir, 'knowledge_graph.graphml');
fs.writeFileSync(graphmlPath, graphmlLines.join('\n'), 'utf-8');
console.log(`[Graph Export] Saved GraphML to ${graphmlPath}`);

// 4. Export Obsidian Vault
const subfolders = ['Leads', 'Members', 'Voice-Sessions', 'Objections', 'Content-Packs', 'Assets', 'Self-Healing', 'Policies'];
subfolders.forEach((f) => {
  const p = path.join(vaultDir, f);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

// Index.md (Map of Content MOC)
const indexContent = `---
title: GrowthVoice OS Knowledge Graph Vault
date: ${new Date().toISOString().split('T')[0]}
tags:
  - moc
  - growth-voice-os
  - voice-ai
  - assemblyai
  - deepseek
cssclasses:
  - dashboard
---

# 🎙️ GrowthVoice OS — Knowledge & Revenue Graph

Welcome to the **GrowthVoice OS** persistent vault. This vault connects real-time **AssemblyAI** voice interactions with autonomous **DeepSeek-R1** content synthesis, CRM lead qualification, and self-healing business guardrails.

> [!important] Autonomous Operating System
> Voice conversations are immediately parsed into **BANT qualifications**, **pricing objections**, and **multi-channel content marketing packs** with deterministic guardrails preventing unauthorized discounting.

## 📊 Live System Topology (Mermaid)

\`\`\`mermaid
graph TD
    VS["🎙️ Voice Session (AssemblyAI)"] -->|QUALIFIED_AS| L["👤 Lead: Jason Miller ($10k)"]
    VS -->|RAISED_OBJECTION| O["⚠️ Objection: Cash Flow Tight"]
    VS -->|TRIGGERED_POLICY| P["🛡️ Guardrail: 15% Max Discount"]
    O -->|RESEARCHED_IN| RL["🔬 3 Parallel Research Lanes"]
    RL -->|SYNTHESIZED_INTO| CP["📦 Content Pack: 14-Day Guarantee"]
    CP -->|CONTAINS_ASSET| A1["🐦 X Thread (5 Tweets)"]
    CP -->|CONTAINS_ASSET| A2["📧 Newsletter"]
    CP -->|CONTAINS_ASSET| A3["🎬 Webinar Script"]
    A1 -->|HEALED_BY| SH["🔄 Self-Healing (Length Fix)"]
\`\`\`

## 🗂️ Knowledge Vault Sections

- [[Leads/lead_jason_miller|Lead: Jason Miller]] — Score 85, $5k-$15k budget, booked for consultation.
- [[Members/member_sarah_jenkins|Member: Sarah Jenkins]] — Retained mastermind member, 15% clamped discount applied.
- [[Voice-Sessions/session_inbound_jason|Voice Session: Inbound Jason]] — AssemblyAI 24kHz stream transcript & telemetry.
- [[Objections/obj_cashflow_tight|Objection: Cash Flow Tight]] — Churn risk objection and policy resolution.
- [[Content-Packs/pack_cf_101|Content Pack: 14-Day Guarantee]] — DeepSeek-R1 synthesized multi-asset marketing pack.
- [[Self-Healing/heal_tweet_3_length|Self-Healing: Tweet 3 Length]] — Autonomous self-repair audit log (312 -> 234 chars).
- [[Policies/policy_max_discount_15|Policy: Max 15 Percent Discount]] — Deterministic business guardrail rule.

## 📈 Graph Statistics
- **Total Nodes:** ${nodes.length}
- **Total Edges:** ${edges.length}
- **Updated:** \`${new Date().toISOString()}\`
`;
fs.writeFileSync(path.join(vaultDir, 'Index.md'), indexContent, 'utf-8');

// Generate Individual Node Markdown Files
for (const node of nodes) {
  let folder = 'Other';
  if (node.type === 'Lead') folder = 'Leads';
  else if (node.type === 'Member') folder = 'Members';
  else if (node.type === 'VoiceSession') folder = 'Voice-Sessions';
  else if (node.type === 'Objection') folder = 'Objections';
  else if (node.type === 'ContentPack' || node.type === 'ResearchLane') folder = 'Content-Packs';
  else if (node.type === 'Asset') folder = 'Assets';
  else if (node.type === 'SelfHealingEvent') folder = 'Self-Healing';
  else if (node.type === 'GuardrailPolicy' || node.type === 'Offer') folder = 'Policies';

  const outgoing = edges.filter((e) => e.source === node.id);
  const incoming = edges.filter((e) => e.target === node.id);

  const frontmatter = [
    '---',
    `id: "${node.id}"`,
    `title: "${node.label}"`,
    `type: "${node.type}"`,
    `date: "${new Date().toISOString().split('T')[0]}"`,
    'tags:',
    `  - ${node.type.toLowerCase()}`,
    '  - growth-voice-os'
  ];

  for (const [k, v] of Object.entries(node.properties)) {
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      frontmatter.push(`${k}: ${JSON.stringify(v)}`);
    }
  }
  frontmatter.push('---', '');

  const body = [
    ...frontmatter,
    `# ${node.label}`,
    '',
    `> [!info] Node Metadata`,
    `> **Type:** \`${node.type}\` | **ID:** \`${node.id}\``,
    '',
    '## Properties',
    '',
    '| Property | Value |',
    '| :--- | :--- |'
  ];

  for (const [k, v] of Object.entries(node.properties)) {
    const valStr = typeof v === 'object' ? JSON.stringify(v) : String(v);
    body.push(`| **${k}** | \`${valStr}\` |`);
  }
  body.push('');

  if (outgoing.length > 0) {
    body.push('## Outgoing Relationships', '');
    for (const e of outgoing) {
      const targetNode = nodes.find((n) => n.id === e.target);
      const targetLabel = targetNode ? targetNode.label : e.target;
      body.push(`- **-[:${e.type}]->** [[${e.target}|${targetLabel}]] ${e.label ? `_(${e.label})_` : ''}`);
    }
    body.push('');
  }

  if (incoming.length > 0) {
    body.push('## Incoming Relationships', '');
    for (const e of incoming) {
      const sourceNode = nodes.find((n) => n.id === e.source);
      const sourceLabel = sourceNode ? sourceNode.label : e.source;
      body.push(`- **<-[:${e.type}]-** [[${e.source}|${sourceLabel}]] ${e.label ? `_(${e.label})_` : ''}`);
    }
    body.push('');
  }

  fs.writeFileSync(path.join(vaultDir, folder, `${node.id}.md`), body.join('\n'), 'utf-8');
}
console.log(`[Obsidian Export] Generated ${nodes.length + 1} vault markdown notes in ${vaultDir}`);

// 5. Generate Graphify Extraction File
const graphifyExtract = {
  nodes: nodes.map((n) => ({
    id: n.id,
    label: n.label,
    source_file: `vault/${n.type}/${n.id}.md`
  })),
  edges: edges.map((e) => ({
    source: e.source,
    target: e.target,
    relation: e.type,
    confidence: 1.0,
    source_file: `vault/${e.source}.md`,
    source_location: `vault/${e.source}.md`
  })),
  hyperedges: [],
  input_tokens: 0,
  output_tokens: 0
};
fs.writeFileSync(path.join(graphifyOutDir, '.graphify_extract.json'), JSON.stringify(graphifyExtract, null, 2), 'utf-8');
console.log(`[Graphify] Prepared extraction at ${path.join(graphifyOutDir, '.graphify_extract.json')}`);
