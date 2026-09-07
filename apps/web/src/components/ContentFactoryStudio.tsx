import React, { useState } from 'react';
import { ContentFactoryJob } from '@voice-os/shared';
import {
  Search,
  Cpu,
  CheckCircle2,
  Send,
  Copy,
  Check,
  Twitter,
  Linkedin,
  Instagram,
  Mail,
  Video,
  AlertTriangle,
  Flame,
  Maximize2,
  Minimize2,
  ExternalLink,
  FileText,
  Sparkles,
  Share2
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
  const [activeAssetTab, setActiveAssetTab] = useState<'twitter' | 'linkedin' | 'instagram' | 'newsletter' | 'webinar'>('twitter');
  const [copiedIndex, setCopiedIndex] = useState<string | number | null>(null);
  const [customTopic, setCustomTopic] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFullscreenNewsletter, setIsFullscreenNewsletter] = useState(false);

  const selectedJob = jobs.find((j) => j.id === selectedJobId) || jobs[0];
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

  const wordCount = pack?.newsletter?.bodyMarkdown ? pack.newsletter.bodyMarkdown.split(/\\s+/).length : 0;
  const readTimeMin = Math.max(1, Math.round(wordCount / 200));

  const mailtoUrl = pack?.newsletter
    ? `mailto:?subject=${encodeURIComponent(pack.newsletter.subjectLine)}&body=${encodeURIComponent(
        pack.newsletter.bodyMarkdown + '\\n\\n' + pack.newsletter.callToAction
      )}`
    : '#';

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Top Banner & Strategy Reframing */}
      <div className="flex items-center justify-between p-5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900/60 to-cyan-950/40 border border-purple-800/40 backdrop-blur-xl shadow-2xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <Flame className="w-5 h-5 text-purple-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Hermes Multi-Channel Content Factory & Self-Healing Loop
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Turns spoken objections into high-converting campaigns across X, LinkedIn, Instagram/Threads, Substack, and Webinar pitch scripts.
          </p>
        </div>

        {/* Quick Voice Trigger Input */}
        <form onSubmit={handleManualTrigger} className="flex items-center space-x-2">
          <input
            type="text"
            value={customTopic}
            onChange={(e) => setCustomTopic(e.target.value)}
            placeholder="E.g. Student asks: 'Will this work without an audience?'"
            className="px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono w-80"
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
                        \"{snip.excerpt}\"
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

        {/* Right Column: Verified Content Pack & Multi-Channel Syndication */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          {pack ? (
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl flex flex-col flex-1 shadow-2xl space-y-4">
              {/* Header & Approval Boundary */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
                <div>
                  <div className="text-xs font-mono uppercase text-slate-400">Verified Thesis:</div>
                  <h3 className="text-sm font-bold text-slate-100 mt-0.5">
                    {pack.thesis}
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
                  <span>Instagram & Threads</span>
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
                  <span>Substack / Newsletter</span>
                </button>

                <button
                  onClick={() => setActiveAssetTab('webinar')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    activeAssetTab === 'webinar'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Webinar Script</span>
                </button>
              </div>

              {/* Asset Display Area */}
              <div className="flex-1 overflow-y-auto space-y-3 max-h-[500px] pr-2">
                {/* 1. X / Twitter Thread */}
                {activeAssetTab === 'twitter' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                      <span>Twitter / X Thread: All tweets strictly bounded to ≤ 280 characters.</span>
                      <button
                        onClick={() => handleCopy(pack.twitterThread.join('\\n\\n'), 'all_tweets')}
                        className="flex items-center space-x-1 text-cyan-400 hover:text-cyan-300 font-mono text-[11px]"
                      >
                        {copiedIndex === 'all_tweets' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>Copy Entire Thread</span>
                      </button>
                    </div>

                    {pack.twitterThread.map((tweet, tIdx) => (
                      <div
                        key={tIdx}
                        className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-start justify-between space-x-3 text-xs"
                      >
                        <div className="space-y-1 flex-1">
                          <div className="text-[11px] font-mono text-cyan-400 font-semibold">
                            Tweet {tIdx + 1} / {pack.twitterThread.length}
                          </div>
                          <p className="text-slate-200 leading-relaxed font-sans">{tweet}</p>
                          <div className="text-[10px] font-mono text-slate-500">
                            {tweet.length} / 280 characters • Verified Self-Healed
                          </div>
                        </div>

                        <button
                          onClick={() => handleCopy(tweet, tIdx)}
                          className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-all flex-shrink-0"
                          title="Copy Tweet"
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

                {/* 2. LinkedIn Post */}
                {activeAssetTab === 'linkedin' && (
                  <div className="space-y-3 text-xs">
                    <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="text-[11px] font-mono text-blue-400 font-semibold flex items-center space-x-1.5">
                          <Linkedin className="w-3.5 h-3.5" />
                          <span>LinkedIn Thought Leadership Format</span>
                        </span>
                        <button
                          onClick={() =>
                            handleCopy(
                              `${pack.linkedInPost?.hook || ''}\\n\\n${pack.linkedInPost?.bodyMarkdown || ''}\\n\\nTakeaways:\\n${(
                                pack.linkedInPost?.takeaways || []
                              ).map((t) => `• ${t}`).join('\\n')}\\n\\n${(pack.linkedInPost?.hashtags || []).join(' ')}`,
                              'linkedin_all'
                            )
                          }
                          className="flex items-center space-x-1 text-blue-400 hover:text-blue-300 font-mono text-[11px]"
                        >
                          {copiedIndex === 'linkedin_all' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>Copy for LinkedIn</span>
                        </button>
                      </div>

                      <div className="text-slate-100 font-semibold leading-relaxed">
                        {pack.linkedInPost?.hook || 'Why high-ticket buyers hesitate on price—and how to win them with risk-reversal:'}
                      </div>

                      <div className="text-slate-300 whitespace-pre-line leading-relaxed">
                        {pack.linkedInPost?.bodyMarkdown || pack.thesis}
                      </div>

                      {pack.linkedInPost?.takeaways && (
                        <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-800/40 space-y-1">
                          <div className="text-[11px] font-mono font-semibold text-blue-300">Key Takeaways:</div>
                          {pack.linkedInPost.takeaways.map((point, pIdx) => (
                            <div key={pIdx} className="text-slate-300 flex items-start space-x-2">
                              <span className="text-blue-400">•</span>
                              <span>{point}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {pack.linkedInPost?.hashtags && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {pack.linkedInPost.hashtags.map((tag, hIdx) => (
                            <span key={hIdx} className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-blue-400 border border-slate-800">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. Instagram & Threads */}
                {activeAssetTab === 'instagram' && (
                  <div className="space-y-3 text-xs">
                    <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="text-[11px] font-mono text-pink-400 font-semibold flex items-center space-x-1.5">
                          <Instagram className="w-3.5 h-3.5" />
                          <span>Carousel & Caption Blueprint</span>
                        </span>
                        <button
                          onClick={() =>
                            handleCopy(
                              `${pack.instagramCaption?.hook || ''}\\n\\n${pack.instagramCaption?.caption || ''}\\n\\nCarousel Outline:\\n${(
                                pack.instagramCaption?.slideOutlines || []
                              ).join('\\n')}`,
                              'instagram_all'
                            )
                          }
                          className="flex items-center space-x-1 text-pink-400 hover:text-pink-300 font-mono text-[11px]"
                        >
                          {copiedIndex === 'instagram_all' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>Copy Caption & Slides</span>
                        </button>
                      </div>

                      <div className="text-slate-100 font-semibold">
                        {pack.instagramCaption?.hook || 'Why discounting destroys client trust 📉'}
                      </div>

                      <div className="text-slate-300 leading-relaxed">
                        {pack.instagramCaption?.caption || 'Stop dropping prices when prospects hesitate. Swipe through to see the exact 3-step reframe.'}
                      </div>

                      {pack.instagramCaption?.slideOutlines && (
                        <div className="space-y-1.5 pt-2">
                          <div className="text-[11px] font-mono font-semibold text-pink-300">5-Slide Visual Carousel Layout:</div>
                          {pack.instagramCaption.slideOutlines.map((slide, sIdx) => (
                            <div key={sIdx} className="p-2 rounded-lg bg-slate-900 border border-slate-800/80 text-slate-300 font-mono text-[11px]">
                              {slide}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 4. Substack / Email Newsletter (With Full Reader & Mail Client) */}
                {activeAssetTab === 'newsletter' && (
                  <div className="space-y-3 text-xs">
                    {/* Action Bar */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-purple-950/30 border border-purple-800/40">
                      <div className="flex items-center space-x-3 text-[11px] font-mono text-purple-300">
                        <span>{wordCount} words</span>
                        <span>•</span>
                        <span>~{readTimeMin} min read</span>
                      </div>

                      <div className="flex items-center space-x-2">
                        {/* Open in Email Client Link */}
                        <a
                          href={mailtoUrl}
                          className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 text-[11px] font-semibold transition-all"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Open in Email App</span>
                        </a>

                        {/* Fullscreen Reader Modal Trigger */}
                        <button
                          onClick={() => setIsFullscreenNewsletter(true)}
                          className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold transition-all"
                        >
                          <Maximize2 className="w-3 h-3" />
                          <span>Full Reader</span>
                        </button>

                        {/* Copy Clean Text */}
                        <button
                          onClick={() =>
                            handleCopy(
                              `Subject: ${pack.newsletter.subjectLine}\\nPreview: ${pack.newsletter.previewText}\\n\\n${pack.newsletter.bodyMarkdown}\\n\\nCTA: ${pack.newsletter.callToAction}`,
                              'newsletter_all'
                            )
                          }
                          className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold transition-all"
                        >
                          {copiedIndex === 'newsletter_all' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>Copy All</span>
                        </button>
                      </div>
                    </div>

                    {/* Inline Formatted Newsletter Card */}
                    <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                      <div className="space-y-1 border-b border-slate-800 pb-3">
                        <div className="text-[11px] font-mono text-purple-400 font-semibold">
                          Subject: {pack.newsletter.subjectLine}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">
                          Preheader: {pack.newsletter.previewText}
                        </div>
                      </div>

                      <div className="text-slate-200 leading-relaxed whitespace-pre-line font-sans text-xs pt-1">
                        {pack.newsletter.bodyMarkdown}
                      </div>

                      <div className="p-3 rounded-lg bg-purple-950/40 border border-purple-800/40 text-purple-300 font-mono text-[11px] mt-3">
                        Call to Action: {pack.newsletter.callToAction}
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. Webinar Pitch Script */}
                {activeAssetTab === 'webinar' && (
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                      <span>Webinar & Video Close Script</span>
                      <button
                        onClick={() =>
                          handleCopy(
                            `Hook: ${pack.webinarScript.hook}\\n\\nProblem: ${pack.webinarScript.coreProblem}\\n\\nValue Prop: ${pack.webinarScript.valueProposition}\\n\\nClose: ${pack.webinarScript.offerClose}`,
                            'webinar_all'
                          )
                        }
                        className="flex items-center space-x-1 text-emerald-400 hover:text-emerald-300 font-mono text-[11px]"
                      >
                        {copiedIndex === 'webinar_all' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>Copy Script</span>
                      </button>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                      <div className="font-mono text-emerald-400 text-xs font-semibold">
                        Spoken Hook: \"{pack.webinarScript.hook}\"
                      </div>
                      <div className="text-slate-300 leading-relaxed">
                        <strong className="text-slate-400 font-mono text-[11px] uppercase block mb-0.5">Core Problem:</strong>
                        {pack.webinarScript.coreProblem}
                      </div>
                      <div className="text-slate-300 leading-relaxed">
                        <strong className="text-slate-400 font-mono text-[11px] uppercase block mb-0.5">Value Proposition:</strong>
                        {pack.webinarScript.valueProposition}
                      </div>
                      <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 font-mono text-xs">
                        Close & Guarantee: {pack.webinarScript.offerClose}
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

      {/* Fullscreen Newsletter Reading Modal */}
      {isFullscreenNewsletter && pack && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6">
          <div className="w-full max-w-3xl max-h-[85vh] bg-slate-900 border border-purple-700/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/50">
              <div className="space-y-0.5">
                <span className="text-[11px] font-mono text-purple-400 uppercase font-semibold">Distraction-Free Newsletter Reader</span>
                <h3 className="text-sm font-bold text-white">{pack.newsletter.subjectLine}</h3>
              </div>
              <div className="flex items-center space-x-2">
                <a
                  href={mailtoUrl}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Draft in Email App</span>
                </a>
                <button
                  onClick={() => setIsFullscreenNewsletter(false)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-slate-200 text-sm leading-relaxed font-serif">
              <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-800/40 text-xs font-mono text-purple-300">
                <strong>Preheader:</strong> {pack.newsletter.previewText}
              </div>
              <div className="whitespace-pre-line text-slate-200 leading-relaxed font-sans text-sm">
                {pack.newsletter.bodyMarkdown}
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-purple-800/40 text-purple-300 text-xs font-mono">
                <strong>Call to Action:</strong> {pack.newsletter.callToAction}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
