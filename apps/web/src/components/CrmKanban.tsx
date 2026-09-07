import React from 'react';
import { CRMLead, ChurnRiskMember, LeadStatus } from '@voice-os/shared';
import { Users, Calendar, Award } from 'lucide-react';

interface CrmKanbanProps {
  leads: CRMLead[];
  members?: ChurnRiskMember[];
}

const COLUMNS: Array<{ key: LeadStatus; label: string; color: string }> = [
  { key: 'new', label: 'New Inbound Leads', color: 'border-slate-700 bg-slate-800/40 text-slate-300' },
  { key: 'inbound_qualified', label: 'BANT Qualified (≥60)', color: 'border-cyan-500/40 bg-cyan-950/30 text-cyan-300' },
  { key: 'call_scheduled', label: 'Strategy Call Booked', color: 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300' },
  { key: 'enrolled', label: 'Enrolled / Closed', color: 'border-purple-500/40 bg-purple-950/30 text-purple-300' }
];

export const CrmKanban: React.FC<CrmKanbanProps> = ({ leads, members = [] }) => {
  return (
    <div className="flex flex-col h-full bg-slate-900/60 rounded-2xl border border-slate-800/80 backdrop-blur-xl p-5 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2.5">
          <Users className="w-5 h-5 text-emerald-400" />
          <h3 className="text-base font-semibold text-slate-200">
            Live Creator Revenue Pipeline (CRM)
          </h3>
        </div>
        <span className="text-xs font-mono text-slate-400">
          {leads.length} Leads • {members.length} Retained Members
        </span>
      </div>

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
                  <div className="text-center py-8 text-xs text-slate-600 font-mono">
                    No records in stage
                  </div>
                ) : (
                  colLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all shadow-md space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-slate-100">{lead.fullName}</span>
                        <span
                          className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                            lead.qualificationScore >= 75
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : lead.qualificationScore >= 50
                              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          Score: {lead.qualificationScore}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-400 font-mono truncate">{lead.email}</div>

                      {lead.companyName && (
                        <div className="text-[11px] text-slate-300 font-medium truncate">
                          {lead.companyName}
                        </div>
                      )}

                      {lead.socialLinks && (
                        <div className="flex items-center space-x-1 pt-0.5 text-slate-400">
                          {lead.socialLinks.twitter && (
                            <a
                              href={lead.socialLinks.twitter}
                              target="_blank"
                              rel="noreferrer"
                              title="Twitter / X"
                              className="hover:text-cyan-400"
                            >
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-cyan-300">
                                𝕏
                              </span>
                            </a>
                          )}
                          {lead.socialLinks.linkedin && (
                            <a
                              href={lead.socialLinks.linkedin}
                              target="_blank"
                              rel="noreferrer"
                              title="LinkedIn"
                              className="hover:text-blue-400"
                            >
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-blue-300">
                                in
                              </span>
                            </a>
                          )}
                          {lead.socialLinks.youtube && (
                            <a
                              href={lead.socialLinks.youtube}
                              target="_blank"
                              rel="noreferrer"
                              title="YouTube"
                              className="hover:text-red-400"
                            >
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-red-300">
                                ▶
                              </span>
                            </a>
                          )}
                          {lead.socialLinks.substack && (
                            <a
                              href={lead.socialLinks.substack}
                              target="_blank"
                              rel="noreferrer"
                              title="Substack"
                              className="hover:text-amber-400"
                            >
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-amber-300">
                                ✉
                              </span>
                            </a>
                          )}
                        </div>
                      )}

                      {lead.budgetRange && (
                        <div className="flex items-center space-x-1.5 text-[11px] text-cyan-400">
                          <Award className="w-3 h-3" />
                          <span>Budget: {lead.budgetRange.replace(/_/g, ' ')}</span>
                        </div>
                      )}

                      {lead.scheduledCallTime && (
                        <div className="flex items-center space-x-1.5 text-[11px] text-emerald-400 font-mono bg-emerald-950/40 px-2 py-1 rounded border border-emerald-900/50">
                          <Calendar className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{lead.scheduledCallTime}</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
