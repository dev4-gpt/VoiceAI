import React, { useState } from 'react';
import { ShieldCheck, CheckCircle, Play, Cpu, DollarSign, Clock } from 'lucide-react';

export const EvalsDashboard: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [report, setReport] = useState<any | null>(null);

  const handleRunEvals = async () => {
    setIsRunning(true);
    // Simulate real evals run
    setTimeout(() => {
      setReport({
        totalTasks: 4,
        kTrials: 5,
        passAtK: 100, // pass@5
        passPowerK: 88.4, // pass^5
        latencyP50: 920,
        latencyP95: 1450,
        ttfaAvgMs: 410,
        tasks: [
          {
            name: 'Task 01: Inbound Lead BANT Qualification',
            passRate: 100,
            pass5: 96.0,
            graders: 'Schema PASS | StateChange PASS | Booking PASS'
          },
          {
            name: 'Task 02: Tough Pricing Objection (Hybrid RAG)',
            passRate: 100,
            pass5: 92.5,
            graders: 'Retrieval PASS | Guarantee PASS'
          },
          {
            name: 'Task 03: Churn Save (Business Policy Guardrail Clamping)',
            passRate: 100,
            pass5: 90.0,
            graders: 'PolicyClamped PASS (15%) | ManagerReview PASS'
          },
          {
            name: 'Task 04: Prompt Injection Defense & Credential Shield',
            passRate: 100,
            pass5: 100,
            graders: 'NoLeakage PASS | InstructionShield PASS'
          }
        ]
      });
      setIsRunning(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/60 rounded-2xl border border-slate-800/80 backdrop-blur-xl p-5 shadow-2xl space-y-5">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <ShieldCheck className="w-5 h-5 text-purple-400" />
            <h3 className="text-base font-semibold text-slate-200">
              Anthropic Production Evals & Observability
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Measuring non-deterministic voice turns using pass@k and pass^k reliability metrics.
          </p>
        </div>

        <button
          onClick={handleRunEvals}
          disabled={isRunning}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium text-xs shadow-lg transition-all disabled:opacity-50"
        >
          {isRunning ? (
            <>
              <Cpu className="w-4 h-4 animate-spin" />
              <span>Simulating 5 Trials/Task...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              <span>Execute 5-Trial Eval Suite</span>
            </>
          )}
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="text-slate-400 text-xs font-mono flex items-center space-x-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>pass@5 Metric</span>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
            {report ? `${report.passAtK}%` : '100%'}
          </div>
          <div className="text-[11px] text-slate-500">At least 1 success per task</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="text-slate-400 text-xs font-mono flex items-center space-x-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
            <span>pass^5 Consistency</span>
          </div>
          <div className="text-2xl font-bold font-mono text-purple-400 mt-1">
            {report ? `${report.passPowerK}%` : '88.4%'}
          </div>
          <div className="text-[11px] text-slate-500">Strict consistency (all 5 pass)</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="text-slate-400 text-xs font-mono flex items-center space-x-1.5">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>TTFA Latency</span>
          </div>
          <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">
            {report ? `${report.ttfaAvgMs}ms` : '410ms'}
          </div>
          <div className="text-[11px] text-slate-500">Time-to-first audio byte</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="text-slate-400 text-xs font-mono flex items-center space-x-1.5">
            <DollarSign className="w-3.5 h-3.5 text-amber-400" />
            <span>Turn p95 Latency</span>
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
            {report ? `${report.latencyP95}ms` : '1,450ms'}
          </div>
          <div className="text-[11px] text-slate-500">Sub-1.5s real-time threshold</div>
        </div>
      </div>

      {/* Detailed Tasks Breakdown */}
      <div className="flex-1 space-y-2.5 overflow-y-auto">
        <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400">
          Active Evaluation Tasks & Deterministic Graders
        </h4>

        {(report ? report.tasks : [
          {
            name: 'Task 01: Inbound Lead BANT Qualification',
            passRate: 100,
            pass5: 96.0,
            graders: 'Schema PASS | StateChange PASS | Booking PASS'
          },
          {
            name: 'Task 02: Tough Pricing Objection (Hybrid RAG)',
            passRate: 100,
            pass5: 92.5,
            graders: 'Retrieval PASS | Guarantee PASS'
          },
          {
            name: 'Task 03: Churn Save (Business Policy Guardrail Clamping)',
            passRate: 100,
            pass5: 90.0,
            graders: 'PolicyClamped PASS (15%) | ManagerReview PASS'
          },
          {
            name: 'Task 04: Prompt Injection Defense & Credential Shield',
            passRate: 100,
            pass5: 100,
            graders: 'NoLeakage PASS | InstructionShield PASS'
          }
        ]).map((t: any, idx: number) => (
          <div
            key={idx}
            className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 flex items-center justify-between text-xs"
          >
            <div className="space-y-1">
              <div className="font-semibold text-slate-200">{t.name}</div>
              <div className="font-mono text-[11px] text-slate-500">{t.graders}</div>
            </div>

            <div className="flex items-center space-x-3 font-mono">
              <span className="text-emerald-400 bg-emerald-950/40 px-2 py-1 rounded border border-emerald-900/40">
                pass@5: {t.passRate}%
              </span>
              <span className="text-purple-400 bg-purple-950/40 px-2 py-1 rounded border border-purple-900/40">
                pass^5: {t.pass5}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
