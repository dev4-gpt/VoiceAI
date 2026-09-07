import React, { useState } from 'react';
import { CRMLead, ChurnRiskMember, LeadStatus } from '@voice-os/shared';
import { Users, Calendar, Award, Sparkles, PlusCircle, ArrowRight, PhoneCall } from 'lucide-react';
import { LeadDetailDrawer } from './LeadDetailDrawer';

interface CrmKanbanProps {
  leads: CRMLead[];
  members?: ChurnRiskMember[];
  onSimulateLead?: () => void;
}

const COLUMNS: Array<{ key: LeadStatus; label: string; color: string; badgeColor: string }> = [
  {
    key: 'new',
    label: 'New Inbound Leads',
    color: 'border-slate-700 bg-slate-800/40 text-slate-300',
    badgeColor: 'border-slate-700 text-slate-400'
  },
  {
    key: 'inbound_qualified',
    label: 'BANT Qualified (≥60)',
    color: 'border-cyan-500/40 bg-cyan-950/30 text-cyan-300',
    badgeColor: 'border-cyan-500/40 text-cyan-300'
  },
  {
    key: 'call_scheduled',
    label: 'Strategy Call Booked',
    color: 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300',
    badgeColor: 'border-emerald-500/40 text-emerald-300'
  },
  {
    key: 'enrolled',
    label: 'Enrolled / Closed',
    color: 'border-purple-500/40 bg-purple-950/30 text-purple-300',
    badgeColor: 'border-purple-500/40 text-purple-300'
  }
];

export const CrmKanban: React.FC<CrmKanbanProps> = ({ leads, members = [], onSimulateLead }) => {
  const [selectedLead, setSelectedLead] = useState<CRMLead | null>(null);

  return (
    <div className="flex flex-col h-full bg-slate-900/60 rounded-2xl border border-slate-800/80 backdrop-blur-xl p-5 shadow-2xl">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800/80">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-semibold text-slate-200">
                Live Creator Revenue Pipeline (CRM)
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-mono font-bold">
                AI BANT SCORING
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Every inbound voice turn evaluates Budget, Authority, Need, and Timeline with real-time score updates.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <span className="text-xs font-mono text-slate-400">
            {leads.length} Leads • {members.length} Retained Members
          </span>

          {onSimulateLead && (
            <button
              onClick={onSimulateLead}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold shadow-sm transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Simulate Inbound Lead</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 Kanban Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 flex-1 overflow-x-auto">
        {COLUMNS.map((col) => {
          const colLeads = leads.filter((l) => l.status === col.key);

          return (
            <div
              key={col.key}
              className="flex flex-col bg-slate-950/60 rounded-xl border border-slate-800/80 p-3.5 min-w-[260px] shadow-sm"
            >
              <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-800">
                <span className={`text-xs font-semibold uppercase tracking-wider ${col.color.split(' ')[2]}`}>
                  {col.label}
                </span>
                <span className="text-xs font-mono bg-slate-800 px-2 py-0.5 rounded-full text-slate-400">
                  {colLeads.length}
                </span>
              </div>

              <div className="flex-1 space-y-2.5 overflow-y-auto min-h-[440px] max-h-[560px] pr-1 custom-scrollbar">
                {colLeads.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500 space-y-2">
                    <div className="w-8 h-8 rounded-full border border-dashed border-slate-700 flex items-center justify-center text-slate-600 font-mono text-xs">
                      0
                    </div>
                    <p className="text-xs font-mono">No records in this stage</p>
                    {onSimulateLead && col.key === 'new' && (
                      <button
                        onClick={onSimulateLead}
                        className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 underline pt-1"
                      >
                        + Click to Simulate Inbound
                      </button>
                    )}
                  </div>
                ) : (
                  colLeads.map((lead) => {
                    const score = lead.qualificationScore;
                    const isHigh = score >= 75;
                    const isMid = score >= 50;

                    // SVG mini-circle math
                    const r = 16;
                    const circ = 2 * Math.PI * r;
                    const offset = circ - (score / 100) * circ;

                    return (
                      <div
                        key={lead.id}
                        onClick={() => setSelectedLead(lead)}
                        className="group p-3 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900 transition-all shadow-md space-y-2 cursor-pointer relative overflow-hidden"
                      >
                        {/* Ambient subtle glow for high-ticket lead */}
                        {isHigh && (
                          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
                        )}

                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-xs text-slate-100 group-hover:text-cyan-300 transition-colors">
                              {lead.fullName}
                            </span>
                            {lead.companyName && (
                              <div className="text-[11px] text-slate-400 font-medium truncate">
                                {lead.companyName}
                              </div>
                            )}
                          </div>

                          {/* Glowing circular progress score */}
                          <div className="relative flex items-center justify-center w-10 h-10 flex-shrink-0" title={`BANT Qualification: ${score}/100`}>
                            <svg className="w-10 h-10 transform -rotate-90">
                              <circle
                                cx="20"
                                cy="20"
                                r={r}
                                stroke="currentColor"
                                strokeWidth="3.5"
                                fill="transparent"
                                className="text-slate-800"
                              />
                              <circle
                                cx="20"
                                cy="20"
                                r={r}
                                stroke="currentColor"
                                strokeWidth="3.5"
                                fill="transparent"
                                strokeDasharray={circ}
                                strokeDashoffset={offset}
                                strokeLinecap="round"
                                className={`transition-all duration-700 ${
                                  isHigh
                                    ? 'text-emerald-400 drop-shadow-[0_0_4px_rgba(52,211,153,0.6)]'
                                    : isMid
                                    ? 'text-cyan-400 drop-shadow-[0_0_4px_rgba(34,211,238,0.5)]'
                                    : 'text-amber-400'
                                }`}
                              />
                            </svg>
                            <span className="absolute text-[10px] font-mono font-bold text-slate-200">
                              {score}
                            </span>
                          </div>
                        </div>

                        <div className="text-[11px] text-slate-400 font-mono truncate">{lead.email}</div>

                        {/* Social Badges */}
                        {lead.socialLinks && (
                          <div className="flex items-center space-x-1 pt-0.5 text-slate-400">
                            {lead.socialLinks.twitter && (
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-950 border border-slate-800 text-cyan-300">
                                𝕏
                              </span>
                            )}
                            {lead.socialLinks.linkedin && (
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-950 border border-slate-800 text-blue-300">
                                in
                              </span>
                            )}
                            {lead.socialLinks.youtube && (
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-950 border border-slate-800 text-red-300">
                                ▶
                              </span>
                            )}
                          </div>
                        )}

                        {/* Matched Offer */}
                        {lead.matchedOffer && (
                          <div className="flex items-center justify-between text-[11px] font-mono text-emerald-400 bg-emerald-950/30 px-2 py-1 rounded border border-emerald-500/20">
                            <span className="truncate">{lead.matchedOffer}</span>
                            <ArrowRight className="w-3 h-3 ml-1 flex-shrink-0 opacity-70 group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Slide-out Lead Drawer */}
      <LeadDetailDrawer
        lead={selectedLead}
        isOpen={!!selectedLead}
        onClose={() => setSelectedLead(null)}
      />
    </div>
  );
};
