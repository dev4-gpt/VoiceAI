import React from 'react';
import { User, Bot, Wrench, CheckCircle2 } from 'lucide-react';

export interface MessageItem {
  id: string;
  speaker: 'user' | 'agent' | 'system';
  text: string;
  isPartial?: boolean;
  timestamp: string;
}

export interface ActiveToolItem {
  id: string;
  name: string;
  args: Record<string, any>;
  result?: Record<string, any>;
  status: 'invoked' | 'executing' | 'completed';
}

interface LiveTranscriptHUDProps {
  messages: MessageItem[];
  activeTools: ActiveToolItem[];
}

export const LiveTranscriptHUD: React.FC<LiveTranscriptHUDProps> = ({ messages, activeTools }) => {
  return (
    <div className="flex flex-col h-full bg-slate-900/60 rounded-2xl border border-slate-800/80 backdrop-blur-xl overflow-hidden shadow-2xl">
      {/* HUD Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center space-x-2.5">
          <Bot className="w-5 h-5 text-cyan-400" />
          <h3 className="text-sm font-semibold tracking-wide text-slate-200">
            Real-Time Spoken Interaction Stream
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-cyan-950/80 text-cyan-400 border border-cyan-800/50">
            Full-Duplex VAD
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-purple-950/80 text-purple-300 border border-purple-800/50">
            Voice: Anna
          </span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3.5 min-h-[340px] max-h-[420px]">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm space-y-2 py-16">
            <Bot className="w-8 h-8 text-slate-600 animate-pulse" />
            <p>Click "Start Voice Agent" below to initiate speech-in / speech-out session.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start space-x-3 text-sm ${
                msg.speaker === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.speaker === 'agent' && (
                <div className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center flex-shrink-0 mt-0.5 text-purple-300">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[78%] rounded-2xl px-4 py-2.5 shadow-md ${
                  msg.speaker === 'user'
                    ? 'bg-cyan-600/20 border border-cyan-500/30 text-cyan-50 rounded-tr-none'
                    : msg.speaker === 'system'
                    ? 'bg-slate-800/60 border border-slate-700/50 text-slate-400 text-xs italic'
                    : 'bg-slate-800/80 border border-slate-700/60 text-slate-100 rounded-tl-none'
                }`}
              >
                <div className="flex items-center justify-between space-x-4 mb-1 text-[11px] font-mono opacity-60">
                  <span className="font-semibold uppercase">
                    {msg.speaker === 'user' ? 'Operator / Prospect' : msg.speaker === 'agent' ? 'Growth AI' : 'System'}
                  </span>
                  <span>{msg.timestamp}</span>
                </div>
                <p className="leading-relaxed">
                  {msg.text}
                  {msg.isPartial && <span className="inline-block w-1.5 h-3 ml-1 bg-cyan-400 animate-pulse" />}
                </p>
              </div>

              {msg.speaker === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center flex-shrink-0 mt-0.5 text-cyan-300">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Active Tool Executions HUD */}
      {activeTools.length > 0 && (
        <div className="border-t border-slate-800/80 bg-slate-950/70 p-3.5 space-y-2">
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
            <Wrench className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold text-slate-300">Autonomous Tool Orchestration Layer:</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {activeTools.map((tool) => (
              <div
                key={tool.id}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-emerald-500/40 text-xs font-mono text-emerald-300 shadow-sm"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-semibold">{tool.name}</span>
                {tool.result && (
                  <span className="text-slate-400 text-[11px] bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                    {tool.name === 'process_retention_offer' ? 'Clamped 15% (Policy)' : 'Synced CRM'}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
