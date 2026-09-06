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
  GitFork
} from 'lucide-react';
import { AudioWaveform } from './components/AudioWaveform';
import { LiveTranscriptHUD, MessageItem, ActiveToolItem } from './components/LiveTranscriptHUD';
import { CrmKanban } from './components/CrmKanban';
import { EvalsDashboard } from './components/EvalsDashboard';
import { ContentFactoryStudio } from './components/ContentFactoryStudio';
import { GraphViewHUD } from './components/GraphViewHUD';
import { AudioPipeline } from './utils/audioWorklet';
import { CRMLead, ChurnRiskMember, ContentFactoryJob } from '@voice-os/shared';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'console' | 'crm' | 'evals' | 'content' | 'graph'>('console');
  const [isCalling, setIsCalling] = useState(false);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<'inbound' | 'outbound' | 'churn'>('inbound');

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

  // Handle Starting Voice Session with AssemblyAI
  const handleStartCall = async () => {
    try {
      setIsCalling(true);
      setMessages([
        {
          id: 'sys_1',
          speaker: 'system',
          text: 'Minting short-lived session token with AssemblyAI Voice Agent API...',
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

      // In Live Environment, connect to AssemblyAI Voice Agent WebSocket:
      // wss://agents.assemblyai.com/v1/ws?token=${tokenData.token}
      const wsEndpoint = tokenData.isDemo
        ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/telemetry`
        : `wss://agents.assemblyai.com/v1/ws?token=${tokenData.token}`;

      const ws = new WebSocket(wsEndpoint);
      wsRef.current = ws;

      ws.onopen = async () => {
        console.log('[AssemblyAI Voice Agent WS Connected]');

        // Send session.update immediately
        const sessionUpdate = {
          type: 'session.update',
          session: {
            system_prompt:
              selectedScenario === 'churn'
                ? 'You are the empathetic Retention Specialist for Alex’s Growth Mastermind. A member wants to cancel. Listen to their reason, offer to pause or apply our policy discount (up to 15%), and log their feedback.'
                : 'You are the AI Growth Operator for an elite online creator. Warmly qualify inbound prospects using BANT criteria, answer curriculum and pricing questions using get_product_knowledge, and schedule strategy consultations.',
            greeting:
              selectedScenario === 'churn'
                ? 'Hi Sarah, I see you requested to discuss your mastermind membership. How can I help today?'
                : "Hey there! Welcome to Alex's Growth Accelerator. What brings you to our program today?",
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
            text:
              selectedScenario === 'churn'
                ? 'Hi Sarah, I see you requested to discuss your mastermind membership. How can I help today?'
                : "Hey there! Welcome to Alex's Growth Accelerator. What brings you to our program today?",
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
            // Note field name is "data"
            if (msg.data && audioPipelineRef.current) {
              audioPipelineRef.current.playChunk(msg.data);
            }
          } else if (msg.type === 'reply.done') {
            setIsAgentSpeaking(false);
            if (msg.status === 'interrupted' && audioPipelineRef.current) {
              audioPipelineRef.current.abortPlayback();
            }
          } else if (msg.type === 'tool.call') {
            // Forward to orchestrator dispatcher via telemetry WS
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
      // Send explicit Terminate message per Operating Rule 8
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

      // Trigger Tool Dispatch
      await fetch('/api/crm/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'create_or_update_lead',
          arguments: {
            fullName: 'Jason Miller',
            email: 'jason.m@designacademy.io',
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
            email: 'jason.m@designacademy.io',
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
            email: 'jason.m@designacademy.io',
            preferredDatetime: 'Tomorrow at 2:00 PM EST',
            topic: 'Mastermind Funnel Architecture'
          }
        })
      });

      // Refresh leads
      const res = await fetch('/api/crm/leads');
      const data = await res.json();
      if (data.leads) setLeads(data.leads);

      setMessages((prev) => [
        ...prev,
        {
          id: `sim_agent_${Date.now()}`,
          speaker: 'agent',
          text: "Fantastic, Jason! You're an ideal fit for our Pro Mentorship. I've locked in your strategy consultation for tomorrow at 2:00 PM EST. Check your inbox for confirmation code GROWTH-8271.",
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

      // Execute with guardrail clamping
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
          text: "Anna, take that student's objection about our $2,997 pricing and 14-day refund guarantee, and run the Hermes Content Factory to turn it into an X thread and newsletter.",
          timestamp: new Date().toLocaleTimeString()
        }
      ]);

      // Voice agent speaks immediate acknowledgment
      setMessages((prev) => [
        ...prev,
        {
          id: `sim_cf_agent_${Date.now()}`,
          speaker: 'agent',
          text: "I've queued the Hermes Content Factory on your pricing and guarantee objection. 3 parallel research lanes have been initiated, and verified drafts will appear in your Content Studio console in real-time for your review and one-click approval.",
          timestamp: new Date().toLocaleTimeString()
        }
      ]);

      // Trigger background job
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
            <p className="text-xs text-slate-400">Autonomous AI Growth Operator for High-Volume Creators</p>
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
            {/* Scenario Configuration Bar */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-xl">
              <div className="flex items-center space-x-3">
                <span className="text-xs font-mono uppercase text-slate-400">Operating Persona:</span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setSelectedScenario('inbound')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selectedScenario === 'inbound'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'bg-slate-950/60 text-slate-400 border border-slate-800'
                    }`}
                  >
                    After-Hours Inbound SDR
                  </button>
                  <button
                    onClick={() => setSelectedScenario('outbound')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selectedScenario === 'outbound'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'bg-slate-950/60 text-slate-400 border border-slate-800'
                    }`}
                  >
                    Outbound Reactivation
                  </button>
                  <button
                    onClick={() => setSelectedScenario('churn')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selectedScenario === 'churn'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        : 'bg-slate-950/60 text-slate-400 border border-slate-800'
                    }`}
                  >
                    Churn Save & Retention
                  </button>
                </div>
              </div>

              {/* Call Initiation Action */}
              <div className="flex items-center space-x-3">
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
                    Trigger full-duplex turns, tool calling, and deterministic guardrail clamping:
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
                      <span className="text-slate-200">15% Max</span>
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

      {/* Footer Status Bar */}
      <footer className="border-t border-slate-900 bg-slate-950/90 px-6 py-3 text-xs font-mono text-slate-500 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>AssemblyAI Voice Agent API: Operational</span>
          </span>
          <span>•</span>
          <span>Sample Rate: 24,000 Hz Mono</span>
        </div>
        <div>lablab.ai Voice Agent Hackathon Submission • GrowthVoice OS</div>
      </footer>
    </div>
  );
};

export default App;
