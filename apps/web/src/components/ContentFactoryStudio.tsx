import React, { useState } from 'react';
import { ContentFactoryJob, SocialPlatformLinks } from '@voice-os/shared';
import {
  Search,
  CheckCircle2,
  Send,
  Copy,
  Check,
  Twitter,
  Linkedin,
  Instagram,
  Youtube,
  Mail,
  Video,
  AlertTriangle,
  Flame,
  Maximize2,
  Minimize2,
  ExternalLink,
  FileText,
  Sparkles,
  Target,
  Clock,
  TrendingDown,
  ShieldAlert,
  Mic,
  PlusCircle,
  X,
  Share2
} from 'lucide-react';

interface ContentFactoryStudioProps {
  jobs: ContentFactoryJob[];
  onTriggerJob: (topic: string) => Promise<void>;
  onTriggerAudit?: (params: {
    companyOrCreator: string;
    website?: string;
    triggerEvent: string;
    socialLinks?: SocialPlatformLinks;
    socialBioText?: string;
  }) => Promise<void>;
  onApproveJob: (id: string) => Promise<void>;
}

export const ContentFactoryStudio: React.FC<ContentFactoryStudioProps> = ({
  jobs,
  onTriggerJob,
  onTriggerAudit,
  onApproveJob
}) => {
  const [selectedJobId, setSelectedJobId] = useState<string>(jobs[0]?.id || '');
  const [activeAssetTab, setActiveAssetTab] = useState<'twitter' | 'linkedin' | 'instagram' | 'newsletter' | 'webinar'>('twitter');
  const [activeOutreachTab, setActiveOutreachTab] = useState<'voice_script' | 'email' | 'linkedin' | 'lead_magnet'>('voice_script');
  const [copiedIndex, setCopiedIndex] = useState<string | number | null>(null);
  const [customTopic, setCustomTopic] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFullscreenNewsletter, setIsFullscreenNewsletter] = useState(false);

  // New SOP Audit Modal / Drawer State
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [auditCompany, setAuditCompany] = useState('DesignAcademy Studio');
  const [auditWebsite, setAuditWebsite] = useState('https://designacademy.io');
  const [auditTrigger, setAuditTrigger] = useState('Launched $2,997 Pro Career Sprint + Hiring First SDR on LinkedIn');
  const [auditTwitter, setAuditTwitter] = useState('https://x.com/jasonmiller_ui');
  const [auditLinkedIn, setAuditLinkedIn] = useState('https://linkedin.com/in/jasonmiller-design');
  const [auditYouTube, setAuditYouTube] = useState('https://youtube.com/@designacademy_io');
  const [auditInstagram, setAuditInstagram] = useState('https://instagram.com/designacademy.studio');
  const [auditSubstack, setAuditSubstack] = useState('https://jasonmiller.substack.com');
  const [auditSocialBio, setAuditSocialBio] = useState(
    'Founder of DesignAcademy.io (15k UI/UX designer community, 120k newsletter readers). Transitioning from $47 ebook sales into high-ticket $2,997 Pro Career Sprints and $10k/mo agency retainers. Needs 24/7 after-hours voice qualification to handle European and Asian inbound leads.'
  );

  const selectedJob = jobs.find((j) => j.id === selectedJobId) || jobs[0];
  const isAuditJob = selectedJob?.jobType === 'lead_magnet_audit' || !!selectedJob?.leadMagnetAudit;
  const audit = selectedJob?.leadMagnetAudit;
  const pack = selectedJob?.contentPack;

  const handleCopy = (text: string, id: string | number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleManualTrigger = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTopic.trim() || isSubmitting) return;
    setIsSubmitting(true);
    await onTriggerJob(customTopic);
    setCustomTopic('');
    setIsSubmitting(false);
  };

  const handleAuditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auditCompany.trim() || isSubmitting) return;
    setIsSubmitting(true);
    if (onTriggerAudit) {
      await onTriggerAudit({
        companyOrCreator: auditCompany,
        website: auditWebsite,
        triggerEvent: auditTrigger,
        socialLinks: {
          twitter: auditTwitter,
          linkedin: auditLinkedIn,
          youtube: auditYouTube,
          instagram: auditInstagram,
          substack: auditSubstack
        },
        socialBioText: auditSocialBio
      });
    }
    setIsSubmitting(false);
    setIsAuditModalOpen(false);
  };

  const wordCount = pack?.newsletter?.bodyMarkdown ? pack.newsletter.bodyMarkdown.split(/\s+/).length : 0;
  const readTimeMin = Math.max(1, Math.round(wordCount / 200));

  const mailtoUrl = pack?.newsletter
    ? `mailto:?subject=${encodeURIComponent(pack.newsletter.subjectLine)}&body=${encodeURIComponent(
        pack.newsletter.bodyMarkdown + '\n\n' + pack.newsletter.callToAction
      )}`
    : '#';

  const coldEmailMailtoUrl = audit?.outreachSequence?.coldEmail
    ? `mailto:?subject=${encodeURIComponent(audit.outreachSequence.coldEmail.subject)}&body=${encodeURIComponent(
        audit.outreachSequence.coldEmail.bodyMarkdown
      )}`
    : '#';

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Top Banner: Dual Engine Switcher & Quick Launch */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900/60 to-cyan-950/40 border border-purple-800/40 backdrop-blur-xl shadow-2xl gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Hermes Growth Studio: Inbound Audit & Multi-Channel Syndication
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              SOP Engine Active
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Generate 5-Point Inbound Audits, Revenue Leakage Estimates, and Multi-Platform Campaigns from customer voice signals and social footprints.
          </p>
        </div>

        {/* Action Controls: New SOP Audit or Spoken Content Trigger */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setIsAuditModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-bold shadow-lg shadow-cyan-500/20 transition-all"
          >
            <Target className="w-3.5 h-3.5" />
            <span>Run SOP Lead Audit & Magnet</span>
          </button>

          <form onSubmit={handleManualTrigger} className="flex items-center space-x-1.5">
            <input
              type="text"
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              placeholder="Spoken objection topic..."
              className="px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono w-56"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-1 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50"
              title="Launch Hermes Content Pack"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Pack</span>
            </button>
          </form>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        {/* Left Column: Job Queue & Research Lanes */}
        <div className="lg:col-span-5 space-y-4 flex flex-col">
          {/* Active Jobs Selector */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span className="font-semibold uppercase text-slate-300">Active Pipeline Deliverables:</span>
              <span>{jobs.length} Runs</span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto">
              {jobs.map((job) => {
                const isAudit = job.jobType === 'lead_magnet_audit' || !!job.leadMagnetAudit;
                return (
                  <button
                    key={job.id}
                    onClick={() => setSelectedJobId(job.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all text-xs flex flex-col space-y-1.5 ${
                      selectedJob?.id === job.id
                        ? isAudit
                          ? 'bg-cyan-950/40 border-cyan-500/60 text-cyan-200 shadow-md'
                          : 'bg-purple-950/40 border-purple-500/60 text-purple-200 shadow-md'
                        : 'bg-slate-950/50 border-slate-800/80 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 truncate">
                        {isAudit ? (
                          <Target className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                        ) : (
                          <Flame className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                        )}
                        <span className="font-semibold truncate max-w-[200px] text-slate-100">{job.topic}</span>
                      </div>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase font-bold ${
                          job.status === 'published'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : job.status === 'needs_approval'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                            : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        }`}
                      >
                        {job.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                      <span>Type: {isAudit ? 'SOP Lead Audit' : '5-Channel Pack'}</span>
                      <span>Cost: ${job.costUsd?.toFixed(3) || '0.045'}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3 Parallel Research Lanes Inspector */}
          {selectedJob && (
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl space-y-3 flex-1 overflow-y-auto">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <div className="flex items-center space-x-1.5 text-cyan-400">
                  <Search className="w-4 h-4" />
                  <span className="font-semibold uppercase text-slate-300">
                    Parallel Research Lanes:
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">Autonomous Synthesis</span>
              </div>

              <div className="space-y-2.5">
                {selectedJob.researchLanes?.map((lane, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
                      <span>{lane.title}</span>
                      <span className="text-[10px] font-mono text-emerald-400">Completed</span>
                    </div>
                    {lane.snippets.map((snip, sIdx) => (
                      <p key={sIdx} className="text-[11px] text-slate-400 italic leading-relaxed">
                        "{snip.excerpt}"
                      </p>
                    ))}
                  </div>
                ))}
              </div>

              {/* Self-Healing Loop Log Card */}
              {selectedJob.selfHealingLogs && selectedJob.selfHealingLogs.length > 0 && (
                <div className="p-3.5 rounded-xl bg-slate-950/90 border border-amber-500/50 space-y-2 mt-3 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 px-2 py-0.5 rounded-bl bg-amber-500/20 text-[9px] font-mono font-bold text-amber-300 border-b border-l border-amber-500/30 flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                    <span>DSPy AUTONOMOUS REPAIR</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs font-mono text-amber-300 font-semibold">
                    <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse" />
                    <span>DeepSeek-R1 Self-Healing Engine:</span>
                  </div>
                  <div className="bg-black/80 rounded-lg p-3 border border-slate-800 space-y-2 font-mono text-[11px]">
                    {selectedJob.selfHealingLogs.map((log, lIdx) => (
                      <div key={lIdx} className="space-y-1">
                        <div className="text-rose-400 flex items-start space-x-1.5">
                          <span className="text-rose-500 font-bold">▶ FAULT:</span>
                          <span>{log.issueDetected}</span>
                        </div>
                        <div className="text-emerald-400 flex items-start space-x-1.5 bg-emerald-950/30 p-1.5 rounded border border-emerald-500/20">
                          <span className="text-emerald-500 font-bold">✔ REPAIRED:</span>
                          <span>{log.repairApplied}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Deliverable Viewer */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          {/* VIEW 1: SOP Outbound Lead Magnet & 5-Point Inbound Conversion Audit */}
          {isAuditJob && audit ? (
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-cyan-800/50 backdrop-blur-xl flex flex-col flex-1 shadow-2xl space-y-5">
              {/* Header & Approval Gate */}
              <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400 uppercase">
                    <Target className="w-3.5 h-3.5" />
                    <span>SOP Inbound Conversion & Revenue Leakage Audit</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mt-1 flex items-center space-x-2">
                    <span>{audit.companyOrCreator}</span>
                    {audit.website && (
                      <a
                        href={audit.website}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-slate-400 hover:text-cyan-400 flex items-center space-x-1 font-mono font-normal"
                      >
                        <span>({audit.website})</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </h3>
                  <div className="text-xs text-slate-400 mt-1">
                    <span className="text-cyan-300 font-mono">Trigger Event:</span> {audit.triggerEvent}
                  </div>
                </div>

                {!selectedJob.humanApproved ? (
                  <button
                    onClick={() => onApproveJob(selectedJob.id)}
                    className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex-shrink-0"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve Outreach Sequence</span>
                  </button>
                ) : (
                  <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-xs font-mono font-semibold flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Dispatched to SDR / Voice</span>
                  </div>
                )}
              </div>

              {/* KPI Metrics Strip with Circular Radial Gauge and Leakage Flow Meter */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* 1. Annual Revenue Leakage with Visual Flow Meter */}
                <div className="p-3.5 rounded-xl bg-gradient-to-br from-rose-950/40 via-slate-900 to-slate-950 border border-rose-500/40 space-y-2 shadow-lg relative overflow-hidden">
                  <div className="flex items-center justify-between text-xs font-mono text-rose-400">
                    <div className="flex items-center space-x-1.5">
                      <TrendingDown className="w-4 h-4" />
                      <span>Annual Inbound Leakage</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold">CRITICAL</span>
                  </div>
                  <div className="text-2xl font-bold text-rose-200 tracking-tight font-mono">
                    ${audit.estimatedAnnualRevenueLeakageUsd?.toLocaleString() || '114,000'} <span className="text-xs font-normal text-rose-400">/ yr</span>
                  </div>
                  {/* Dynamic Visual Leakage Bar */}
                  <div className="space-y-1">
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
                      <div className="h-full bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 w-[78%] rounded-full animate-pulse" />
                    </div>
                    <div className="flex justify-between text-[9px] font-mono text-slate-400">
                      <span>Lost: $9.5k/mo</span>
                      <span className="text-rose-400 font-bold">Dropoff Rate: 68%</span>
                    </div>
                  </div>
                </div>

                {/* 2. Circular Radial Audit Gauge */}
                <div className="p-3.5 rounded-xl bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 border border-amber-500/40 flex items-center justify-between shadow-lg">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-1.5 text-xs font-mono text-amber-400">
                      <ShieldAlert className="w-4 h-4" />
                      <span>Audit Score</span>
                    </div>
                    <div className="text-lg font-bold text-amber-200">
                      {audit.auditScore || 42} <span className="text-xs text-slate-400 font-normal">/ 100</span>
                    </div>
                    <p className="text-[10px] text-amber-300/80 font-mono">3 of 5 Pillars Need AI</p>
                  </div>

                  {/* Circular SVG Gauge */}
                  <div className="relative w-16 h-16 flex items-center justify-center flex-shrink-0">
                    <svg className="w-16 h-16 transform -rotate-90">
                      <circle cx="32" cy="32" r="24" stroke="currentColor" strokeWidth="5" fill="transparent" className="text-slate-800" />
                      <circle
                        cx="32"
                        cy="32"
                        r="24"
                        stroke="currentColor"
                        strokeWidth="5"
                        fill="transparent"
                        strokeDasharray={2 * Math.PI * 24}
                        strokeDashoffset={2 * Math.PI * 24 - ((audit.auditScore || 42) / 100) * (2 * Math.PI * 24)}
                        strokeLinecap="round"
                        className="text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]"
                      />
                    </svg>
                    <span className="absolute font-mono text-xs font-bold text-white">
                      {audit.auditScore || 42}%
                    </span>
                  </div>
                </div>

                {/* 3. Response Time Latency Meter */}
                <div className="p-3.5 rounded-xl bg-gradient-to-br from-cyan-950/40 via-slate-900 to-slate-950 border border-cyan-500/40 space-y-2 shadow-lg">
                  <div className="flex items-center justify-between text-xs font-mono text-cyan-400">
                    <div className="flex items-center space-x-1.5">
                      <Clock className="w-4 h-4" />
                      <span>Response Latency</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">Target: &lt;5m</span>
                  </div>
                  <div className="text-2xl font-bold text-cyan-200 font-mono tracking-tight">&gt; 14 Hours</div>
                  <div className="flex items-center space-x-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/20">
                    <span>Anna Voice: Instant &lt;410ms</span>
                  </div>
                </div>
              </div>

              {/* Social Footprint & Audience Analysis Box */}
              {audit.socialBioAnalysis && (
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                    <span className="font-semibold text-slate-300">Client Social Footprint & Audience Analysis:</span>
                    <span className="text-cyan-400">{audit.socialBioAnalysis.identifiedNiche}</span>
                  </div>
                  <div className="text-xs text-slate-300 font-mono">
                    <span className="text-slate-500">Authority Tier:</span> {audit.socialBioAnalysis.estimatedAudienceTier}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {audit.socialLinks?.twitter && (
                      <a
                        href={audit.socialLinks.twitter}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300 hover:text-cyan-400"
                      >
                        <Twitter className="w-3 h-3 text-cyan-400" />
                        <span>Twitter/X</span>
                      </a>
                    )}
                    {audit.socialLinks?.linkedin && (
                      <a
                        href={audit.socialLinks.linkedin}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300 hover:text-blue-400"
                      >
                        <Linkedin className="w-3 h-3 text-blue-400" />
                        <span>LinkedIn</span>
                      </a>
                    )}
                    {audit.socialLinks?.youtube && (
                      <a
                        href={audit.socialLinks.youtube}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300 hover:text-red-400"
                      >
                        <Youtube className="w-3 h-3 text-red-400" />
                        <span>YouTube</span>
                      </a>
                    )}
                    {audit.socialLinks?.substack && (
                      <a
                        href={audit.socialLinks.substack}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300 hover:text-amber-400"
                      >
                        <Mail className="w-3 h-3 text-amber-400" />
                        <span>Substack</span>
                      </a>
                    )}
                    {audit.socialLinks?.instagram && (
                      <a
                        href={audit.socialLinks.instagram}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300 hover:text-pink-400"
                      >
                        <Instagram className="w-3 h-3 text-pink-400" />
                        <span>Instagram</span>
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* 5-Point Inbound Conversion Audit Pillars with Segmented Glowing Progress Meters */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono font-semibold uppercase text-slate-400">
                  <span>5-Point Inbound Conversion Audit Scorecard:</span>
                  <span className="text-cyan-400 text-[11px]">Segmented Reliability Meters</span>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                  {audit.pillars?.map((pillar, pIdx) => {
                    const score = pillar.scoreOutOf10 || 5;
                    const isCritical = pillar.impactLevel === 'critical';
                    const isHigh = pillar.impactLevel === 'high';
                    const barColor = isCritical ? 'bg-rose-500' : isHigh ? 'bg-amber-500' : 'bg-emerald-500';

                    return (
                      <div
                        key={pIdx}
                        className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition-all space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-200">{pillar.pillarName}</span>
                          <div className="flex items-center space-x-2">
                            <span
                              className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded font-bold ${
                                isCritical
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : isHigh
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                              }`}
                            >
                              {pillar.impactLevel}
                            </span>
                            <span className="font-mono text-xs font-bold text-slate-300">
                              {score}/10
                            </span>
                          </div>
                        </div>

                        {/* Segmented 10-step progress meter */}
                        <div className="flex items-center space-x-1 py-0.5">
                          {Array.from({ length: 10 }).map((_, idx) => (
                            <div
                              key={idx}
                              className={`h-1.5 flex-1 rounded-sm transition-all ${
                                idx < score
                                  ? `${barColor} shadow-[0_0_4px_currentColor]`
                                  : 'bg-slate-800'
                              }`}
                            />
                          ))}
                        </div>

                        <p className="text-[11px] text-slate-400">
                          <span className="text-slate-500 font-semibold">Finding:</span> {pillar.finding}
                        </p>
                        <p className="text-[11px] text-emerald-400">
                          <span className="text-emerald-500/70 font-semibold">Remedy:</span> {pillar.recommendation}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SOP 3-Touch Outreach Deliverables Switcher */}
              <div className="border-t border-slate-800 pt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setActiveOutreachTab('voice_script')}
                      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        activeOutreachTab === 'voice_script'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Mic className="w-3.5 h-3.5" />
                      <span>Spoken Voice Note Script (Anna)</span>
                    </button>

                    <button
                      onClick={() => setActiveOutreachTab('email')}
                      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        activeOutreachTab === 'email'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Cold Email</span>
                    </button>

                    <button
                      onClick={() => setActiveOutreachTab('linkedin')}
                      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        activeOutreachTab === 'linkedin'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Linkedin className="w-3.5 h-3.5" />
                      <span>LinkedIn InMail</span>
                    </button>

                    <button
                      onClick={() => setActiveOutreachTab('lead_magnet')}
                      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        activeOutreachTab === 'lead_magnet'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Free Lead Magnet Teardown</span>
                    </button>
                  </div>
                </div>

                {/* Tab Content */}
                {activeOutreachTab === 'voice_script' && audit.outreachSequence?.spokenAudioScript && (
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-purple-800/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-xs font-mono text-purple-400">
                        <Mic className="w-4 h-4" />
                        <span className="font-semibold">60-Second Personalized Voice Note Script (Anna / SDR):</span>
                      </div>
                      <button
                        onClick={() =>
                          handleCopy(
                            `${audit.outreachSequence.spokenAudioScript.intro} ${audit.outreachSequence.spokenAudioScript.triggerHook} ${audit.outreachSequence.spokenAudioScript.valueDrop} ${audit.outreachSequence.spokenAudioScript.frictionlessCallToAction}`,
                            'voice_script'
                          )
                        }
                        className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-mono"
                      >
                        {copiedIndex === 'voice_script' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedIndex === 'voice_script' ? 'Copied' : 'Copy Audio Script'}</span>
                      </button>
                    </div>

                    <div className="space-y-2 text-xs text-slate-300 font-mono leading-relaxed bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                      <p><span className="text-purple-400 font-bold">[Intro]:</span> "{audit.outreachSequence.spokenAudioScript.intro}"</p>
                      <p><span className="text-cyan-400 font-bold">[Trigger Hook]:</span> "{audit.outreachSequence.spokenAudioScript.triggerHook}"</p>
                      <p><span className="text-amber-400 font-bold">[Value Drop]:</span> "{audit.outreachSequence.spokenAudioScript.valueDrop}"</p>
                      <p><span className="text-emerald-400 font-bold">[Frictionless CTA]:</span> "{audit.outreachSequence.spokenAudioScript.frictionlessCallToAction}"</p>
                    </div>
                  </div>
                )}

                {activeOutreachTab === 'email' && audit.outreachSequence?.coldEmail && (
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-mono text-slate-400">
                        <span className="text-slate-500">Subject:</span>{' '}
                        <span className="text-slate-200 font-bold">{audit.outreachSequence.coldEmail.subject}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <a
                          href={coldEmailMailtoUrl}
                          className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold font-mono"
                        >
                          <Mail className="w-3 h-3" />
                          <span>Open in Email App</span>
                        </a>
                        <button
                          onClick={() =>
                            handleCopy(
                              `Subject: ${audit.outreachSequence.coldEmail.subject}\n\n${audit.outreachSequence.coldEmail.bodyMarkdown}`,
                              'cold_email'
                            )
                          }
                          className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-mono"
                        >
                          {copiedIndex === 'cold_email' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>Copy</span>
                        </button>
                      </div>
                    </div>
                    <pre className="text-xs text-slate-300 whitespace-pre-wrap font-sans leading-relaxed bg-slate-900/60 p-3.5 rounded-lg border border-slate-800">
                      {audit.outreachSequence.coldEmail.bodyMarkdown}
                    </pre>
                  </div>
                )}

                {activeOutreachTab === 'linkedin' && audit.outreachSequence?.linkedInMessage && (
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-mono text-blue-400 font-semibold">
                        LinkedIn Connection Note / InMail (Trigger + Context):
                      </div>
                      <button
                        onClick={() =>
                          handleCopy(audit.outreachSequence.linkedInMessage.body, 'linkedin_msg')
                        }
                        className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-mono"
                      >
                        {copiedIndex === 'linkedin_msg' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>Copy Message</span>
                      </button>
                    </div>
                    <pre className="text-xs text-slate-300 whitespace-pre-wrap font-sans leading-relaxed bg-slate-900/60 p-3.5 rounded-lg border border-slate-800">
                      {audit.outreachSequence.linkedInMessage.body}
                    </pre>
                  </div>
                )}

                {activeOutreachTab === 'lead_magnet' && audit.freeAssetPreviewMarkdown && (
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-mono text-emerald-400 font-semibold">
                        Free Lead Magnet Teardown Asset (Zero-Friction Deliverable):
                      </div>
                      <button
                        onClick={() => handleCopy(audit.freeAssetPreviewMarkdown, 'lead_magnet_asset')}
                        className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-mono"
                      >
                        {copiedIndex === 'lead_magnet_asset' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>Copy Asset Markdown</span>
                      </button>
                    </div>
                    <pre className="text-xs text-slate-300 whitespace-pre-wrap font-sans leading-relaxed bg-slate-900/60 p-3.5 rounded-lg border border-slate-800 max-h-48 overflow-y-auto">
                      {audit.freeAssetPreviewMarkdown}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          ) : pack ? (
            /* VIEW 2: Hermes Multi-Channel Content Pack (5 Channels) */
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl flex flex-col flex-1 shadow-2xl space-y-4">
              {/* Header & Approval Boundary */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
                <div>
                  <div className="text-xs font-mono uppercase text-slate-400">Verified Thesis:</div>
                  <h3 className="text-sm font-bold text-slate-100 mt-0.5">
                    {pack.thesis}
                  </h3>
                </div>

                {!selectedJob.humanApproved ? (
                  <button
                    onClick={() => onApproveJob(selectedJob.id)}
                    className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve & Publish Pack</span>
                  </button>
                ) : (
                  <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-xs font-mono font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approved & Dispatched</span>
                  </div>
                )}
              </div>

              {/* 5-Channel Platform Switcher */}
              <div className="flex items-center space-x-1.5 border-b border-slate-800 pb-2 overflow-x-auto">
                <button
                  onClick={() => setActiveAssetTab('twitter')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    activeAssetTab === 'twitter'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Twitter className="w-3.5 h-3.5" />
                  <span>X Thread ({pack.twitterThread?.length || 5})</span>
                </button>

                <button
                  onClick={() => setActiveAssetTab('linkedin')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    activeAssetTab === 'linkedin'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Linkedin className="w-3.5 h-3.5" />
                  <span>LinkedIn Post</span>
                </button>

                <button
                  onClick={() => setActiveAssetTab('instagram')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    activeAssetTab === 'instagram'
                      ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Instagram className="w-3.5 h-3.5" />
                  <span>Instagram/Threads Carousel</span>
                </button>

                <button
                  onClick={() => setActiveAssetTab('newsletter')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    activeAssetTab === 'newsletter'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Substack/Email Newsletter</span>
                </button>

                <button
                  onClick={() => setActiveAssetTab('webinar')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    activeAssetTab === 'webinar'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Webinar Pitch Script</span>
                </button>
              </div>

              {/* Asset Tab Views */}
              <div className="flex-1 overflow-y-auto space-y-4">
                {activeAssetTab === 'twitter' && pack.twitterThread && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                      <span>Twitter / X Thread (Strictly &lt;= 280 Chars per Tweet)</span>
                      <button
                        onClick={() => handleCopy(pack.twitterThread.join('\n\n'), 'all_tweets')}
                        className="flex items-center space-x-1 text-cyan-400 hover:underline"
                      >
                        {copiedIndex === 'all_tweets' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>Copy Full Thread</span>
                      </button>
                    </div>

                    {pack.twitterThread.map((tweet, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                          <span>Tweet {idx + 1} / {pack.twitterThread.length}</span>
                          <span className={tweet.length > 280 ? 'text-red-400' : 'text-slate-400'}>
                            {tweet.length} / 280 chars
                          </span>
                        </div>
                        <p className="text-xs text-slate-200 leading-relaxed font-sans">{tweet}</p>
                      </div>
                    ))}
                  </div>
                )}

                {activeAssetTab === 'linkedin' && pack.linkedInPost && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                      <span>LinkedIn Long-Form Post & Action Framework</span>
                      <button
                        onClick={() =>
                          handleCopy(
                            `${pack.linkedInPost?.hook}\n\n${pack.linkedInPost?.bodyMarkdown}\n\nTakeaways:\n${pack.linkedInPost?.takeaways.map(t => '• ' + t).join('\n')}\n\n${pack.linkedInPost?.hashtags.join(' ')}`,
                            'linkedin_post'
                          )
                        }
                        className="flex items-center space-x-1 text-blue-400 hover:underline"
                      >
                        {copiedIndex === 'linkedin_post' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>Copy Post</span>
                      </button>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3 text-xs leading-relaxed font-sans text-slate-200">
                      <div className="font-bold text-white text-sm pb-1 border-b border-slate-800/80">
                        {pack.linkedInPost.hook}
                      </div>
                      <p className="whitespace-pre-wrap">{pack.linkedInPost.bodyMarkdown}</p>
                      <div className="space-y-1 pt-2">
                        <div className="font-semibold text-slate-300 font-mono text-[11px]">Core Takeaways:</div>
                        {pack.linkedInPost.takeaways.map((t, idx) => (
                          <div key={idx} className="flex items-center space-x-2 text-slate-300">
                            <span className="text-blue-400">✓</span>
                            <span>{t}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-2 text-[11px] text-blue-400 font-mono">
                        {pack.linkedInPost.hashtags.map((tag, idx) => (
                          <span key={idx}>{tag}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeAssetTab === 'instagram' && pack.instagramCaption && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                      <span>Instagram / Threads Multi-Slide Carousel Deck</span>
                      <button
                        onClick={() =>
                          handleCopy(
                            `Hook: ${pack.instagramCaption?.hook}\n\nCaption: ${pack.instagramCaption?.caption}\n\nSlides:\n${pack.instagramCaption?.slideOutlines.join('\n')}`,
                            'insta_carousel'
                          )
                        }
                        className="flex items-center space-x-1 text-pink-400 hover:underline"
                      >
                        {copiedIndex === 'insta_carousel' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>Copy Carousel Outlines</span>
                      </button>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3 text-xs leading-relaxed font-sans text-slate-200">
                      <div className="font-bold text-white text-sm">{pack.instagramCaption.hook}</div>
                      <p className="text-slate-300 italic">{pack.instagramCaption.caption}</p>
                      <div className="space-y-2 pt-2">
                        <div className="font-semibold text-slate-400 font-mono text-[11px]">5-Slide Visual Storyboard:</div>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                          {pack.instagramCaption.slideOutlines.map((slide, idx) => (
                            <div key={idx} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] space-y-1">
                              <span className="font-mono text-pink-400 font-bold block">Slide {idx + 1}</span>
                              <span className="text-slate-300">{slide}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeAssetTab === 'newsletter' && pack.newsletter && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                      <div className="flex items-center space-x-3">
                        <span>Word count: {wordCount} words (~{readTimeMin} min read)</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <a
                          href={mailtoUrl}
                          className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold"
                        >
                          <Mail className="w-3 h-3" />
                          <span>Draft Email</span>
                        </a>
                        <button
                          onClick={() => setIsFullscreenNewsletter(true)}
                          className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs"
                        >
                          <Maximize2 className="w-3 h-3" />
                          <span>Fullscreen</span>
                        </button>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3 text-xs leading-relaxed font-sans text-slate-200">
                      <div className="border-b border-slate-800 pb-2">
                        <div className="text-slate-400 font-mono text-[11px]">Subject Line:</div>
                        <div className="font-bold text-white text-sm">{pack.newsletter.subjectLine}</div>
                      </div>
                      <pre className="whitespace-pre-wrap font-sans text-slate-300">{pack.newsletter.bodyMarkdown}</pre>
                    </div>
                  </div>
                )}

                {activeAssetTab === 'webinar' && pack.webinarScript && (
                  <div className="space-y-3">
                    <div className="text-xs font-mono text-slate-400">Webinar & Video Pitch Script:</div>
                    <div className="space-y-2 text-xs leading-relaxed bg-slate-950/70 p-4 rounded-xl border border-slate-800 text-slate-300">
                      <p><span className="text-amber-400 font-bold font-mono">[The Hook]:</span> {pack.webinarScript.hook}</p>
                      <p><span className="text-rose-400 font-bold font-mono">[Core Problem]:</span> {pack.webinarScript.coreProblem}</p>
                      <p><span className="text-cyan-400 font-bold font-mono">[Value Prop]:</span> {pack.webinarScript.valueProposition}</p>
                      <p><span className="text-emerald-400 font-bold font-mono">[The Close]:</span> {pack.webinarScript.offerClose}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500 font-mono text-xs bg-slate-900/40 rounded-2xl border border-slate-800">
              Select a job from the left queue to view details.
            </div>
          )}
        </div>
      </div>

      {/* MODAL: SOP Outbound Lead Magnet & Conversion Audit Generator */}
      {isAuditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6">
          <div className="w-full max-w-2xl bg-slate-900 border border-cyan-700/50 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/50 flex-shrink-0">
              <div className="flex items-center space-x-2 text-cyan-400">
                <Target className="w-5 h-5" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    SOP Outbound Lead Magnet & 5-Point Inbound Audit Generator
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    High-Volume Lead Gen & Personalized Outreach System (Trigger + Context + Free Resource)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAuditModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAuditSubmit} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-mono font-semibold">Target Company / Creator Name:</label>
                  <input
                    type="text"
                    required
                    value={auditCompany}
                    onChange={(e) => setAuditCompany(e.target.value)}
                    placeholder="E.g. DesignAcademy Studio"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-mono font-semibold">Website URL:</label>
                  <input
                    type="url"
                    value={auditWebsite}
                    onChange={(e) => setAuditWebsite(e.target.value)}
                    placeholder="https://designacademy.io"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-mono font-semibold flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Outreach Trigger Event (From TheOrg.com / LinkedIn / Substack):</span>
                </label>
                <input
                  type="text"
                  required
                  value={auditTrigger}
                  onChange={(e) => setAuditTrigger(e.target.value)}
                  placeholder="E.g. Hiring first SDR / Launched $2,997 cohort on Substack"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              {/* Social Platform Links */}
              <div className="space-y-2 pt-1 border-t border-slate-800/80">
                <label className="text-slate-300 font-mono font-semibold block">
                  Social Platform Profiles:
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  <div className="flex items-center space-x-2 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5">
                    <Twitter className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                    <input
                      type="url"
                      value={auditTwitter}
                      onChange={(e) => setAuditTwitter(e.target.value)}
                      placeholder="https://x.com/..."
                      className="bg-transparent text-slate-200 text-xs w-full focus:outline-none font-mono"
                    />
                  </div>

                  <div className="flex items-center space-x-2 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5">
                    <Linkedin className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                    <input
                      type="url"
                      value={auditLinkedIn}
                      onChange={(e) => setAuditLinkedIn(e.target.value)}
                      placeholder="https://linkedin.com/in/..."
                      className="bg-transparent text-slate-200 text-xs w-full focus:outline-none font-mono"
                    />
                  </div>

                  <div className="flex items-center space-x-2 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5">
                    <Youtube className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                    <input
                      type="url"
                      value={auditYouTube}
                      onChange={(e) => setAuditYouTube(e.target.value)}
                      placeholder="https://youtube.com/@..."
                      className="bg-transparent text-slate-200 text-xs w-full focus:outline-none font-mono"
                    />
                  </div>

                  <div className="flex items-center space-x-2 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5">
                    <Mail className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    <input
                      type="url"
                      value={auditSubstack}
                      onChange={(e) => setAuditSubstack(e.target.value)}
                      placeholder="https://....substack.com"
                      className="bg-transparent text-slate-200 text-xs w-full focus:outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Dedicated Analysis Text Box for Client Social Platforms and Bio */}
              <div className="space-y-1.5 pt-1">
                <label className="text-slate-300 font-mono font-semibold flex items-center justify-between">
                  <span>Client Social Footprint, Bio & Audience Context (For Analysis):</span>
                  <span className="text-[10px] text-cyan-400 font-normal">Deep AI Extraction</span>
                </label>
                <textarea
                  rows={4}
                  value={auditSocialBio}
                  onChange={(e) => setAuditSocialBio(e.target.value)}
                  placeholder="Paste creator/prospect social bio, audience metrics, community size (Discord/Skool/Substack), current price tiers, and pain points here..."
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono text-xs leading-relaxed"
                />
                <p className="text-[11px] text-slate-500 italic">
                  DeepSeek-R1 analyzes this footprint to calculate annual revenue leakage and personalize the 5-point conversion audit & audio script.
                </p>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAuditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/20 disabled:opacity-50"
                >
                  <Target className="w-4 h-4" />
                  <span>Generate Inbound Audit & Lead Magnet</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fullscreen Newsletter Modal */}
      {isFullscreenNewsletter && pack?.newsletter && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/60">
              <div className="text-xs font-mono text-slate-400">Newsletter Reader View</div>
              <button
                onClick={() => setIsFullscreenNewsletter(false)}
                className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4 text-slate-200">
              <h2 className="text-lg font-bold text-white">{pack.newsletter.subjectLine}</h2>
              <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed">{pack.newsletter.bodyMarkdown}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
