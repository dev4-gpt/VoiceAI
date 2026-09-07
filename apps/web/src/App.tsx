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
  Building2,
  Bookmark,
  Save,
  RotateCcw,
  Trash2,
  Lock,
  Plus,
  Minus,
  PlusCircle,
  MinusCircle,
  UserPlus,
  UserMinus,
  Link2,
  Tag
} from 'lucide-react';
import { AudioWaveform } from './components/AudioWaveform';
import { NeuralAudioOrb } from './components/NeuralAudioOrb';
import { AmbientVercelShader } from './components/AmbientVercelShader';
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

export interface CustomLinkItem {
  id: string;
  label: string;
  url: string;
}

export interface DossierPreset {
  id: string;
  name: string;
  fullName: string;
  email: string;
  website: string;
  linkedIn: string;
  twitter: string;
  youtube: string;
  instagram: string;
  substack: string;
  companyName: string;
  bio: string;
  toneArchetype: 'tactical_operator' | 'empathetic_mentor' | 'visionary_founder' | 'enterprise_advisor';
  customLexicon: string;
  customBannedTerms: string;
  customLinks?: CustomLinkItem[];
  isCustom?: boolean;
}

export const BUILT_IN_PRESETS: DossierPreset[] = [
  {
    id: 'default_demo',
    name: '🎨 Design & Education: Jason Miller (DesignAcademy Studio)',
    fullName: 'Jason Miller',
    email: 'jason.m@designacademy.io',
    website: 'https://designacademy.io',
    linkedIn: 'https://linkedin.com/in/jasonmiller-design',
    twitter: 'https://x.com/jasonmiller_ui',
    youtube: 'https://youtube.com/@designacademy_io',
    instagram: 'https://instagram.com/designacademy.studio',
    substack: 'https://jasonmiller.substack.com',
    companyName: 'DesignAcademy Studio',
    bio: 'Founder of DesignAcademy.io (15k UI/UX designer community, 120k newsletter readers). Transitioning from $47 ebook sales into high-ticket $2,997 Pro Career Sprints and $10k/mo agency retainers. Needs 24/7 after-hours voice qualification to handle European and Asian inbound leads.',
    toneArchetype: 'tactical_operator',
    customLexicon: 'growth sprint, funnel velocity, high-ticket, cohort',
    customBannedTerms: 'cheap, guru, synergy, hard sell, magic bullet',
    isCustom: false
  },
  {
    id: 'creator_elena',
    name: '🎬 Creator VFX: Elena Rostova (NeuralCinema AI)',
    fullName: 'Elena Rostova',
    email: 'elena@neuralcinema.ai',
    website: 'https://neuralcinema.ai',
    linkedIn: 'https://linkedin.com/in/elena-rostova-ai',
    twitter: 'https://x.com/elena_cinema_ai',
    youtube: 'https://youtube.com/@NeuralCinemaAI',
    instagram: 'https://instagram.com/neuralcinema.ai',
    substack: 'https://neuralcinema.substack.com',
    companyName: 'NeuralCinema AI',
    bio: 'GenAI Filmmaker & Director. Running a private cohort for 50 commercial VFX artists and creative directors transitioning to diffusion pipelines and real-time NeRF workflows. Transitioning to $5k enterprise masterminds.',
    toneArchetype: 'visionary_founder',
    customLexicon: 'neural render, diffusion workflow, multimodal, latent space, high-ticket',
    customBannedTerms: 'cheap, prompt kiddie, clickbait, traditional CGI',
    isCustom: false
  },
  {
    id: 'saas_alex',
    name: '💼 Micro-SaaS: Alex Rivera (Solopreneur OS)',
    fullName: 'Alex Rivera',
    email: 'alex@solopreneuros.com',
    website: 'https://solopreneuros.com',
    linkedIn: 'https://linkedin.com/in/alexrivera-tech',
    twitter: 'https://x.com/alexrivera_dev',
    youtube: 'https://youtube.com/@solopreneuros',
    instagram: 'https://instagram.com/solopreneur.os',
    substack: 'https://alexrivera.substack.com',
    companyName: 'Solopreneur OS',
    bio: 'B2B Micro-SaaS founder building productivity systems for fractional executives and solo consultants. Scaled to $18k MRR, now expanding into high-touch onboarding and $12k/yr annual memberships.',
    toneArchetype: 'enterprise_advisor',
    customLexicon: 'unit economics, churn mitigation, LTV, net revenue retention, ROI',
    customBannedTerms: 'hustle, overnight riches, cheap, silver bullet',
    isCustom: false
  }
];

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'console' | 'crm' | 'evals' | 'content' | 'graph'>('console');
  const [isCalling, setIsCalling] = useState(false);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<OperatingPersona>('inbound');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [is3DSpatialMode, setIs3DSpatialMode] = useState(false);
  const [audioVisualizerType, setAudioVisualizerType] = useState<'orb' | 'waveform'>('orb');
  const [activeSimulationKey, setActiveSimulationKey] = useState<string | null>(null);

  // Prospect Enrichment State: Initialized to Generic Public Demo (Jason Miller / DesignAcademy Studio)
  const [isEnrichModalOpen, setIsEnrichModalOpen] = useState(false);
  const [prospectName, setProspectName] = useState('Jason Miller');
  const [prospectEmail, setProspectEmail] = useState('jason.m@designacademy.io');
  const [prospectWebsite, setProspectWebsite] = useState('https://designacademy.io');
  const [prospectLinkedIn, setProspectLinkedIn] = useState('https://linkedin.com/in/jasonmiller-design');
  const [prospectTwitter, setProspectTwitter] = useState('https://x.com/jasonmiller_ui');
  const [prospectYouTube, setProspectYouTube] = useState('https://youtube.com/@designacademy_io');
  const [prospectInstagram, setProspectInstagram] = useState('https://instagram.com/designacademy.studio');
  const [prospectSubstack, setProspectSubstack] = useState('https://jasonmiller.substack.com');
  const [prospectCompany, setProspectCompany] = useState('DesignAcademy Studio');
  const [prospectBio, setProspectBio] = useState('Founder of DesignAcademy.io (15k UI/UX designer community, 120k newsletter readers). Transitioning from $47 ebook sales into high-ticket $2,997 Pro Career Sprints and $10k/mo agency retainers. Needs 24/7 after-hours voice qualification to handle European and Asian inbound leads.');
  const [selectedToneArchetype, setSelectedToneArchetype] = useState<'tactical_operator' | 'empathetic_mentor' | 'visionary_founder' | 'enterprise_advisor'>('tactical_operator');
  const [customLexicon, setCustomLexicon] = useState('growth sprint, funnel velocity, high-ticket, cohort');
  const [customBannedTerms, setCustomBannedTerms] = useState('cheap, guru, synergy, hard sell, magic bullet');
  const [customLinks, setCustomLinks] = useState<CustomLinkItem[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('default_demo');

  // Input fields for adding new lexicon words or banned terms via plus buttons
  const [newLexiconInput, setNewLexiconInput] = useState('');
  const [newBannedInput, setNewBannedInput] = useState('');

  // Saved Dossier Presets State (Browser LocalStorage + Built-in Public Archetypes)
  const [customPresets, setCustomPresets] = useState<DossierPreset[]>(() => {
    try {
      const saved = localStorage.getItem('growthvoice_custom_dossier_presets');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const allPresets = [...BUILT_IN_PRESETS, ...customPresets];

  const applyPreset = (preset: DossierPreset) => {
    setProspectName(preset.fullName || '');
    setProspectEmail(preset.email || '');
    setProspectWebsite(preset.website || '');
    setProspectLinkedIn(preset.linkedIn || '');
    setProspectTwitter(preset.twitter || '');
    setProspectYouTube(preset.youtube || '');
    setProspectInstagram(preset.instagram || '');
    setProspectSubstack(preset.substack || '');
    setProspectCompany(preset.companyName || '');
    setProspectBio(preset.bio || '');
    setSelectedToneArchetype(preset.toneArchetype || 'tactical_operator');
    setCustomLexicon(preset.customLexicon || '');
    setCustomBannedTerms(preset.customBannedTerms || '');
    setCustomLinks(preset.customLinks || []);
    setSelectedPresetId(preset.id);
  };

  const handleSelectPreset = (presetId: string) => {
    const found = allPresets.find((p) => p.id === presetId);
    if (found) {
      applyPreset(found);
    }
  };

  // Plus (+) Button Action: Create a New Blank Client Template
  const handleAddNewClient = () => {
    setProspectName('');
    setProspectEmail('');
    setProspectWebsite('');
    setProspectLinkedIn('');
    setProspectTwitter('');
    setProspectYouTube('');
    setProspectInstagram('');
    setProspectSubstack('');
    setProspectCompany('');
    setProspectBio('');
    setSelectedToneArchetype('tactical_operator');
    setCustomLexicon('');
    setCustomBannedTerms('');
    setCustomLinks([]);
    setSelectedPresetId('new_client_draft');
    setIsEnrichModalOpen(true);
    setMessages((prev) => [
      ...prev,
      {
        id: `new_client_${Date.now()}`,
        speaker: 'system',
        text: '➕ Initialized blank client dossier template. Enter client information and click "Save Preset" or "Save & Feed to Voice Agent".',
        timestamp: new Date().toLocaleTimeString()
      }
    ]);
  };

  // Minus (-) Button Action: Delete Current Custom Client
  const handleDeleteCurrentClient = (presetId?: string) => {
    const targetId = presetId || selectedPresetId;
    const current = allPresets.find((p) => p.id === targetId);
    if (!current || !current.isCustom) {
      alert('The default test client (Jason Miller / DesignAcademy Studio) is a built-in template and cannot be deleted.');
      return;
    }
    if (!window.confirm(`Delete client "${current.name}"? This will remove it from your local saved clients.`)) return;

    const updated = customPresets.filter((p) => p.id !== targetId);
    setCustomPresets(updated);
    try {
      localStorage.setItem('growthvoice_custom_dossier_presets', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to update localStorage', e);
    }
    handleSelectPreset('default_demo');
    setMessages((prev) => [
      ...prev,
      {
        id: `del_client_${Date.now()}`,
        speaker: 'system',
        text: `➖ Deleted client "${current.name}". Switched back to default test client (DesignAcademy Studio).`,
        timestamp: new Date().toLocaleTimeString()
      }
    ]);
  };

  const handleSaveCurrentAsCustomPreset = () => {
    const defaultTitle = prospectCompany || prospectName || 'My Custom Client';
    const name = window.prompt('Enter a title or nickname for this client:', defaultTitle);
    if (!name) return;

    const newPreset: DossierPreset = {
      id: `client_${Date.now()}`,
      name: `👤 ${name}`,
      fullName: prospectName,
      email: prospectEmail,
      website: prospectWebsite,
      linkedIn: prospectLinkedIn,
      twitter: prospectTwitter,
      youtube: prospectYouTube,
      instagram: prospectInstagram,
      substack: prospectSubstack,
      companyName: prospectCompany,
      bio: prospectBio,
      toneArchetype: selectedToneArchetype,
      customLexicon,
      customBannedTerms,
      customLinks,
      isCustom: true
    };

    const updated = [...customPresets.filter((p) => p.id !== newPreset.id), newPreset];
    setCustomPresets(updated);
    setSelectedPresetId(newPreset.id);
    try {
      localStorage.setItem('growthvoice_custom_dossier_presets', JSON.stringify(updated));
      fetch('/api/crm/local-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPreset)
      }).catch((e) => console.log('[Local profile save]', e));
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }

    setMessages((prev) => [
      ...prev,
      {
        id: `preset_${Date.now()}`,
        speaker: 'system',
        text: `💾 Saved Private Client Dossier: "${name}". Stored locally in your browser and vault!`,
        timestamp: new Date().toLocaleTimeString()
      }
    ]);
  };

  const handleResetToGenericDemo = () => {
    handleSelectPreset('default_demo');
  };

  // Tag Management with Plus (+) and Minus (-) for Lexicon
  const lexiconList = customLexicon
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const handleAddLexiconTag = () => {
    if (!newLexiconInput.trim()) return;
    const term = newLexiconInput.trim();
    if (!lexiconList.includes(term)) {
      const updated = [...lexiconList, term].join(', ');
      setCustomLexicon(updated);
    }
    setNewLexiconInput('');
  };

  const handleRemoveLexiconTag = (tagToRemove: string) => {
    const updated = lexiconList.filter((t) => t !== tagToRemove).join(', ');
    setCustomLexicon(updated);
  };

  // Tag Management with Plus (+) and Minus (-) for Banned Terms
  const bannedList = customBannedTerms
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const handleAddBannedTag = () => {
    if (!newBannedInput.trim()) return;
    const term = newBannedInput.trim();
    if (!bannedList.includes(term)) {
      const updated = [...bannedList, term].join(', ');
      setCustomBannedTerms(updated);
    }
    setNewBannedInput('');
  };

  const handleRemoveBannedTag = (tagToRemove: string) => {
    const updated = bannedList.filter((t) => t !== tagToRemove).join(', ');
    setCustomBannedTerms(updated);
  };

  // Custom Links (+ and -)
  const handleAddCustomLink = () => {
    setCustomLinks((prev) => [
      ...prev,
      { id: `link_${Date.now()}`, label: '', url: '' }
    ]);
  };

  const handleUpdateCustomLink = (id: string, field: 'label' | 'url', value: string) => {
    setCustomLinks((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleRemoveCustomLink = (id: string) => {
    setCustomLinks((prev) => prev.filter((item) => item.id !== id));
  };

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
    // Check if local private profile exists on disk
    fetch('/api/crm/local-profile')
      .then((res) => res.json())
      .then((data) => {
        if (data.exists && data.profile) {
          const lp = data.profile;
          applyPreset(lp);
          setCustomPresets((prev) => {
            const filtered = prev.filter((p) => p.id !== lp.id);
            return [lp, ...filtered];
          });
        }
      })
      .catch((err) => console.log('[API Local Profile]', err.message));

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

  // System Prompts & Greetings Infused with Dynamic Client Brand Voice
  const getPersonaConfig = (persona: OperatingPersona) => {
    const comp = prospectCompany || 'DesignAcademy Studio';
    const toneLabel =
      selectedToneArchetype === 'empathetic_mentor'
        ? 'Empathetic Mentor'
        : selectedToneArchetype === 'visionary_founder'
        ? 'Visionary Founder'
        : selectedToneArchetype === 'enterprise_advisor'
        ? 'Enterprise Advisor'
        : 'Tactical Operator';

    const toneRule =
      selectedToneArchetype === 'empathetic_mentor'
        ? 'Speak with warmth, deep encouragement, and supportive guidance.'
        : selectedToneArchetype === 'visionary_founder'
        ? 'Speak with visionary enthusiasm and high conviction regarding AI and creative leverage.'
        : selectedToneArchetype === 'enterprise_advisor'
        ? 'Maintain a structured, consultative executive demeanor focused on ROI and risk mitigation.'
        : 'Be direct, tactical, and relentlessly execution-focused.';

    const brandVoiceInstructions = `You represent ${comp}. Tone: ${toneLabel} (${toneRule}). Signature vocabulary to incorporate: ${customLexicon}. Strictly avoid banned terms: ${customBannedTerms}.`;

    switch (persona) {
      case 'inbound':
        return {
          title: `After-Hours Inbound Admissions SDR (${comp})`,
          prompt: `You are Anna, the elite AI Admissions Director for ${comp}. ${brandVoiceInstructions} Warmly qualify inbound prospects using BANT criteria, answer curriculum and pricing questions using get_product_knowledge, and schedule strategy consultations.`,
          greeting: `Hey there! Welcome to ${comp}. I'm Anna, your AI admissions director. What brings you to our program today?`
        };
      case 'outbound':
        return {
          title: `Outbound Lead Reactivation Specialist (${comp})`,
          prompt: `You are Anna, conducting warm outreach on behalf of ${comp}. ${brandVoiceInstructions} Inquire about their launch progress, address hesitation with our 14-day action guarantee, and offer a private sprint.`,
          greeting: `Hi there! Following up from ${comp} regarding your project. How is your launch progressing?`
        };
      case 'churn':
        return {
          title: `Churn Save & Margin Guardrail (${comp})`,
          prompt: `You are the empathetic Retention Specialist for ${comp}. A member wants to cancel. Listen to their reason, offer to pause or apply our policy discount (up to 15%), and log their feedback.`,
          greeting: `Hi Sarah, I see you requested to discuss your ${comp} membership. How can I help today?`
        };
      case 'onboarding':
        return {
          title: `VIP Student Onboarding Concierge (${comp})`,
          prompt: `You are Anna, the VIP Onboarding Concierge for ${comp}. ${brandVoiceInstructions} Guide newly enrolled high-ticket members through workspace setup and schedule their 1-on-1 Kickoff Call.`,
          greeting: `Welcome to the ${comp} family! I am here to help you get your workspace, community credentials, and 1-on-1 kickoff session locked in. Ready to get started?`
        };
      case 'affiliate':
        return {
          title: `Affiliate & Strategic Partner Scout (${comp})`,
          prompt: `You are Anna, vetting incoming partnership inquiries for ${comp}. ${brandVoiceInstructions}`,
          greeting: `Thanks for reaching out about ${comp}'s partner program. What niche and audience size are you currently reaching?`
        };
      case 'diagnostic':
        return {
          title: `Executive Diagnostic Advisor ($10k+) (${comp})`,
          prompt: `You are Anna, senior growth architect for ${comp}. Conduct a strategic discovery audit examining team structure, customer acquisition cost, and revenue bottlenecks.`,
          greeting: `Welcome to the ${comp} Executive Diagnostic. Could you walk me through your current monthly revenue run-rate and primary growth bottleneck?`
        };
      default:
        return {
          title: `Admissions Director (${comp})`,
          prompt: `You are Anna representing ${comp}. ${brandVoiceInstructions}`,
          greeting: `Hello! Welcome to ${comp}. How can I assist you today?`
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
      const tokenRes = await fetch('/api/voice/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: prospectCompany,
          persona: selectedScenario,
          toneArchetype: selectedToneArchetype
        })
      });
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
            const userText = msg.text || msg.transcript || msg.delta || msg.content || '';
            if (userText) {
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last && last.speaker === 'user' && last.isPartial) {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    ...last,
                    text: userText,
                    isPartial: false
                  };
                  return updated;
                }
                return [
                  ...prev,
                  {
                    id: `u_${Date.now()}`,
                    speaker: 'user',
                    text: userText,
                    isPartial: false,
                    timestamp: new Date().toLocaleTimeString()
                  }
                ];
              });
            }
          } else if (msg.type === 'transcript.user.delta') {
            const deltaText = msg.delta || msg.text || '';
            if (deltaText) {
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last && last.speaker === 'user' && last.isPartial) {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    ...last,
                    text: last.text + deltaText
                  };
                  return updated;
                }
                return [
                  ...prev,
                  {
                    id: `u_${Date.now()}`,
                    speaker: 'user',
                    text: deltaText,
                    isPartial: true,
                    timestamp: new Date().toLocaleTimeString()
                  }
                ];
              });
            }
          } else if (msg.type === 'transcript.agent') {
            const agentText = msg.text || msg.transcript || msg.delta || msg.content || '';
            if (agentText) {
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last && last.speaker === 'agent' && last.isPartial) {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    ...last,
                    text: agentText,
                    isPartial: false
                  };
                  return updated;
                }
                return [
                  ...prev,
                  {
                    id: `a_${Date.now()}`,
                    speaker: 'agent',
                    text: agentText,
                    isPartial: false,
                    timestamp: new Date().toLocaleTimeString()
                  }
                ];
              });
            }
          } else if (msg.type === 'transcript.agent.delta') {
            const deltaText = msg.delta || msg.text || '';
            if (deltaText) {
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last && last.speaker === 'agent' && last.isPartial) {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    ...last,
                    text: last.text + deltaText
                  };
                  return updated;
                }
                return [
                  ...prev,
                  {
                    id: `a_${Date.now()}`,
                    speaker: 'agent',
                    text: deltaText,
                    isPartial: true,
                    timestamp: new Date().toLocaleTimeString()
                  }
                ];
              });
            }
          } else if (msg.type === 'input.speech.started') {
            setIsUserSpeaking(true);
          } else if (msg.type === 'input.speech.stopped') {
            setIsUserSpeaking(false);
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

  // Send Typed Message to Voice Agent & Sync to Obsidian Vault
  const handleSendTextMessage = async (text: string) => {
    if (!text.trim()) return;
    setIsSendingMessage(true);

    const now = new Date().toLocaleTimeString();
    // 1. Instantly display user typed message in transcript HUD
    setMessages((prev) => [
      ...prev,
      {
        id: `u_typed_${Date.now()}`,
        speaker: 'user',
        text: text,
        timestamp: now
      }
    ]);

    try {
      // 2. Call backend endpoint POST /api/voice/chat
      const res = await fetch('/api/voice/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          prospect: {
            name: prospectName,
            email: prospectEmail,
            website: prospectWebsite,
            linkedIn: prospectLinkedIn,
            company: prospectCompany,
            bio: prospectBio,
            toneArchetype: selectedToneArchetype
          }
        })
      });

      const data = await res.json();

      if (data.reply) {
        // 3. Display Anna's reply in transcript HUD
        setMessages((prev) => [
          ...prev,
          {
            id: `a_reply_${Date.now()}`,
            speaker: 'agent',
            text: data.reply,
            timestamp: new Date().toLocaleTimeString()
          }
        ]);

        // 4. Also speak Anna's reply aloud using SpeechSynthesis if supported
        if ('speechSynthesis' in window && !isAgentSpeaking) {
          try {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(data.reply);
            utterance.rate = 1.05;
            utterance.pitch = 1.0;
            const voices = window.speechSynthesis.getVoices();
            const femaleVoice = voices.find(
              (v) =>
                (v.name.includes('Samantha') ||
                  v.name.includes('Karen') ||
                  v.name.includes('Zira') ||
                  v.name.includes('Google') ||
                  v.name.includes('Female')) &&
                v.lang.startsWith('en')
            ) || voices.find((v) => v.lang.startsWith('en'));
            if (femaleVoice) utterance.voice = femaleVoice;

            utterance.onstart = () => setIsAgentSpeaking(true);
            utterance.onend = () => setIsAgentSpeaking(false);
            utterance.onerror = () => setIsAgentSpeaking(false);
            window.speechSynthesis.speak(utterance);
          } catch (e) {
            console.error('[SpeechSynthesis Error]', e);
          }
        }
      }

      // If a lead was created or updated, refresh CRM leads and add tool execution chip
      if (data.lead) {
        const leadsRes = await fetch('/api/crm/leads');
        const leadsData = await leadsRes.json();
        if (leadsData.leads) setLeads(leadsData.leads);

        setActiveTools((prev) => [
          ...prev,
          {
            id: `tool_${Date.now()}`,
            name: 'sync_lead_vault_dossier',
            args: { email: data.lead.email, company: data.lead.companyName, phone: data.lead.phone },
            result: {
              status: 'success',
              vaultPath: data.vaultPath,
              message: `Dedicated client folder and dossier created at ${data.vaultPath}`
            },
            status: 'completed'
          }
        ]);
      }
    } catch (err) {
      console.error('[handleSendTextMessage error]', err);
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Submit Prospect Website / Social Platforms Context Enrichment
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
            socialLinks: {
              twitter: prospectTwitter,
              linkedin: prospectLinkedIn,
              youtube: prospectYouTube,
              instagram: prospectInstagram,
              substack: prospectSubstack
            },
            socialBioText: prospectBio,
            companyName: prospectCompany,
            businessSummary: prospectBio,
            toneArchetype: selectedToneArchetype
          }
        })
      });
      const data = await res.json();

      // Refresh leads
      const leadsRes = await fetch('/api/crm/leads');
      const leadsData = await leadsRes.json();
      if (leadsData.leads) setLeads(leadsData.leads);

      const targetCompany = prospectCompany || prospectName || 'Client';
      const safeFolder = targetCompany.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_');

      const toneDisplay =
        selectedToneArchetype === 'empathetic_mentor'
          ? 'Empathetic Mentor'
          : selectedToneArchetype === 'visionary_founder'
          ? 'Visionary Founder'
          : selectedToneArchetype === 'enterprise_advisor'
          ? 'Enterprise Advisor'
          : 'Tactical Operator';

      setMessages((prev) => [
        ...prev,
        {
          id: `enrich_${Date.now()}`,
          speaker: 'system',
          text: `📁 Dossier & Brand Voice Saved: vault/Clients/${safeFolder}/BrandVoice.md & Dossier.md | Calibrated as ${toneDisplay} for ${prospectName} (${prospectCompany || 'Brand'}).`,
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

  const handleTriggerAuditJob = async (params: {
    companyOrCreator: string;
    website?: string;
    triggerEvent: string;
    socialLinks?: any;
    socialBioText?: string;
  }) => {
    try {
      const res = await fetch('/api/content/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...params, speaker: 'sdr_outbound' })
      });
      const data = await res.json();
      console.log('[SOP Audit Queued]', data);
    } catch (err: any) {
      console.error('[SOP Audit Error]', err.message);
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
    <div className="min-h-screen bg-[#05070f] text-slate-100 flex flex-col relative overflow-x-hidden">
      {/* Vercel-Grade Ambient GPU Background Shader Canvas */}
      <AmbientVercelShader />

      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-50">
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

        {/* Tab Switcher & 3D Spatial Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIs3DSpatialMode(!is3DSpatialMode)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all border ${
              is3DSpatialMode
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle 3D Spatial Depth Perspective (Cindy Zhu Scrollytelling Depth)"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>{is3DSpatialMode ? '3D Depth: ON' : '3D Depth: OFF'}</span>
          </button>

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
        </div>
      </header>

      {/* Main Workspace Body with Optional 3D Spatial Depth Perspective */}
      <main
        className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6 relative z-10 transition-all duration-700"
        style={
          is3DSpatialMode
            ? {
                perspective: '1400px',
                transformStyle: 'preserve-3d',
                transform: 'rotateX(3.5deg) scale(0.985)',
                boxShadow: '0 30px 80px rgba(0,0,0,0.8)'
              }
            : {}
        }
      >
        {activeTab === 'console' && (
          <div className="space-y-6">
            {/* Explainer & Mental Model Banner */}
            <div className="p-4.5 rounded-2xl bg-gradient-to-r from-blue-950/40 via-slate-900/60 to-purple-950/40 border border-blue-800/40 backdrop-blur-xl flex flex-col xl:flex-row xl:items-center justify-between gap-4 shadow-xl">
              <div className="flex items-start space-x-3.5 max-w-3xl">
                <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex-shrink-0 mt-0.5">
                  <Info className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center space-x-2">
                    <span>Live Roleplay & Simulator Architecture</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 font-semibold normal-case">
                      Full-Duplex VAD
                    </span>
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    In production, this voice widget lives on the <strong>Creator's website</strong>. When an after-hours <strong>Prospective Buyer</strong> speaks, <strong>Anna</strong> qualifies their BANT budget, books consultations, and saves the objection into the <strong>Persistent Knowledge Graph</strong> below.
                  </p>
                </div>
              </div>

              {/* Client Manager Bar with Plus (+) & Minus (-) Controls */}
              <div className="flex flex-wrap items-center gap-2 self-start xl:self-center">
                <div className="flex items-center space-x-1.5 bg-slate-900/90 border border-slate-800 rounded-xl p-1 shadow-sm">
                  <Bookmark className="w-3.5 h-3.5 text-cyan-400 ml-2 flex-shrink-0" />
                  <select
                    value={selectedPresetId}
                    onChange={(e) => handleSelectPreset(e.target.value)}
                    className="bg-transparent text-slate-200 text-xs font-medium focus:outline-none px-2 py-1 max-w-[190px] truncate font-mono cursor-pointer"
                    title="Switch active client dossier"
                  >
                    <optgroup label="🌟 Public Demo Archetypes">
                      {BUILT_IN_PRESETS.map((p) => (
                        <option key={p.id} value={p.id} className="bg-slate-900 text-slate-200">
                          {p.companyName || p.name}
                        </option>
                      ))}
                    </optgroup>
                    {customPresets.length > 0 && (
                      <optgroup label="💾 My Saved Clients (Local)">
                        {customPresets.map((p) => (
                          <option key={p.id} value={p.id} className="bg-slate-900 text-slate-200">
                            {p.companyName || p.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>

                  {/* [+] Add Client Button */}
                  <button
                    type="button"
                    onClick={handleAddNewClient}
                    title="Add a new client dossier (+)"
                    className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500/50 text-cyan-200 text-xs font-semibold transition-all shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>

                  {/* [-] Delete Client Button */}
                  <button
                    type="button"
                    onClick={() => handleDeleteCurrentClient()}
                    title={
                      allPresets.find((p) => p.id === selectedPresetId)?.isCustom
                        ? "Delete current client (-)"
                        : "Default demo client is protected from deletion"
                    }
                    className={`p-1.5 rounded-lg border transition-all ${
                      allPresets.find((p) => p.id === selectedPresetId)?.isCustom
                        ? "bg-red-950/40 hover:bg-red-900/60 border-red-800/50 text-red-300 cursor-pointer"
                        : "bg-slate-950/40 border-slate-800/50 text-slate-600 cursor-not-allowed"
                    }`}
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={() => setIsEnrichModalOpen(true)}
                  className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500/40 text-cyan-200 text-xs font-semibold whitespace-nowrap transition-all shadow-md shadow-cyan-600/20"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Edit Dossier & Brand Voice</span>
                </button>
              </div>
            </div>

            {/* Brand Voice Layer Selector Bar */}
            <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-800/40 backdrop-blur-sm space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span className="font-semibold text-slate-200">Active Brand Voice Persona:</span>
                  <span className="font-mono text-indigo-300 font-semibold px-2 py-0.5 rounded bg-indigo-900/50 border border-indigo-700/50">
                    {prospectCompany || 'DesignAcademy Studio'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                  Dynamically Infused into AssemblyAI (Anna) & Hermes Content Factory
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  onClick={() => setSelectedToneArchetype('tactical_operator')}
                  className={`px-3 py-2 rounded-lg text-xs text-left transition-all border ${
                    selectedToneArchetype === 'tactical_operator'
                      ? 'bg-indigo-600/30 border-indigo-400 text-indigo-200 shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-semibold">⚡ Tactical Operator</div>
                  <div className="text-[10px] text-slate-400">Direct & Metrics-Driven</div>
                </button>
                <button
                  onClick={() => setSelectedToneArchetype('empathetic_mentor')}
                  className={`px-3 py-2 rounded-lg text-xs text-left transition-all border ${
                    selectedToneArchetype === 'empathetic_mentor'
                      ? 'bg-indigo-600/30 border-indigo-400 text-indigo-200 shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-semibold">🌱 Empathetic Mentor</div>
                  <div className="text-[10px] text-slate-400">Warm & Guided Cohorts</div>
                </button>
                <button
                  onClick={() => setSelectedToneArchetype('visionary_founder')}
                  className={`px-3 py-2 rounded-lg text-xs text-left transition-all border ${
                    selectedToneArchetype === 'visionary_founder'
                      ? 'bg-indigo-600/30 border-indigo-400 text-indigo-200 shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-semibold">🚀 Visionary Founder</div>
                  <div className="text-[10px] text-slate-400">Next-Gen AI & Leverage</div>
                </button>
                <button
                  onClick={() => setSelectedToneArchetype('enterprise_advisor')}
                  className={`px-3 py-2 rounded-lg text-xs text-left transition-all border ${
                    selectedToneArchetype === 'enterprise_advisor'
                      ? 'bg-indigo-600/30 border-indigo-400 text-indigo-200 shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-semibold">🏛️ Enterprise Advisor</div>
                  <div className="text-[10px] text-slate-400">ROI, SLAs & Governance</div>
                </button>
              </div>
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

            {/* Front-and-Center Audio Visualizer & 3D Neural Orb */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="uppercase font-semibold">Front-and-Center Audio Engine</span>
                </div>
                <div className="flex items-center space-x-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[11px] font-mono">
                  <button
                    onClick={() => setAudioVisualizerType('orb')}
                    className={`px-2.5 py-1 rounded transition-all ${
                      audioVisualizerType === 'orb'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    3D Neural Orb (GPU)
                  </button>
                  <button
                    onClick={() => setAudioVisualizerType('waveform')}
                    className={`px-2.5 py-1 rounded transition-all ${
                      audioVisualizerType === 'waveform'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    2D Waveform
                  </button>
                </div>
              </div>

              {audioVisualizerType === 'orb' ? (
                <NeuralAudioOrb
                  isActive={isCalling}
                  isAgentSpeaking={isAgentSpeaking}
                  isUserSpeaking={isUserSpeaking}
                  agentName="Anna (Voice Agent)"
                  samplingRate="24,000 Hz PCM16"
                  modelName="universal-3-5-pro + Claude 3.5"
                />
              ) : (
                <AudioWaveform
                  isActive={isCalling}
                  isAgentSpeaking={isAgentSpeaking}
                  isUserSpeaking={isUserSpeaking}
                />
              )}
            </div>

            {/* Live Interaction HUD */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <LiveTranscriptHUD
                  messages={messages}
                  activeTools={activeTools}
                  onSendMessage={handleSendTextMessage}
                  isSendingMessage={isSendingMessage}
                  activeBrandVoice={{
                    companyName: prospectCompany || 'DesignAcademy Studio',
                    toneLabel:
                      selectedToneArchetype === 'empathetic_mentor'
                        ? 'Empathetic Mentor'
                        : selectedToneArchetype === 'visionary_founder'
                        ? 'Visionary Founder'
                        : selectedToneArchetype === 'enterprise_advisor'
                        ? 'Enterprise Advisor'
                        : 'Tactical Operator'
                  }}
                />
              </div>

              {/* Quick Interactive Simulator & Telemetry Sidebar */}
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl space-y-3 shadow-xl">
                  <div className="flex items-center justify-between text-xs font-mono text-cyan-400">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                      <span className="font-semibold uppercase tracking-wider">Interactive Simulation Drivers:</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">1-Click Live Test</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Drive the buyer persona in real-time or trigger deterministic guardrail clamping:
                  </p>

                  <div className="space-y-2.5">
                    {/* Card 1: BANT Inbound */}
                    <div
                      onClick={() => {
                        setActiveSimulationKey('lead_inbound');
                        triggerSimulationStep('lead_inbound');
                        setTimeout(() => setActiveSimulationKey(null), 2500);
                      }}
                      className="group p-3 rounded-xl bg-slate-950/80 hover:bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 cursor-pointer transition-all space-y-1.5 shadow-sm relative overflow-hidden"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
                          <span className="font-semibold text-xs text-slate-100 group-hover:text-cyan-300 transition-colors">
                            High-Ticket Inbound ($10k BANT)
                          </span>
                        </div>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
                          {activeSimulationKey === 'lead_inbound' ? 'RUNNING...' : '▶ RUN'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Simulates founder inquiring about $2,997 sprint + $10k agency retainer. Anna qualifies budget &amp; books call.
                      </p>
                      <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-700 ${
                            activeSimulationKey === 'lead_inbound' ? 'w-full' : 'w-1/3'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Card 2: Churn Clamp */}
                    <div
                      onClick={() => {
                        setActiveSimulationKey('churn_clamp');
                        triggerSimulationStep('churn_clamp');
                        setTimeout(() => setActiveSimulationKey(null), 2500);
                      }}
                      className="group p-3 rounded-xl bg-slate-950/80 hover:bg-slate-900/90 border border-slate-800 hover:border-amber-500/50 cursor-pointer transition-all space-y-1.5 shadow-sm relative overflow-hidden"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)] animate-pulse" />
                          <span className="font-semibold text-xs text-slate-100 group-hover:text-amber-300 transition-colors">
                            Churn Save (Guardrail Clamp 35% → 15%)
                          </span>
                        </div>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-800/50">
                          {activeSimulationKey === 'churn_clamp' ? 'RUNNING...' : '▶ RUN'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Simulates angry subscriber demanding 50% refund. Clamps to maximum 15% policy concession with empathy.
                      </p>
                      <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all duration-700 ${
                            activeSimulationKey === 'churn_clamp' ? 'w-full' : 'w-1/3'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Card 3: Spoken Content Factory */}
                    <div
                      onClick={() => {
                        setActiveSimulationKey('content_factory_spoken');
                        triggerSimulationStep('content_factory_spoken');
                        setTimeout(() => setActiveSimulationKey(null), 2500);
                      }}
                      className="group p-3 rounded-xl bg-slate-950/80 hover:bg-slate-900/90 border border-slate-800 hover:border-purple-500/50 cursor-pointer transition-all space-y-1.5 shadow-sm relative overflow-hidden"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)] animate-pulse" />
                          <span className="font-semibold text-xs text-slate-100 group-hover:text-purple-300 transition-colors">
                            Spoken Voice: Hermes Content Factory
                          </span>
                        </div>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-950/60 text-purple-400 border border-purple-800/50">
                          {activeSimulationKey === 'content_factory_spoken' ? 'RUNNING...' : '▶ RUN'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Founder gives verbal brief on call. System spins up 3 parallel research lanes &amp; synthesizes multi-channel pack.
                      </p>
                      <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-700 ${
                            activeSimulationKey === 'content_factory_spoken' ? 'w-full' : 'w-1/3'
                          }`}
                        />
                      </div>
                    </div>
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

        {activeTab === 'crm' && (
          <CrmKanban
            leads={leads}
            members={members}
            onSimulateLead={() => triggerSimulationStep('lead_inbound')}
          />
        )}

        {activeTab === 'content' && (
          <ContentFactoryStudio
            jobs={jobs}
            onTriggerJob={handleTriggerContentJob}
            onTriggerAudit={handleTriggerAuditJob}
            onApproveJob={handleApproveContentJob}
          />
        )}

        {activeTab === 'evals' && <EvalsDashboard />}
        {activeTab === 'graph' && <GraphViewHUD />}
      </main>

      {/* Prospect Dossier Enrichment Modal */}
      {isEnrichModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-3xl bg-slate-900 border border-cyan-700/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150 my-auto">
            {/* Sticky Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80 flex-shrink-0">
              <div className="flex items-center space-x-3 text-cyan-400">
                <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Prospect Business Dossier & Brand Voice Matrix</h3>
                  <p className="text-[11px] text-slate-400">Calibrate client website context, audience persona, and RAG knowledge for Anna</p>
                </div>
              </div>
              <button
                onClick={() => setIsEnrichModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form id="dossier-form" onSubmit={handleEnrichProspect} className="p-6 space-y-4 text-xs overflow-y-auto flex-1 custom-scrollbar">
              <p className="text-slate-400 leading-relaxed">
                Provide the prospect's website, LinkedIn profile, or business bio so Anna can research their business model and tailor questions during the call.
              </p>

              {/* Preset Profile Bar with Plus (+) / Minus (-) Client Management */}
              <div className="p-3.5 rounded-xl bg-slate-950/90 border border-cyan-800/50 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-cyan-300 font-semibold font-mono text-xs">
                    <Bookmark className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Client Dossier & Profile:</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60 font-mono">
                    {allPresets.find((p) => p.id === selectedPresetId)?.isCustom ? '🔒 Local Private Client' : '🌟 Pre-built Public Demo'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={selectedPresetId}
                    onChange={(e) => handleSelectPreset(e.target.value)}
                    className="flex-1 min-w-[200px] px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs font-medium focus:outline-none focus:border-cyan-500 font-mono"
                  >
                    <optgroup label="🌟 Public Built-in Archetypes">
                      {BUILT_IN_PRESETS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </optgroup>
                    {customPresets.length > 0 && (
                      <optgroup label="💾 My Saved Clients (Local Disk & Browser)">
                        {customPresets.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>

                  {/* (+) Add Client Button */}
                  <button
                    type="button"
                    onClick={handleAddNewClient}
                    title="Add a new client (+)"
                    className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500/50 text-cyan-200 text-xs font-semibold whitespace-nowrap transition-all shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Client</span>
                  </button>

                  {/* (-) Delete Client Button */}
                  <button
                    type="button"
                    onClick={() => handleDeleteCurrentClient(selectedPresetId)}
                    title={
                      allPresets.find((p) => p.id === selectedPresetId)?.isCustom
                        ? "Delete this custom client (-)"
                        : "Built-in public demo is protected from deletion"
                    }
                    className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-xl border text-xs font-semibold whitespace-nowrap transition-all ${
                      allPresets.find((p) => p.id === selectedPresetId)?.isCustom
                        ? "bg-red-950/40 hover:bg-red-900/60 border-red-800/50 text-red-300 cursor-pointer"
                        : "bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed"
                    }`}
                  >
                    <Minus className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>

                  {/* Save Client Preset */}
                  <button
                    type="button"
                    onClick={handleSaveCurrentAsCustomPreset}
                    title="Save current info as a client preset"
                    className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/40 text-emerald-300 text-xs font-semibold whitespace-nowrap transition-all"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save</span>
                  </button>

                  {/* Reset to Generic Demo */}
                  <button
                    type="button"
                    onClick={handleResetToGenericDemo}
                    title="Reset to default test demo (Jason Miller / DesignAcademy Studio)"
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-all"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Privacy Shield Info Banner */}
                <div className="flex items-center space-x-2 text-[10px] text-slate-400 bg-slate-900/60 px-2.5 py-1.5 rounded-lg border border-slate-800">
                  <Lock className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                  <span>
                    <strong>Local Vault Isolation:</strong> All clients saved here are stored in <code className="text-cyan-300 font-mono">vault/Clients/</code> (gitignored). Anyone cloning this repo only sees the clean generic test demo.
                  </span>
                </div>
              </div>

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

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-slate-300 font-mono flex items-center space-x-1.5">
                    <Linkedin className="w-3.5 h-3.5 text-blue-400" />
                    <span>LinkedIn:</span>
                  </label>
                  <input
                    type="url"
                    value={prospectLinkedIn}
                    onChange={(e) => setProspectLinkedIn(e.target.value)}
                    placeholder="https://linkedin.com/in/..."
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-mono flex items-center space-x-1.5">
                    <span className="text-cyan-400 font-bold">𝕏</span>
                    <span>Twitter/X:</span>
                  </label>
                  <input
                    type="url"
                    value={prospectTwitter}
                    onChange={(e) => setProspectTwitter(e.target.value)}
                    placeholder="https://x.com/..."
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-300 font-mono flex items-center space-x-1.5">
                      <span className="text-red-400 font-bold">▶</span>
                      <span>YouTube:</span>
                    </label>
                    {prospectYouTube && (
                      <button
                        type="button"
                        onClick={() => setProspectYouTube('')}
                        title="Clear YouTube (-)"
                        className="text-[10px] text-slate-500 hover:text-red-400 font-mono"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <input
                    type="url"
                    value={prospectYouTube}
                    onChange={(e) => setProspectYouTube(e.target.value)}
                    placeholder="https://youtube.com/@..."
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-300 font-mono flex items-center space-x-1.5">
                      <span className="text-amber-400 font-bold">✉</span>
                      <span>Substack / Newsletter:</span>
                    </label>
                    {prospectSubstack && (
                      <button
                        type="button"
                        onClick={() => setProspectSubstack('')}
                        title="Clear Substack (-)"
                        className="text-[10px] text-slate-500 hover:text-red-400 font-mono"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <input
                    type="url"
                    value={prospectSubstack}
                    onChange={(e) => setProspectSubstack(e.target.value)}
                    placeholder="https://....substack.com"
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono text-xs"
                  />
                </div>
              </div>

              {/* Dynamic Custom Channels / Info Links with Plus (+) and Minus (-) */}
              <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/60 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-mono text-[11px] font-semibold flex items-center space-x-1.5">
                    <Link2 className="w-3 h-3 text-cyan-400" />
                    <span>Additional Channels & Resources:</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAddCustomLink}
                    title="Add custom channel or URL (+)"
                    className="flex items-center space-x-1 px-2 py-0.5 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-800/60 text-cyan-300 text-[11px] font-mono transition-all"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Channel</span>
                  </button>
                </div>

                {customLinks.length === 0 ? (
                  <div className="text-[10px] text-slate-500 italic">
                    Add optional channels (Discord, GitHub, TikTok, Skool, Podcast, Docs) with the (+) button above.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {customLinks.map((link) => (
                      <div key={link.id} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={link.label}
                          onChange={(e) => handleUpdateCustomLink(link.id, 'label', e.target.value)}
                          placeholder="Platform (e.g. Discord)"
                          className="w-1/3 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs font-mono focus:outline-none focus:border-cyan-500"
                        />
                        <input
                          type="url"
                          value={link.url}
                          onChange={(e) => handleUpdateCustomLink(link.id, 'url', e.target.value)}
                          placeholder="https://..."
                          className="flex-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs font-mono focus:outline-none focus:border-cyan-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomLink(link.id)}
                          title="Delete channel (-)"
                          className="p-1 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-800/50 text-red-400 transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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

              {/* Brand Voice Layer Configuration */}
              <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-800/40 space-y-3">
                <div className="flex items-center space-x-2 text-indigo-300 font-semibold font-mono">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Brand Voice & Persona Calibration</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'tactical_operator', label: '⚡ Tactical Operator', desc: 'Direct & Metrics' },
                    { id: 'empathetic_mentor', label: '🌱 Empathetic Mentor', desc: 'Warm & Guided' },
                    { id: 'visionary_founder', label: '🚀 Visionary Founder', desc: 'Next-Gen AI' },
                    { id: 'enterprise_advisor', label: '🏛️ Enterprise Advisor', desc: 'ROI & Governance' }
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedToneArchetype(t.id as any)}
                      className={`p-2 rounded-lg text-left transition-all border ${
                        selectedToneArchetype === t.id
                          ? 'bg-indigo-600/30 border-indigo-400 text-indigo-200 shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-medium text-[11px]">{t.label}</div>
                      <div className="text-[9px] text-slate-500">{t.desc}</div>
                    </button>
                  ))}
                </div>

                {/* Lexicon & Banned Terms with Plus (+) and Minus (-) Item Management */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {/* Signature Lexicon */}
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-slate-300 font-mono text-[11px] font-semibold flex items-center space-x-1.5">
                        <Tag className="w-3 h-3 text-indigo-400" />
                        <span>Signature Lexicon (Favorite Words):</span>
                      </label>
                      <span className="text-[10px] text-indigo-400 font-mono">{lexiconList.length} terms</span>
                    </div>

                    {/* Tag Pills with Minus (-) to remove */}
                    <div className="flex flex-wrap gap-1.5 min-h-[32px] p-1.5 bg-slate-950 rounded-lg border border-slate-900">
                      {lexiconList.length === 0 ? (
                        <span className="text-[10px] text-slate-600 italic">No favorite words added yet.</span>
                      ) : (
                        lexiconList.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-indigo-950/60 border border-indigo-800/60 text-indigo-300 text-[11px] font-mono"
                          >
                            <span>{tag}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveLexiconTag(tag)}
                              title={`Remove "${tag}" (-)`}
                              className="text-indigo-400 hover:text-red-400 font-bold ml-1 transition-colors"
                            >
                              ✕
                            </button>
                          </span>
                        ))
                      )}
                    </div>

                    {/* Add Word Input with Plus (+) button */}
                    <div className="flex items-center space-x-1.5">
                      <input
                        type="text"
                        value={newLexiconInput}
                        onChange={(e) => setNewLexiconInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddLexiconTag();
                          }
                        }}
                        placeholder="Add word or phrase..."
                        className="flex-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleAddLexiconTag}
                        title="Add to Lexicon (+)"
                        className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 text-xs font-semibold transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>

                  {/* Banned Terms */}
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-slate-300 font-mono text-[11px] font-semibold flex items-center space-x-1.5">
                        <ShieldAlert className="w-3 h-3 text-red-400" />
                        <span>Banned Terms (Never Say):</span>
                      </label>
                      <span className="text-[10px] text-red-400 font-mono">{bannedList.length} banned</span>
                    </div>

                    {/* Banned Tag Pills with Minus (-) to remove */}
                    <div className="flex flex-wrap gap-1.5 min-h-[32px] p-1.5 bg-slate-950 rounded-lg border border-slate-900">
                      {bannedList.length === 0 ? (
                        <span className="text-[10px] text-slate-600 italic">No banned terms configured.</span>
                      ) : (
                        bannedList.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-red-950/50 border border-red-800/60 text-red-300 text-[11px] font-mono"
                          >
                            <span>{tag}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveBannedTag(tag)}
                              title={`Remove banned term "${tag}" (-)`}
                              className="text-red-400 hover:text-white font-bold ml-1 transition-colors"
                            >
                              ✕
                            </button>
                          </span>
                        ))
                      )}
                    </div>

                    {/* Add Banned Input with Plus (+) button */}
                    <div className="flex items-center space-x-1.5">
                      <input
                        type="text"
                        value={newBannedInput}
                        onChange={(e) => setNewBannedInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddBannedTag();
                          }
                        }}
                        placeholder="Add banned term..."
                        className="flex-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-red-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleAddBannedTag}
                        title="Add Banned Term (+)"
                        className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-red-950/60 hover:bg-red-900/80 border border-red-800/60 text-red-200 text-xs font-semibold transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-mono flex items-center justify-between">
                  <span>Client Social Footprint & Audience Bio Context (For Analysis):</span>
                  <span className="text-[10px] text-cyan-400 font-normal">Feeds RAG & Voice Agent</span>
                </label>
                <textarea
                  rows={3}
                  value={prospectBio}
                  onChange={(e) => setProspectBio(e.target.value)}
                  placeholder="Paste client social links, follower stats, community size (Discord/Skool/Substack), current offer tiers, and key audience pain points..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono text-xs leading-relaxed"
                />
              </div>

            </form>

            {/* Sticky Modal Action Footer */}
            <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/90 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
              <div className="flex items-center space-x-2 text-[11px] text-slate-400 font-mono">
                <Lock className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span>Stored locally in <code className="text-cyan-300">vault/Clients/</code> • Zero Git Leakage</span>
              </div>
              <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setIsEnrichModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="dossier-form"
                  className="flex items-center space-x-2 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Save & Feed to Voice Agent</span>
                </button>
              </div>
            </div>
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
