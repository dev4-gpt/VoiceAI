// GrowthVoice OS Knowledge Graph Cypher DDL/DML Export
// Generated at: 2026-09-06T23:28:24.125Z

MERGE (n:Offer {id: "offer_pro_mentorship"}) SET n.label = "Pro Mentorship ($2,997)", n += {price:2997,paymentPlan:"497/mo",format:"Cohort + 1-on-1 Mentorship",tier:"growth"};
MERGE (n:Offer {id: "offer_vip_mastermind"}) SET n.label = "VIP Mastermind ($7,500)", n += {price:7500,monthlyFee:997,format:"Private 1-on-1 + Retreats",tier:"executive"};
MERGE (n:GuardrailPolicy {id: "policy_max_discount_15"}) SET n.label = "Guardrail: Max 15% Autonomous Discount", n += {maxDiscountPercent:15,enforcement:"deterministic_clamp",description:"Enforces hard ceiling on autonomous discount concession during retention negotiations."};
MERGE (n:GuardrailPolicy {id: "policy_pii_redaction"}) SET n.label = "Guardrail: Real-Time PII Masking", n += {rules:["credit_card_masking","ssn_masking","phone_masking"],active:true};
MERGE (n:VoiceSession {id: "session_inbound_jason"}) SET n.label = "Voice Call: Jason Miller (After-Hours Inbound SDR)", n += {persona:"inbound_sdr",durationSeconds:142,sentiment:"high_intent",audioFormat:"24kHz_mono_pcm16",asrEngine:"universal-3-5-pro",vadBargeInDelayMs:45};
MERGE (n:VoiceSession {id: "session_retention_sarah"}) SET n.label = "Voice Call: Sarah Jenkins (Churn Save & Retention)", n += {persona:"churn_retention",durationSeconds:198,sentiment:"retained",audioFormat:"24kHz_mono_pcm16",asrEngine:"universal-3-5-pro",outcome:"retained_clamped_15_percent"};
MERGE (n:Lead {id: "lead_jason_miller"}) SET n.label = "Lead: Jason Miller", n += {email:"jason.m@designacademy.io",communitySize:15000,budget:"5k_to_15k",bantScore:85,stage:"call_scheduled",consultationSlot:"Tomorrow at 2:00 PM EST",bookingCode:"GROWTH-8271"};
MERGE (n:Member {id: "member_sarah_jenkins"}) SET n.label = "Member: Sarah Jenkins", n += {memberId:"mem_101",email:"sarah.j@example.com",tier:"vip_mastermind",monthlyFee:997,status:"active_retained",discountGrantedPercent:15,bonusGranted:"1-on-1 Growth Audit Call"};
MERGE (n:Objection {id: "obj_cashflow_tight"}) SET n.label = "Objection: Cash Flow Tight (35% Discount Requested)", n += {category:"pricing_cashflow",verbatim:"I love the mastermind, but my cash flow is tight this month. Can you give me a 35% discount or I will have to cancel?",resolutionPolicy:"policy_max_discount_15"};
MERGE (n:Objection {id: "obj_pricing_guarantee"}) SET n.label = "Objection: Price vs Risk (Zero Audience Fear)", n += {category:"risk_reversal",verbatim:"Will this work if I am starting from zero audience and haven’t launched high-ticket before?",resolution:"14_day_action_guarantee"};
MERGE (n:ResearchLane {id: "lane_creator_rag"}) SET n.label = "Research Lane: Creator Internal Offer RAG", n += {lane:"creator_rag",sourceTitle:"Creator Accelerator Pricing Tiers",relevanceScore:0.96,excerpt:"Self-Paced Sprint at $997, Pro Mentorship at $2,997 ($497/mo), Elite Mastermind at $7,500."};
MERGE (n:ResearchLane {id: "lane_market_trends"}) SET n.label = "Research Lane: Industry Benchmarks & Funnels", n += {lane:"market_trends",sourceTitle:"State of Digital Education 2026",relevanceScore:0.89,excerpt:"Action-based refund guarantees achieve 4.2x higher course completion rates."};
MERGE (n:ResearchLane {id: "lane_community_objections"}) SET n.label = "Research Lane: Student Voice Call Analytics", n += {lane:"community_objections",sourceTitle:"Student Inbound Voice Call Analytics (Last 90 Days)",relevanceScore:0.94,excerpt:"Top objection: Will this work if I am starting from zero audience?"};
MERGE (n:ContentPack {id: "pack_cf_101"}) SET n.label = "Content Pack: Tough Pricing Objections & 14-Day Guarantee", n += {jobId:"job_cf_101",thesis:"High-ticket buyers do not buy information; they buy risk removal and speed of implementation.",status:"needs_approval",synthesisModel:"DeepSeek-R1",tokenCost:0.032,inputTokens:1420,outputTokens:890};
MERGE (n:Asset {id: "asset_x_thread"}) SET n.label = "X Thread (5 Tweets)", n += {channel:"twitter",tweetCount:5,maxLengthConstraint:280,verifiedLength:true,hook:"Most creators fail at high-ticket because they sell knowledge, not risk reversal."};
MERGE (n:Asset {id: "asset_newsletter"}) SET n.label = "Newsletter: The 3-Sentence Reframe", n += {channel:"email",subject:"The 3-Sentence Reframe That Closed $42,000 in Digital Products",cta:"Book your 1-on-1 Growth Audit Call",status:"ready"};
MERGE (n:Asset {id: "asset_webinar_script"}) SET n.label = "Webinar Pitch Script & Risk Reversal", n += {channel:"webinar_pitch",targetDurationMinutes:15,coreGuarantee:"14-day action-based refund guarantee",status:"ready"};
MERGE (n:SelfHealingEvent {id: "heal_tweet_3_length"}) SET n.label = "Self-Healing Event: Tweet #3 Length Truncation", n += {rule:"tweet_length_exceeded_280",initialLength:312,healedLength:234,healedSuccessfully:true,reasoningEngine:"DeepSeek-R1",summary:"Autonomous prompt mutation tightened redundant adjectives down to 234 chars."};

