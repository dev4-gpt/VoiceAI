import React, { useState, useMemo } from 'react';
import {
  Check,
  Zap,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  DollarSign,
  Layers,
  Clock,
  Award,
  X,
  ArrowRight,
  Calculator
} from 'lucide-react';
import type { SubscriptionTierId } from '@voice-os/shared';

interface SubscriptionPlansModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlanId?: SubscriptionTierId;
  onSelectPlan?: (planId: SubscriptionTierId, cycle: 'monthly' | 'annual') => void;
  onOpenEmbedModal?: () => void;
  isGlass?: boolean;
}

export const SubscriptionPlansModal: React.FC<SubscriptionPlansModalProps> = ({
  isOpen,
  onClose,
  currentPlanId = 'pro',
  onSelectPlan,
  onOpenEmbedModal,
  isGlass = true
}) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [monthlyTraffic, setMonthlyTraffic] = useState<number>(5000);
  const [dealValue, setDealValue] = useState<number>(3500);
  const [selectedTier, setSelectedTier] = useState<SubscriptionTierId>(currentPlanId);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Dynamic Spoken ROI calculations
  const roiMetrics = useMemo(() => {
    const afterHoursTraffic = Math.round(monthlyTraffic * 0.32); // 32% after-hours
    const baselineLeads = Math.round(afterHoursTraffic * 0.008); // 0.8% static form baseline
    const spokenLeads = Math.round(afterHoursTraffic * 0.045); // 4.5% conversational voice conversion
    const incrementalLeads = Math.max(0, spokenLeads - baselineLeads);
    const grossPipeline = spokenLeads * dealValue;
    const planCostMonthly = billingCycle === 'annual' ? 317 : 397;
    const netRevenue = grossPipeline - planCostMonthly;
    const roiMultiplier = Number((grossPipeline / planCostMonthly).toFixed(1));
    const cacSaved = spokenLeads * 250; // $250 SDR labor saved per qualified call

    return {
      afterHoursTraffic,
      baselineLeads,
      spokenLeads,
      incrementalLeads,
      grossPipeline,
      netRevenue,
      roiMultiplier,
      cacSaved,
      planCostMonthly
    };
  }, [monthlyTraffic, dealValue, billingCycle]);

  if (!isOpen) return null;

  const handleSubscribe = (tier: SubscriptionTierId) => {
    setSelectedTier(tier);
    if (onSelectPlan) {
      onSelectPlan(tier, billingCycle);
    }
    setToastMessage(`Activated ${tier.toUpperCase()} tier (${billingCycle})! Syncing credentials & quotas...`);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div
        className={`relative w-full max-w-5xl rounded-3xl border shadow-2xl p-6 sm:p-8 my-8 transition-all max-h-[90vh] overflow-y-auto ${
          isGlass
            ? 'bg-[#121217]/95 border-white/10 text-slate-100 shadow-[0_20px_70px_rgba(0,0,0,0.6)]'
            : 'bg-slate-950 border-slate-800 text-slate-100 shadow-2xl'
        }`}
      >
        {/* Toast */}
        {toastMessage && (
          <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-emerald-500/90 text-slate-950 font-bold font-mono text-xs shadow-xl backdrop-blur-md flex items-center gap-2 border border-emerald-300">
            <Check className="w-4 h-4" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center max-w-2xl mx-auto mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-semibold mb-3">
            <Award className="w-3.5 h-3.5" />
            <span>VENTURE SAAS MODEL & UNIT ECONOMICS</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-amber-200 bg-clip-text text-transparent">
            GrowthVoice OS Subscription Engine
          </h2>
          <p className="text-sm text-slate-400 mt-2">
            Turn passive website traffic into high-ticket qualified pipeline 24/7 with AssemblyAI-powered autonomous spoken operators.
          </p>

          {/* Monthly / Annual Toggle */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <span className={`text-xs font-semibold ${billingCycle === 'monthly' ? 'text-white' : 'text-slate-400'}`}>
              Monthly Billing
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
              className="relative w-14 h-7 rounded-full bg-white/10 border border-white/20 p-1 transition-all"
            >
              <div
                className={`w-5 h-5 rounded-full bg-gradient-to-tr from-amber-400 to-amber-200 shadow-md transition-all transform ${
                  billingCycle === 'annual' ? 'translate-x-7' : 'translate-x-0'
                }`}
              />
            </button>
            <span className={`text-xs font-semibold flex items-center gap-1.5 ${billingCycle === 'annual' ? 'text-white' : 'text-slate-400'}`}>
              Annual Billing
              <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-[10px] font-mono">
                20% OFF • 2 MO FREE
              </span>
            </span>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {/* Tier 1: Starter */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 flex flex-col justify-between hover:border-white/20 transition-all">
            <div>
              <div className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">Starter Operator</div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-white">
                  ${billingCycle === 'annual' ? '119' : '149'}
                </span>
                <span className="text-xs text-slate-400">/mo</span>
              </div>
              <p className="text-xs text-slate-400 mt-2 min-h-[32px]">
                Autonomous 24/7 Inbound SDR qualification & instant booking.
              </p>
              <div className="my-5 border-t border-white/10" />
              <ul className="space-y-2.5 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span><strong>1 Autonomous Agent</strong> (Inbound SDR)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span><strong>500 Voice Minutes / mo</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>Real-Time BANT Lead Scoring & CRM Sync</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>Automated Strategy Session Booking</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>Standard Floating Audio Pill</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => handleSubscribe('starter')}
              className={`mt-6 w-full py-2.5 px-4 rounded-xl text-xs font-bold font-mono transition-all border ${
                selectedTier === 'starter'
                  ? 'bg-white/10 text-white border-white/30'
                  : 'bg-white/5 hover:bg-white/10 text-slate-200 border-white/10'
              }`}
            >
              {selectedTier === 'starter' ? 'Selected Plan' : 'Select Starter'}
            </button>
          </div>

          {/* Tier 2: Pro (Flagship / Winner) */}
          <div className="relative rounded-2xl border-2 border-amber-400/60 bg-gradient-to-b from-amber-500/[0.08] to-amber-500/[0.02] p-6 flex flex-col justify-between shadow-[0_0_30px_rgba(245,158,11,0.15)] transform md:-translate-y-2">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-200 text-slate-950 font-extrabold text-[10px] font-mono tracking-wide shadow-md">
              RECOMMENDED • 90% MARGIN
            </div>
            <div>
              <div className="text-xs font-mono font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Growth Engine Pro</span>
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-white">
                  ${billingCycle === 'annual' ? '317' : '397'}
                </span>
                <span className="text-xs text-slate-400">/mo</span>
              </div>
              <p className="text-xs text-slate-300 mt-2 min-h-[32px]">
                The complete autonomous growth stack: SDR, Churn Save & Content Factory.
              </p>
              <div className="my-5 border-t border-amber-400/20" />
              <ul className="space-y-2.5 text-xs text-slate-200">
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span><strong>3 Autonomous Agents</strong> (SDR, Outbound, Churn)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span><strong>2,500 Voice Minutes / mo</strong> (&lt;350ms TTFA)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>Autonomous Hermes Content Factory (X/LinkedIn/Substack)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>Local Obsidian Vault Bi-Directional Graph Sync</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>6-Mode 3D Glassy Voice Reactor Suite</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span><strong>1-Click Embeddable Web Widget</strong> (embed.js)</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => handleSubscribe('pro')}
              className="mt-6 w-full py-2.5 px-4 rounded-xl text-xs font-extrabold font-mono transition-all bg-gradient-to-r from-amber-400 to-amber-200 hover:from-amber-300 hover:to-amber-100 text-slate-950 shadow-lg shadow-amber-400/20 hover:scale-[1.01]"
            >
              {selectedTier === 'pro' ? 'Current Active Plan' : 'Upgrade to Pro Engine'}
            </button>
          </div>

          {/* Tier 3: Enterprise */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 flex flex-col justify-between hover:border-white/20 transition-all">
            <div>
              <div className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">Sovereign Enterprise</div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-white">
                  ${billingCycle === 'annual' ? '1,197' : '1,497'}
                </span>
                <span className="text-xs text-slate-400">/mo</span>
              </div>
              <p className="text-xs text-slate-400 mt-2 min-h-[32px]">
                Custom voice clones, multi-client isolated vaults & 99.9% SLA.
              </p>
              <div className="my-5 border-t border-white/10" />
              <ul className="space-y-2.5 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span><strong>Unlimited Voice Agents</strong> & Custom Voice Clone</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span><strong>10,000 Voice Minutes / mo</strong> + Volume Pricing</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>Multi-Client Isolated Encrypted Credential Vaults</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>Custom Legal Compliance & Financial Margin Clamps</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>Dedicated Cloud Workers & 24/7 Solution Architect</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => handleSubscribe('enterprise')}
              className={`mt-6 w-full py-2.5 px-4 rounded-xl text-xs font-bold font-mono transition-all border ${
                selectedTier === 'enterprise'
                  ? 'bg-white/10 text-white border-white/30'
                  : 'bg-white/5 hover:bg-white/10 text-slate-200 border-white/10'
              }`}
            >
              {selectedTier === 'enterprise' ? 'Selected Plan' : 'Deploy Enterprise'}
            </button>
          </div>
        </div>

        {/* Interactive Spoken ROI & Revenue Bleed Calculator */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8 backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400/20 to-amber-200/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  Interactive Spoken Revenue Recovery Calculator
                </h3>
                <p className="text-xs text-slate-400">
                  Quantify the revenue lost to after-hours website bounces vs. captured by GrowthVoice OS
                </p>
              </div>
            </div>

            {onOpenEmbedModal && (
              <button
                onClick={() => {
                  onClose();
                  onOpenEmbedModal();
                }}
                className="px-4 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-200 text-xs font-mono font-bold flex items-center gap-2 transition-all"
              >
                <span>Get 1-Line Embed Script</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sliders */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="p-4 rounded-2xl bg-black/30 border border-white/5">
              <div className="flex justify-between items-center text-xs font-mono mb-2">
                <span className="text-slate-300">Monthly Website Visitors:</span>
                <span className="text-amber-300 font-bold text-sm">{monthlyTraffic.toLocaleString()} visitors</span>
              </div>
              <input
                type="range"
                min="1000"
                max="50000"
                step="500"
                value={monthlyTraffic}
                onChange={(e) => setMonthlyTraffic(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                <span>1,000 / mo</span>
                <span>25,000 / mo</span>
                <span>50,000 / mo</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-black/30 border border-white/5">
              <div className="flex justify-between items-center text-xs font-mono mb-2">
                <span className="text-slate-300">Average Deal / ACV:</span>
                <span className="text-emerald-300 font-bold text-sm">${dealValue.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min="500"
                max="15000"
                step="250"
                value={dealValue}
                onChange={(e) => setDealValue(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                <span>$500</span>
                <span>$7,500</span>
                <span>$15,000</span>
              </div>
            </div>
          </div>

          {/* Quantified Metrics Dashboard */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="text-[11px] font-mono text-slate-400">After-Hours Traffic (32%)</div>
              <div className="text-xl font-extrabold text-white mt-1">
                {roiMetrics.afterHoursTraffic.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Visitors when staff is offline</div>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="text-[11px] font-mono text-slate-400">Spoken Qualified Leads</div>
              <div className="text-xl font-extrabold text-amber-300 mt-1">
                {roiMetrics.spokenLeads} calls/mo
              </div>
              <div className="text-[10px] text-emerald-400 mt-1 font-mono">
                +{roiMetrics.incrementalLeads} vs static form
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="text-[11px] font-mono text-slate-400">Recovered Pipeline</div>
              <div className="text-xl font-extrabold text-emerald-400 mt-1">
                ${(roiMetrics.grossPipeline / 1000).toFixed(0)}k <span className="text-xs text-slate-400">/mo</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1 font-mono">
                ${roiMetrics.cacSaved.toLocaleString()} CAC saved
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-200/10 border border-amber-400/40">
              <div className="text-[11px] font-mono text-amber-300 font-semibold">Net Spoken ROI</div>
              <div className="text-2xl font-black text-white mt-1">
                {roiMetrics.roiMultiplier}x
              </div>
              <div className="text-[10px] text-amber-200 mt-1 font-mono">
                on ${roiMetrics.planCostMonthly}/mo Pro plan
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
