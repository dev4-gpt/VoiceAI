import React, { useState } from 'react';
import { ContentFactoryJob } from '@voice-os/shared';
import {
  Sparkles,
  Search,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Send,
  Copy,
  Check,
  Twitter,
  Mail,
  Video,
  AlertTriangle,
  Flame,
  ArrowRight
} from 'lucide-react';

interface ContentFactoryStudioProps {
  jobs: ContentFactoryJob[];
  onTriggerJob: (topic: string) => Promise<void>;
  onApproveJob: (id: string) => Promise<void>;
}

export const ContentFactoryStudio: React.FC<ContentFactoryStudioProps> = ({
  jobs,
  onTriggerJob,
  onApproveJob
}) => {
  const [selectedJobId, setSelectedJobId] = useState<string>(jobs[0]?.id || '');
  const [activeAssetTab, setActiveAssetTab] = useState<'twitter' | 'newsletter' | 'webinar'>('twitter');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [customTopic, setCustomTopic] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedJob = jobs.find((j) => j.id === selectedJobId) || jobs[0];

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
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

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Top Banner & Strategy Reframing */}
      <div className="flex items-center justify-between p-5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900/60 to-cyan-950/40 border border-purple-800/40 backdrop-blur-xl shadow-2xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <Flame className="w-5 h-5 text-purple-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Hermes Content Factory & Autonomous Self-Healing Loop
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Powered by Raja Ashok's 10-Step Architecture + DeepSeek-R1 Reasoner: Request $\to$ Multi-Lane Research $\to$ Synthesize $\to$ Self-Heal $\to$ Verify $\to$ Deliver.
          </p>
        </div>

        {/* Quick Voice Trigger Input */}
        <form onSubmit={handleManualTrigger} className="flex items-center space-x-2">
          <input
            type="text"
            value={customTopic}
            onChange={(e) => setCustomTopic(e.target.value)}
            placeholder="E.g. Student asks: 'Is this too advanced?'"
            className="px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono w-72"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Launch</span>
          </button>
        </form>
      </div>

      {/* Main Grid: Job Selector / Research Lanes on left, Content Pack on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        {/* Left Column: Job Queue & Research Lanes */}
        <div className="lg:col-span-5 space-y-4 flex flex-col">
          {/* Active Jobs Selector */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span className="font-semibold uppercase text-slate-300">Active Content Factory Runs:</span>
              <span>{jobs.length} Runs</span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {jobs.map((job) => (
                <button
                  key={job.id}
                  onClick={() => setSelectedJobId(job.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all text-xs flex flex-col space-y-1.5 ${
                    selectedJob?.id === job.id
                      ? 'bg-purple-950/40 border-purple-500/60 text-purple-200 shadow-md'
                      : 'bg-slate-950/50 border-slate-800/80 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold truncate max-w-[200px] text-slate-100">{job.topic}</span>
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

                  <div className="flex items-center space-x-3 text-[11px] font-mono text-slate-500">
                    <span>Model: {job.modelRouting?.synthesisModel.split(' ')[0] || 'DeepSeek-R1'}</span>
                    <span>•</span>
                    <span>Cost: ${job.costUsd?.toFixed(3) || '0.032'}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 3 Parallel Research Lanes Inspector */}
          {selectedJob && (
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl space-y-3 flex-1 overflow-y-auto">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <div className="flex items-center space-x-1.5 text-cyan-400">
                  <Search className="w-4 h-4" />
                  <span className="font-semibold uppercase text-slate-300">Parallel Research Lanes (Step 05):</span>
                </div>
                <span className="text-[11px] text-slate-500">Joined & Synthesized</span>
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
                <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/40 space-y-2 mt-3">
                  <div className="flex items-center space-x-2 text-xs font-mono text-amber-300 font-semibold">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>Autonomous Self-Healing Loop Triggered (Step 08):</span>
                  </div>
                  {selectedJob.selfHealingLogs.map((log, lIdx) => (
                    <div key={lIdx} className="text-[11px] text-slate-300 font-mono space-y-1">
                      <div className="text-red-300">⚠️ Detected: {log.issueDetected}</div>
                      <div className="text-emerald-300">✅ Healed: {log.repairApplied}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Verified Content Pack & Approval Gate */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          {selectedJob?.contentPack ? (
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl flex flex-col flex-1 shadow-2xl space-y-4">
              {/* Header & Approval Boundary */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
                <div>
                  <div className="text-xs font-mono uppercase text-slate-400">Verified Thesis:</div>
                  <h3 className="text-sm font-bold text-slate-100 mt-0.5">
                    {selectedJob.contentPack.thesis}
                  </h3>
                </div>

                {/* Step 09: Human Approval Boundary Gate */}
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

              {/* Asset Channel Switcher */}
              <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
                <button
                  onClick={() => setActiveAssetTab('twitter')}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeAssetTab === 'twitter'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Twitter className="w-3.5 h-3.5" />
                  <span>X Thread ({selectedJob.contentPack.twitterThread?.length || 5} Tweets)</span>
                </button>

                <button
                  onClick={() => setActiveAssetTab('newsletter')}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeAssetTab === 'newsletter'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email Newsletter</span>
                </button>

                <button
                  onClick={() => setActiveAssetTab('webinar')}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeAssetTab === 'webinar'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Webinar Pitch Script</span>
                </button>
              </div>

              {/* Asset Display Area */}
              <div className="flex-1 overflow-y-auto space-y-3 max-h-[380px] pr-2">
                {activeAssetTab === 'twitter' && (
                  <div className="space-y-3">
                    {selectedJob.contentPack.twitterThread.map((tweet, tIdx) => (
                      <div
                        key={tIdx}
                        className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-start justify-between space-x-3 text-xs"
                      >
                        <div className="space-y-1 flex-1">
                          <div className="text-[11px] font-mono text-cyan-400 font-semibold">
                            Tweet {tIdx + 1} / {selectedJob.contentPack.twitterThread.length}
                          </div>
                          <p className="text-slate-200 leading-relaxed font-sans">{tweet}</p>
                          <div className="text-[10px] font-mono text-slate-500">
                            {tweet.length} / 280 characters • Verified Self-Healed
                          </div>
                        </div>

                        <button
                          onClick={() => handleCopy(tweet, tIdx)}
                          className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-all flex-shrink-0"
                        >
                          {copiedIndex === tIdx ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {activeAssetTab === 'newsletter' && (
                  <div className="space-y-3 text-xs">
                    <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                      <div className="font-mono text-purple-400 text-[11px]">
                        Subject: {selectedJob.contentPack.newsletter.subjectLine}
                      </div>
                      <div className="font-mono text-slate-400 text-[11px]">
                        Preview: {selectedJob.contentPack.newsletter.previewText}
                      </div>
                      <div className="border-t border-slate-800 pt-2 text-slate-200 leading-relaxed whitespace-pre-line font-sans">
                        {selectedJob.contentPack.newsletter.bodyMarkdown}
                      </div>
                      <div className="p-2.5 rounded-lg bg-purple-950/40 border border-purple-800/40 text-purple-300 font-mono text-[11px]">
                        Call to Action: {selectedJob.contentPack.newsletter.callToAction}
                      </div>
                    </div>
                  </div>
                )}

                {activeAssetTab === 'webinar' && (
                  <div className="space-y-3 text-xs">
                    <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                      <div className="font-mono text-emerald-400 text-[11px]">
                        Spoken Hook: "{selectedJob.contentPack.webinarScript.hook}"
                      </div>
                      <div className="text-slate-300 leading-relaxed">
                        <strong className="text-slate-400">Core Problem:</strong> {selectedJob.contentPack.webinarScript.coreProblem}
                      </div>
                      <div className="text-slate-300 leading-relaxed">
                        <strong className="text-slate-400">Value Proposition:</strong> {selectedJob.contentPack.webinarScript.valueProposition}
                      </div>
                      <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 font-mono text-[11px]">
                        Close & Guarantee: {selectedJob.contentPack.webinarScript.offerClose}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-12 rounded-2xl bg-slate-900/60 border border-slate-800/80 text-slate-500 text-sm space-y-2">
              <Cpu className="w-8 h-8 text-slate-600 animate-pulse" />
              <p>Select an active run or launch a new topic above.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