MATCH (s {id: "session_inbound_jason"}), (t {id: "lead_jason_miller"}) MERGE (s)-[r:QUALIFIED_AS {label: "BANT Score 85"}]->(t);
MATCH (s {id: "lead_jason_miller"}), (t {id: "offer_pro_mentorship"}) MERGE (s)-[r:ASSOCIATED_WITH {label: "Matched Tier"}]->(t);
MATCH (s {id: "session_retention_sarah"}), (t {id: "obj_cashflow_tight"}) MERGE (s)-[r:RAISED_OBJECTION {label: "Cash Flow Tight"}]->(t);
MATCH (s {id: "session_retention_sarah"}), (t {id: "policy_max_discount_15"}) MERGE (s)-[r:TRIGGERED_POLICY {label: "Clamped 35% to 15%"}]->(t);
MATCH (s {id: "obj_cashflow_tight"}), (t {id: "member_sarah_jenkins"}) MERGE (s)-[r:ASSOCIATED_WITH {label: "Member Retained"}]->(t);
MATCH (s {id: "obj_pricing_guarantee"}), (t {id: "lane_creator_rag"}) MERGE (s)-[r:RESEARCHED_IN {label: "Relevance 0.96"}]->(t);
MATCH (s {id: "obj_pricing_guarantee"}), (t {id: "lane_market_trends"}) MERGE (s)-[r:RESEARCHED_IN {label: "Relevance 0.89"}]->(t);
MATCH (s {id: "obj_pricing_guarantee"}), (t {id: "lane_community_objections"}) MERGE (s)-[r:RESEARCHED_IN {label: "Relevance 0.94"}]->(t);
MATCH (s {id: "lane_creator_rag"}), (t {id: "pack_cf_101"}) MERGE (s)-[r:SYNTHESIZED_INTO {label: ""}]->(t);
MATCH (s {id: "lane_market_trends"}), (t {id: "pack_cf_101"}) MERGE (s)-[r:SYNTHESIZED_INTO {label: ""}]->(t);
MATCH (s {id: "lane_community_objections"}), (t {id: "pack_cf_101"}) MERGE (s)-[r:SYNTHESIZED_INTO {label: ""}]->(t);
MATCH (s {id: "pack_cf_101"}), (t {id: "asset_x_thread"}) MERGE (s)-[r:CONTAINS_ASSET {label: ""}]->(t);
MATCH (s {id: "pack_cf_101"}), (t {id: "asset_newsletter"}) MERGE (s)-[r:CONTAINS_ASSET {label: ""}]->(t);
MATCH (s {id: "pack_cf_101"}), (t {id: "asset_webinar_script"}) MERGE (s)-[r:CONTAINS_ASSET {label: ""}]->(t);
MATCH (s {id: "asset_x_thread"}), (t {id: "heal_tweet_3_length"}) MERGE (s)-[r:HEALED_BY {label: "312 -> 234 chars"}]->(t);