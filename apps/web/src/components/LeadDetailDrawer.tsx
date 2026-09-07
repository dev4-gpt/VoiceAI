import React from 'react';
import { CRMLead } from '@voice-os/shared';
import {
  X,
  PhoneCall,
  Calendar,
  DollarSign,
  Briefcase,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  MessageSquare
} from 'lucide-react';

interface LeadDetailDrawerProps {
  lead: CRMLead | null;
  isOpen: boolean;
  onClose: () => void;
  onTriggerCall?: (lead: CRMLead) => void;
}

export const LeadDetailDrawer: React.FC<LeadDetailDrawerProps> = ({
  lead,
  isOpen,
  onClose,
  onTriggerCall
}) => {
  if (!isOpen || !lead) return null;

  const score = lead.qualificationScore;
  const isHighValue = score >= 75;
  const isMidValue = score >= 50;

  // SVG Circular progress math
  const strokeWidth = 8;
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-slate-950/95 border-l border-slate-800 p-6 flex flex-col h-full shadow-2xl overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-5">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-base font-bold text-white">{lead.fullName}</h3>
              <p className="text-xs text-slate-400 font-mono">{lead.companyName || 'Independent Creator'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Circular Lead Score Card */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between mb-5 shadow-lg">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
              AI BANT Qualification
            </span>
            <div className="text-sm font-semibold text-slate-200 mt-0.5">
              {isHighValue
                ? 'High-Ticket Qualified'
                : isMidValue
                ? 'Moderate Fit • Nurture Required'
                : 'Cold / Pre-Qualification'}
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-1">
              Status: <span className="text-cyan-400 uppercase font-bold">{lead.status.replace('_', ' ')}</span>
            </div>
          </div>

          {/* SVG Circular Gauge */}
          <div className="relative flex items-center justify-center">
            <svg className="w-24 h-24 transform -rotate-90">
              <circle
                cx="48"
                cy="48"
                r={radius}
                stroke="currentColor"
                strokeWidth={strokeWidth}
                fill="transparent"
                className="text-slate-800"
              />
              <circle
                cx="48"
                cy="48"
                r={radius}
                stroke="currentColor"
                strokeWidth={strokeWidth}
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className={`transition-all duration-1000 ${
                  isHighValue ? 'text-emerald-400' : isMidValue ? 'text-cyan-400' : 'text-amber-400'
                }`}
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-xl font-mono font-bold text-white">{score}</span>
              <span className="text-[9px] font-mono text-slate-400">/100</span>
            </div>
          </div>
        </div>

        {/* Lead Details Breakdown */}
        <div className="space-y-4 flex-1">
          {/* Contact Info */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
            <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">Contact Channels</div>
            <div className="text-xs text-slate-200 font-mono flex items-center justify-between">
              <span>Email:</span>
              <span className="text-cyan-300 select-all">{lead.email}</span>
            </div>
            {lead.phone && (
              <div className="text-xs text-slate-200 font-mono flex items-center justify-between">
                <span>Phone:</span>
                <span className="text-slate-300">{lead.phone}</span>
              </div>
            )}
            {lead.website && (
              <div className="text-xs text-slate-200 font-mono flex items-center justify-between">
                <span>Website:</span>
                <a
                  href={lead.website}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-400 hover:underline flex items-center space-x-1"
                >
                  <span>{lead.website.replace('https://', '')}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>

          {/* Social Profiles */}
          {lead.socialLinks && (
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
              <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">Verified Social Handles</div>
              <div className="flex flex-wrap gap-2 pt-1">
                {lead.socialLinks.twitter && (
                  <a
                    href={lead.socialLinks.twitter}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 text-xs font-mono flex items-center space-x-1"
                  >
                    <span>𝕏 Twitter</span>
                  </a>
                )}
                {lead.socialLinks.linkedin && (
                  <a
                    href={lead.socialLinks.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-blue-400 text-xs font-mono flex items-center space-x-1"
                  >
                    <span>LinkedIn</span>
                  </a>
                )}
                {lead.socialLinks.youtube && (
                  <a
                    href={lead.socialLinks.youtube}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-red-400 text-xs font-mono flex items-center space-x-1"
                  >
                    <span>YouTube</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* AI Voice Qualification Notes */}
          {lead.notes && (
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
              <div className="flex items-center space-x-1.5 text-xs font-mono text-slate-400 uppercase tracking-wider">
                <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                <span>Voice Agent Call Transcript Summary</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/80 p-3 rounded-lg border border-slate-800 font-mono">
                {lead.notes}
              </p>
            </div>
          )}

          {/* Offer & Strategy Booking */}
          {lead.matchedOffer && (
            <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-1.5">
              <div className="text-xs font-mono text-emerald-400 uppercase tracking-wider">Recommended Cohort Offer</div>
              <div className="text-sm font-bold text-white">{lead.matchedOffer}</div>
              {lead.scheduledCallTime && (
                <div className="text-xs text-emerald-300 font-mono flex items-center space-x-1 mt-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Scheduled Call: {lead.scheduledCallTime}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-800/80 flex items-center space-x-3 mt-4">
          <button
            onClick={() => {
              if (onTriggerCall) onTriggerCall(lead);
              onClose();
            }}
            className="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs shadow-lg shadow-emerald-900/30 transition-all"
          >
            <PhoneCall className="w-4 h-4" />
            <span>Trigger AI Strategy Call</span>
          </button>
        </div>
      </div>
    </div>
  );
};
