import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  PhoneCall,
  PhoneOff,
  ShieldAlert,
  Zap,
  Sparkles,
  Database,
  BarChart3,
  GitFork,
  Globe,
  Linkedin,
  UserCheck,
  HardDrive,
  Info,
  X,
  Building2
} from 'lucide-react';
import { AudioWaveform } from './components/AudioWaveform';
import { LiveTranscriptHUD, MessageItem, ActiveToolItem } from './components/LiveTranscriptHUD';
import { CrmKanban } from './components/CrmKanban';
import { EvalsDashboard } from './components/EvalsDashboard';
import { ContentFactoryStudio } from './components/ContentFactoryStudio';
import { GraphViewHUD } from './components/GraphViewHUD';
import { AudioPipeline } from './utils/audioWorklet';
import { CRMLead, ChurnRiskMember, ContentFactoryJob } from '@voice-os/shared';

export type OperatingPersona =
  | 'inbound'
  | 'outbound'
  | 'churn'
  | 'onboarding'
  | 'affiliate'
  | 'diagnostic';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'console' | 'crm' | 'evals' | 'content' | 'graph'>('console');
  const [isCalling, setIsCalling] = useState(false);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<OperatingPersona>('inbound');

  // Prospect Enrichment Modal State
  const [isEnrichModalOpen, setIsEnrichModalOpen] = useState(false);
  const [prospectName, setProspectName] = useState('Jason Miller');
  const [prospectEmail, setProspectEmail] = useState('jason.m@designacademy.io');
  const [prospectWebsite, setProspectWebsite] = useState('https://designacademy.io');
  const [prospectLinkedIn, setProspectLinkedIn] = useState('https://linkedin.com/in/jasonmiller-design');
  const [prospectCompany, setProspectCompany] = useState('DesignAcademy Studio');
  const [prospectBio, setProspectBio] = useState('UI/UX design mentorship community with 15k audience, wanting $10k/mo retainers');

  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [activeTools, setActiveTools] = useState<ActiveToolItem[]>([]);
  const [leads, setLeads] = useState<CRMLead[]>([]);
  const [members, setMembers] = useState<ChurnRiskMember[]>([]);
  const [jobs, setJobs] = useState<ContentFactoryJob[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const telemetryWsRef = useRef<WebSocket | null>(null);
  const audioPipelineRef = useRef<AudioPipeline | null>(null);

  // Fetch initial CRM leads and connect to telemetry WS
  useEffect(() => {
    fetch('/api/crm/leads')
      .then((res) => res.json())
      .then((data) => {
        if (data.leads) setLeads(data.leads);
      })
      .catch((err) => console.log('[API Leads]', err.message));

    fetch('/api/crm/members')
      .then((res) => res.json())
      .then((data) => {
        if (data.members) setMembers(data.members);
      })
      .catch((err) => console.log('[API Members]', err.message));

    fetch('/api/content/jobs')
      .then((res) => res.json())
      .then((data) => {
        if (data.jobs) setJobs(data.jobs);
      })
      .catch((err) => console.log('[API Jobs]', err.message));

    // Connect to orchestrator telemetry WS
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const telemetryUrl = `${protocol}//${window.location.host}/ws/telemetry`;
    const tws = new WebSocket(telemetryUrl);
    telemetryWsRef.current = tws;

    tws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'tool_executed') {
          if (payload.leads) setLeads(payload.leads);
          if (payload.members) setMembers(payload.members);

          setActiveTools((prev) => [
            ...prev,
            {
              id: payload.call_id || String(Date.now()),
              name: payload.name,
              args: payload.arguments,
              result: payload.result,
              status: 'completed'
            }
          ]);
        } else if (payload.type === 'content_factory_job_updated') {
          setJobs((prev) => {
            const index = prev.findIndex((j) => j.id === payload.job.id);
            if (index >= 0) {
              const copy = [...prev];
              copy[index] = payload.job;
              return copy;
            }
            return [payload.job, ...prev];
          });
        } else if (payload.type === 'initial_state') {
          if (payload.leads) setLeads(payload.leads);
          if (payload.members) setMembers(payload.members);
          if (payload.jobs) setJobs(payload.jobs);
        }
      } catch (e) {
        console.error(e);
      }
    };

    return () => {
      tws.close();
      if (audioPipelineRef.current) audioPipelineRef.current.cleanup();
    };
  }, []);

  // System Prompts & Greetings for 6 Operating Personas
  const getPersonaConfig = (persona: OperatingPersona) => {
    switch (persona) {
      case 'inbound':
        return {
          title: 'After-Hours Inbound Admissions SDR',
          prompt: 'You are Anna, the elite AI Growth Operator for an online education academy. Warmly qualify inbound prospects using BANT criteria, answer curriculum and pricing questions using get_product_knowledge, and schedule strategy consultations.',
          greeting: "Hey there! Welcome to Alex's Growth Accelerator. What brings you to our program today?"
        };
      case 'outbound':
        return {
          title: 'Outbound Lead Reactivation Specialist',
          prompt: 'You are Anna, conducting warm outreach to past course inquiries. Inquire about their launch progress, address hesitation, and offer an exclusive action-guarantee sprint.',
          greeting: 'Hi there! Alex asked me to follow up regarding your creator funnel launch. How is your project progressing?'
        };
      case 'churn':
        return {
          title: 'Churn Save & Margin Protection Guardrail',
          prompt: 'You are the empathetic Retention Specialist for Alex’s Growth Mastermind. A member wants to cancel. Listen to their reason, offer to pause or apply our policy discount (up to 15%), and log their feedback.',
          greeting: 'Hi Sarah, I see you requested to discuss your mastermind membership. How can I help today?'
        };
      case 'onboarding':
        return {
          title: 'VIP Student Onboarding Concierge',
          prompt: 'You are Anna, the VIP Onboarding Concierge. Guide newly enrolled high-ticket members through their account activation, access to the private community, and schedule their 1-on-1 Kickoff Call.',
          greeting: "Welcome to the Pro Mentorship family! I am here to help you get your workspace, community credentials, and 1-on-1 kickoff session locked in. Ready to get started?"
        };
      case 'affiliate':
        return {
          title: 'Affiliate & Strategic Partner Scout',
          prompt: 'You are Anna, vetting incoming partnership and affiliate inquiries. Gather their audience size, distribution channels, and revenue share expectations.',
          greeting: 'Thanks for reaching out about our partner affiliate program. What niche and audience size are you currently reaching?'
        };
      case 'diagnostic':
        return {
          title: 'Executive Diagnostic Advisor ($10k+)',
          prompt: 'You are Anna, senior growth architect for enterprise creator brands. Conduct a strategic discovery audit examining team structure, customer acquisition cost, and revenue bottlenecks.',
          greeting: 'Welcome to the Executive Growth Diagnostic. Before we look at our $10k Accelerator, could you walk me through your current monthly revenue run-rate and primary growth bottleneck?'
        };
    }
  };

  // Handle Starting Voice Session with AssemblyAI
  const handleStartCall = async () => {
    try {
      setIsCalling(true);
      const personaConfig = getPersonaConfig(selectedScenario);

      setMessages([
        {
          id: 'sys_1',
          speaker: 'system',
          text: `Minting short-lived session token with AssemblyAI Voice Agent API (${personaConfig.title})...`,
          timestamp: new Date().toLocaleTimeString()
        }
      ]);

      // 1. Fetch ephemeral token from backend
      const tokenRes = await fetch('/api/voice/token', { method: 'POST' });
      const tokenData = await tokenRes.json();

      if (!tokenData.token) {
        throw new Error(tokenData.error || 'Failed to acquire token');
      }

      setMessages((prev) => [
        ...prev,
        {
          id: 'sys_2',
          speaker: 'system',
          text: `Token minted successfully. Connecting to AssemblyAI WebSocket (universal-3-5-pro)...`,
          timestamp: new Date().toLocaleTimeString()
        }
      ]);

      // Initialize Audio Pipeline
      const pipeline = new AudioPipeline((base64PcmChunk) => {
        setIsUserSpeaking(true);
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: 'input.audio',
              audio: base64PcmChunk
            })
          );
        }
      });
      audioPipelineRef.current = pipeline;

      const wsEndpoint = tokenData.isDemo
        ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/telemetry`
        : `wss://agents.assemblyai.com/v1/ws?token=${tokenData.token}`;

      const ws = new WebSocket(wsEndpoint);
      wsRef.current = ws;

      ws.onopen = async () => {
        console.log('[AssemblyAI Voice Agent WS Connected]');

        const sessionUpdate = {
          type: 'session.update',
          session: {
            system_prompt: personaConfig.prompt,
            greeting: personaConfig.greeting,
            output: {
              voice: 'anna',
              format: { encoding: 'audio/pcm' }
            },
            input: {
              format: { encoding: 'audio/pcm' },
              turn_detection: {
                vad_threshold: 0.5,
                min_silence: 200,
                max_silence: 1000,
                interrupt_response: true
              }
            }
          }
        };

        if (!tokenData.isDemo) {
          ws.send(JSON.stringify(sessionUpdate));
        }

        // Start local mic capture
        await pipeline.startRecording();

        setMessages((prev) => [
          ...prev,
          {
            id: 'agent_greet',
            speaker: 'agent',
            text: personaConfig.greeting,
            timestamp: new Date().toLocaleTimeString()
          }
        ]);
        setIsAgentSpeaking(true);
        setTimeout(() => setIsAgentSpeaking(false), 2400);
      };

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);

          if (msg.type === 'transcript.user') {
            setIsUserSpeaking(false);
            setMessages((prev) => [
              ...prev,
              {
                id: `u_${Date.now()}`,
                speaker: 'user',
                text: msg.transcript,
                timestamp: new Date().toLocaleTimeString()
              }
            ]);
          } else if (msg.type === 'transcript.agent') {
            setMessages((prev) => [
              ...prev,
              {
                id: `a_${Date.now()}`,
                speaker: 'agent',
                text: msg.transcript,
                timestamp: new Date().toLocaleTimeString()
              }
            ]);
          } else if (msg.type === 'reply.started') {
            setIsAgentSpeaking(true);
          } else if (msg.type === 'reply.audio') {
            if (msg.data && audioPipelineRef.current) {
              audioPipelineRef.current.playChunk(msg.data);
            }
          } else if (msg.type === 'reply.done') {
            setIsAgentSpeaking(false);
            if (msg.status === 'interrupted' && audioPipelineRef.current) {
              audioPipelineRef.current.abortPlayback();
            }
          } else if (msg.type === 'tool.call') {
            if (telemetryWsRef.current && telemetryWsRef.current.readyState === WebSocket.OPEN) {
              telemetryWsRef.current.send(
                JSON.stringify({
                  type: 'tool_execution_request',
                  call_id: msg.call_id,
                  name: msg.name,
                  arguments: msg.arguments
                })
              );
            }
          }
        } catch (err) {
          console.error('[WS Message Parse Error]', err);
        }
      };

      ws.onclose = () => {
        setIsCalling(false);
        setIsAgentSpeaking(false);
        setIsUserSpeaking(false);
        if (audioPipelineRef.current) audioPipelineRef.current.stopRecording();
      };
    } catch (err: any) {
      console.error(err);
      setIsCalling(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          speaker: 'system',
          text: `Error initializing Voice Agent: ${err.message}`,
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
    }
  };

  const handleEndCall = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'Terminate' }));
      wsRef.current.close();
    }
    if (audioPipelineRef.current) {
      audioPipelineRef.current.stopRecording();
    }
    setIsCalling(false);
    setIsAgentSpeaking(false);
    setIsUserSpeaking(false);
  };

  // Submit Prospect Website / LinkedIn Context Enrichment
  const handleEnrichProspect = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/crm/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'enrich_prospect_dossier',
          arguments: {
            fullName: prospectName,
            email: prospectEmail,
            website: prospectWebsite,
            linkedIn: prospectLinkedIn,
            companyName: prospectCompany,
            businessSummary: prospectBio
          }
        })
      });
      const data = await res.json();

      // Refresh leads
      const leadsRes = await fetch('/api/crm/leads');
      const leadsData = await leadsRes.json();
      if (leadsData.leads) setLeads(leadsData.leads);

      setMessages((prev) => [
        ...prev,
        {
          id: `enrich_${Date.now()}`,
          speaker: 'system',
          text: `🌐 Prospect Dossier Enriched: ${prospectName} (${prospectWebsite}). Verified profile and business model loaded into active agent context.`,
          timestamp: new Date().toLocaleTimeString()
        }
      ]);

      setActiveTools((prev) => [
        ...prev,
        {
          id: `tool_${Date.now()}`,
          name: 'enrich_prospect_dossier',
          args: { website: prospectWebsite, linkedIn: prospectLinkedIn, company: prospectCompany },
          result: data.result,
          status: 'completed'
        }
      ]);

      setIsEnrichModalOpen(false);
    } catch (err: any) {
      console.error(err);
    }
  };

  // Quick Scenario Simulation Trigger for Hackathon Demo Recording
  const triggerSimulationStep = async (
    type: 'lead_inbound' | 'objection_rag' | 'churn_clamp' | 'content_factory_spoken'
  ) => {
    if (type === 'lead_inbound') {
      setMessages((prev) => [
        ...prev,
        {
          id: `sim_${Date.now()}`,
          speaker: 'user',
          text: 'Hi Alex! I run an educational design community with 15k members. My budget is 5k to 15k, and we need to launch our high-ticket funnel within 3 weeks. Can we schedule a strategy consultation?',
          timestamp: new Date().toLocaleTimeString()
        }
      ]);

      await fetch('/api/crm/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'create_or_update_lead',
          arguments: {
            fullName: prospectName || 'Jason Miller',
            email: prospectEmail || 'jason.m@designacademy.io',
            website: prospectWebsite || 'https://designacademy.io',
            source: 'after_hours_inbound'
          }
        })
      });

      await fetch('/api/crm/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'qualify_lead',
          arguments: {
            email: prospectEmail || 'jason.m@designacademy.io',
            budgetRange: '5k_to_15k',
            coreNeed: 'Launch high-ticket digital mastermind',
            timelineWeeks: 3
          }
        })
      });

      await fetch('/api/crm/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'schedule_growth_consultation',
          arguments: {
            email: prospectEmail || 'jason.m@designacademy.io',
            preferredDatetime: 'Tomorrow at 2:00 PM EST',
            topic: 'Mastermind Funnel Architecture'
          }
        })
      });

      const res = await fetch('/api/crm/leads');
      const data = await res.json();
      if (data.leads) setLeads(data.leads);

      setMessages((prev) => [
        ...prev,
        {
          id: `sim_agent_${Date.now()}`,
          speaker: 'agent',
          text: `Fantastic, ${prospectName.split(' ')[0]}! You're an ideal fit for our Pro Mentorship. I've locked in your strategy consultation for tomorrow at 2:00 PM EST. Check your inbox for confirmation code GROWTH-8271.`,
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
    } else if (type === 'churn_clamp') {
      setMessages((prev) => [
        ...prev,
        {
          id: `sim_churn_${Date.now()}`,
          speaker: 'user',
          text: 'I love the mastermind, but my cash flow is tight this month. Can you give me a 35% discount or I will have to cancel?',
          timestamp: new Date().toLocaleTimeString()
        }
      ]);

      const res = await fetch('/api/crm/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'process_retention_offer',
          arguments: {
            memberId: 'mem_101',
            churnReason: 'too_expensive',
            requestedAction: 'apply_discount',
            proposedDiscountPct: 35
          }
        })
      });
      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          id: `sim_agent_churn_${Date.now()}`,
          speaker: 'agent',
          text: "I completely understand cash flow cycles, Sarah. While our maximum authorized discount is 15%, I've applied that directly to your next 3 months, and Alex has included a complimentary 1-on-1 Growth Audit Call with our team to help you recoup revenue. Let's keep you winning!",
          timestamp: new Date().toLocaleTimeString()
        }
      ]);

      setActiveTools((prev) => [
        ...prev,
        {
          id: `tool_${Date.now()}`,
          name: 'process_retention_offer',
          args: { proposedDiscountPct: 35 },
          result: data.result,
          status: 'completed'
        }
      ]);
    } else if (type === 'content_factory_spoken') {
      setMessages((prev) => [
        ...prev,
        {
          id: `sim_cf_user_${Date.now()}`,
          speaker: 'user',
          text: "Anna, take that student's objection about our $2,997 pricing and 14-day refund guarantee, and run the Hermes Content Factory to turn it into an X thread, LinkedIn post, and newsletter.",
          timestamp: new Date().toLocaleTimeString()
        }
      ]);

      setMessages((prev) => [
        ...prev,
        {
          id: `sim_cf_agent_${Date.now()}`,
          speaker: 'agent',
          text: "I've queued the Hermes Content Factory on your pricing and guarantee objection. 3 parallel research lanes have been initiated, and verified drafts will appear in your Content Studio console in real-time for your review and one-click approval.",
          timestamp: new Date().toLocaleTimeString()
        }
      ]);

      await handleTriggerContentJob('Overcoming High-Ticket Pricing Objections with Risk-Reversal');
    }
  };

  const handleTriggerContentJob = async (topic: string) => {
    try {
      const res = await fetch('/api/content/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, speaker: 'creator' })
      });
      const data = await res.json();
      console.log('[Content Factory Triggered]', data);
    } catch (e: any) {
      console.error(e.message);
    }
  };

  const handleApproveContentJob = async (id: string) => {
    try {
      await fetch(`/api/content/jobs/${id}/approve`, { method: 'POST' });
    } catch (e: any) {
      console.error(e.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#080C14] text-slate-100 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold tracking-tight text-white">GrowthVoice OS</h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 font-semibold">
                AssemblyAI Universal-3.5 Pro
              </span>
            </div>
            <p className="text-xs text-slate-400">Autonomous AI Growth Operator for Creators & High-Ticket Programs</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center space-x-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('console')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'console'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Voice Console</span>
          </button>
          <button
            onClick={() => setActiveTab('crm')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'crm'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Revenue CRM ({leads.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('content')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'content'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Hermes Content Studio ({jobs.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('evals')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'evals'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Anthropic Evals</span>
          </button>
          <button
            onClick={() => setActiveTab('graph')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'graph'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <GitFork className="w-3.5 h-3.5 text-emerald-400" />
            <span>Knowledge Graph & Vault</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Body */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {activeTab === 'console' && (
          <div className="space-y-6">
            {/* Explainer & Mental Model Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/40 via-slate-900/60 to-purple-950/40 border border-blue-800/40 backdrop-blur-xl flex items-center justify-between">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wide">
                    Live Roleplay & Simulator Architecture:
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-4xl">
                    In production, this voice widget lives on the <strong>Creator's website</strong>. When an after-hours <strong>Prospective Buyer</strong> speaks, <strong>Anna</strong> qualifies their BANT budget, books consultations, and saves the objection into the <strong>Persistent Knowledge Graph</strong> below.
                  </p>
                </div>
              </div>

              {/* Enrich Prospect Context Button */}
              <button
                onClick={() => setIsEnrichModalOpen(true)}
                className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500/40 text-cyan-200 text-xs font-semibold whitespace-nowrap transition-all shadow-md shadow-cyan-600/20"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Enrich Prospect Dossier (Website & LinkedIn)</span>
              </button>
            </div>

            {/* Scenario Configuration Bar (6 Personas) */}
            <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase text-slate-400">Operating Persona (Switch Voice Mindset):</span>
                <span className="text-[11px] font-mono text-cyan-400">
                  Active: {getPersonaConfig(selectedScenario).title}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedScenario('inbound')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedScenario === 'inbound'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                      : 'bg-slate-950/60 text-slate-400 border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  🎯 Inbound Admissions SDR
                </button>
                <button
                  onClick={() => setSelectedScenario('outbound')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedScenario === 'outbound'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                      : 'bg-slate-950/60 text-slate-400 border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  🔄 Outbound Reactivation
                </button>
                <button
                  onClick={() => setSelectedScenario('churn')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedScenario === 'churn'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                      : 'bg-slate-950/60 text-slate-400 border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  🛡️ Churn Save & Margin Clamping
                </button>
                <button
                  onClick={() => setSelectedScenario('onboarding')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedScenario === 'onboarding'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                      : 'bg-slate-950/60 text-slate-400 border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  🎓 VIP Student Onboarding
                </button>
                <button
                  onClick={() => setSelectedScenario('affiliate')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedScenario === 'affiliate'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                      : 'bg-slate-950/60 text-slate-400 border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  🤝 Affiliate & Partner Scout
                </button>
                <button
                  onClick={() => setSelectedScenario('diagnostic')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedScenario === 'diagnostic'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm'
                      : 'bg-slate-950/60 text-slate-400 border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  💼 Executive Diagnostic ($10k+)
                </button>
              </div>

              {/* Call Action Bar */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-800/80">
                <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-400">
                  <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Persistent Graph Storage: Active (Zero data loss on reload)</span>
                </div>

                <div>
                  {!isCalling ? (
                    <button
                      onClick={handleStartCall}
                      className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-semibold text-xs shadow-lg shadow-cyan-500/25 transition-all"
                    >
                      <PhoneCall className="w-4 h-4" />
                      <span>Start Voice Session</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleEndCall}
                      className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs shadow-lg shadow-red-500/25 transition-all"
                    >
                      <PhoneOff className="w-4 h-4" />
                      <span>Terminate Session</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Audio Waveform Canvas */}
            <AudioWaveform
              isActive={isCalling}
              isAgentSpeaking={isAgentSpeaking}
              isUserSpeaking={isUserSpeaking}
            />

            {/* Live Interaction HUD */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <LiveTranscriptHUD messages={messages} activeTools={activeTools} />
              </div>

              {/* Quick Interactive Simulator & Telemetry Sidebar */}
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl space-y-3">
                  <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400">
                    <Sparkles className="w-4 h-4" />
                    <span className="font-semibold">Interactive Video Demo Drivers:</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Test the buyer side of the conversation or trigger deterministic guardrail clamping:
                  </p>

                  <div className="space-y-2">
                    <button
                      onClick={() => triggerSimulationStep('lead_inbound')}
                      className="w-full text-left p-2.5 rounded-xl bg-slate-950/70 hover:bg-slate-900 border border-slate-800 text-xs text-slate-200 transition-all flex items-center justify-between"
                    >
                      <span>Simulate High-Ticket Inbound ($10k BANT)</span>
                      <span className="text-[10px] font-mono text-cyan-400">▶ Run</span>
                    </button>

                    <button
                      onClick={() => triggerSimulationStep('churn_clamp')}
                      className="w-full text-left p-2.5 rounded-xl bg-slate-950/70 hover:bg-slate-900 border border-slate-800 text-xs text-slate-200 transition-all flex items-center justify-between"
                    >
                      <span>Simulate Churn Save (Clamp 35% to 15%)</span>
                      <span className="text-[10px] font-mono text-purple-400">▶ Run</span>
                    </button>

                    <button
                      onClick={() => triggerSimulationStep('content_factory_spoken')}
                      className="w-full text-left p-2.5 rounded-xl bg-slate-950/70 hover:bg-slate-900 border border-purple-800/60 text-xs text-purple-200 transition-all flex items-center justify-between"
                    >
                      <span>Simulate Voice: Trigger Hermes Content Factory</span>
                      <span className="text-[10px] font-mono text-purple-400">▶ Run</span>
                    </button>
                  </div>
                </div>

                {/* System Guardrail Status */}
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl space-y-2.5">
                  <div className="flex items-center space-x-2 text-xs font-mono text-emerald-400">
                    <ShieldAlert className="w-4 h-4" />
                    <span className="font-semibold">Production Guardrail Policies</span>
                  </div>
                  <div className="space-y-1 text-[11px] text-slate-400 font-mono">
                    <div className="flex justify-between">
                      <span>Max Autonomous Discount:</span>
                      <span className="text-slate-200">15% Max (Hard Clamped)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>PII Redaction Engine:</span>
                      <span className="text-emerald-400">Active</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Interruption Abort Delay:</span>
                      <span className="text-cyan-400">&lt;50ms</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'crm' && <CrmKanban leads={leads} members={members} />}

        {activeTab === 'content' && (
          <ContentFactoryStudio
            jobs={jobs}
            onTriggerJob={handleTriggerContentJob}
            onApproveJob={handleApproveContentJob}
          />
        )}

        {activeTab === 'evals' && <EvalsDashboard />}
        {activeTab === 'graph' && <GraphViewHUD />}
      </main>

      {/* Prospect Dossier Enrichment Modal */}
      {isEnrichModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6">
          <div className="w-full max-w-lg bg-slate-900 border border-cyan-700/50 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/50">
              <div className="flex items-center space-x-2 text-cyan-400">
                <Globe className="w-4 h-4" />
                <h3 className="text-sm font-bold text-white">Prospect Business Dossier & Website Context</h3>
              </div>
              <button
                onClick={() => setIsEnrichModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEnrichProspect} className="p-6 space-y-4 text-xs">
              <p className="text-slate-400 leading-relaxed">
                Provide the prospect's website, LinkedIn profile, or business bio so Anna can research their business model and tailor questions during the call.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-mono">Full Name:</label>
                  <input
                    type="text"
                    value={prospectName}
                    onChange={(e) => setProspectName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-mono">Email Address:</label>
                  <input
                    type="email"
                    value={prospectEmail}
                    onChange={(e) => setProspectEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-mono flex items-center space-x-1.5">
                  <Globe className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Company / Portfolio Website URL:</span>
                </label>
                <input
                  type="url"
                  value={prospectWebsite}
                  onChange={(e) => setProspectWebsite(e.target.value)}
                  placeholder="https://designacademy.io"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-mono flex items-center space-x-1.5">
                  <Linkedin className="w-3.5 h-3.5 text-blue-400" />
                  <span>LinkedIn Profile URL:</span>
                </label>
                <input
                  type="url"
                  value={prospectLinkedIn}
                  onChange={(e) => setProspectLinkedIn(e.target.value)}
                  placeholder="https://linkedin.com/in/..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-mono flex items-center space-x-1.5">
                  <Building2 className="w-3.5 h-3.5 text-purple-400" />
                  <span>Company / Community Name:</span>
                </label>
                <input
                  type="text"
                  value={prospectCompany}
                  onChange={(e) => setProspectCompany(e.target.value)}
                  placeholder="DesignAcademy Studio"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-mono">Business Summary / Bio:</label>
                <textarea
                  rows={2}
                  value={prospectBio}
                  onChange={(e) => setProspectBio(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsEnrichModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/20"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Save & Feed to Voice Agent</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer Status Bar */}
      <footer className="border-t border-slate-900 bg-slate-950/90 px-6 py-3 text-xs font-mono text-slate-500 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>AssemblyAI Voice Agent API: Operational</span>
          </span>
          <span>•</span>
          <span>Sample Rate: 24,000 Hz Mono</span>
          <span>•</span>
          <span>Database: Persistent SQLite/JSON Graph</span>
        </div>
        <div>lablab.ai Voice Agent Hackathon Submission • GrowthVoice OS</div>
      </footer>
    </div>
  );
};

export default App;
