import React, { useState, useRef, useEffect } from 'react';
import { User, Bot, Wrench, CheckCircle2, Send, Keyboard, Sparkles } from 'lucide-react';

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
  onSendMessage?: (text: string) => Promise<void>;
  isSendingMessage?: boolean;
  activeBrandVoice?: {
    companyName: string;
    toneLabel: string;
  };
  theme?: 'glass' | 'cyber';
}

export const LiveTranscriptHUD: React.FC<LiveTranscriptHUDProps> = ({
  messages,
  activeTools,
  onSendMessage,
  isSendingMessage = false,
  activeBrandVoice,
  theme = 'glass'
}) => {
  const isGlass = theme === 'glass';
  const [typedInput, setTypedInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedInput.trim() || isSendingMessage) return;
    const text = typedInput.trim();
    setTypedInput('');
    if (onSendMessage) {
      await onSendMessage(text);
    }
  };

  return (
    <div className={`flex flex-col h-full rounded-2xl border backdrop-blur-xl overflow-hidden shadow-2xl transition-all ${
      isGlass ? 'bg-white/80 border-slate-200/90 shadow-[0_12px_40px_rgba(0,0,0,0.05)] text-slate-800' : 'bg-slate-900/60 border-slate-800/80 text-slate-100'
    }`}>
      {/* HUD Header */}
      <div className={`flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 border-b ${
        isGlass ? 'border-slate-200/80 bg-slate-50/80' : 'border-slate-800/80 bg-slate-950/40'
      }`}>
        <div className="flex items-center space-x-2.5">
          <Bot className={`w-5 h-5 ${isGlass ? 'text-sky-600' : 'text-cyan-400'}`} />
          <h3 className={`text-sm font-semibold tracking-wide ${isGlass ? 'text-slate-900' : 'text-slate-200'}`}>
            Real-Time Spoken Interaction Stream
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {activeBrandVoice && (
            <span className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded text-xs font-mono border shadow-xs ${
              isGlass ? 'bg-indigo-50 text-indigo-800 border-indigo-200' : 'bg-indigo-950/80 text-indigo-300 border-indigo-700/60'
            }`}>
              <Sparkles className={`w-3 h-3 ${isGlass ? 'text-indigo-600' : 'text-indigo-400'}`} />
              <span className="font-semibold">{activeBrandVoice.companyName}</span>
              <span className={isGlass ? 'text-indigo-600' : 'text-indigo-400/80'}>• {activeBrandVoice.toneLabel}</span>
            </span>
          )}
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono border ${
            isGlass ? 'bg-sky-50 text-sky-800 border-sky-200' : 'bg-cyan-950/80 text-cyan-400 border-cyan-800/50'
          }`}>
            Full-Duplex VAD
          </span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono border ${
            isGlass ? 'bg-purple-50 text-purple-800 border-purple-200' : 'bg-purple-950/80 text-purple-300 border-purple-800/50'
          }`}>
            Voice: Anna
          </span>
          <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-mono border ${
            isGlass ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-emerald-950/80 text-emerald-300 border-emerald-800/50'
          }`}>
            <Keyboard className="w-3 h-3" />
            <span>Keyboard Active</span>
          </span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3.5 min-h-[400px] max-h-[520px] custom-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm space-y-2 py-16">
            <Bot className="w-8 h-8 text-slate-400 animate-pulse" />
            <p>Click "Start Voice Session" or type a message below to converse with Anna.</p>
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
                <div className={`w-7 h-7 rounded-lg border flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  isGlass ? 'bg-purple-50 border-purple-200 text-purple-600' : 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                }`}>
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[78%] rounded-2xl px-4 py-2.5 shadow-md ${
                  msg.speaker === 'user'
                    ? isGlass
                      ? 'bg-sky-50 border border-sky-200 text-sky-950 rounded-tr-none shadow-xs'
                      : 'bg-cyan-600/20 border border-cyan-500/30 text-cyan-50 rounded-tr-none'
                    : msg.speaker === 'system'
                    ? isGlass
                      ? 'bg-slate-100/90 border border-slate-200 text-slate-600 text-xs italic'
                      : 'bg-slate-800/60 border border-slate-700/50 text-slate-400 text-xs italic'
                    : isGlass
                    ? 'bg-white border border-slate-200/90 text-slate-800 rounded-tl-none shadow-xs'
                    : 'bg-slate-800/80 border border-slate-700/60 text-slate-100 rounded-tl-none'
                }`}
              >
                <div className={`flex items-center justify-between space-x-4 mb-1 text-[11px] font-mono ${
                  isGlass ? 'text-slate-500' : 'opacity-60'
                }`}>
                  <span className="font-semibold uppercase">
                    {msg.speaker === 'user' ? 'Operator / Prospect' : msg.speaker === 'agent' ? 'Growth AI' : 'System'}
                  </span>
                  <span>{msg.timestamp}</span>
                </div>
                <p className="leading-relaxed">
                  {msg.text || (msg.isPartial ? 'Speaking...' : '[Voice audio turn]')}
                  {msg.isPartial && <span className="inline-block w-1.5 h-3 ml-1 bg-cyan-400 animate-pulse" />}
                </p>
              </div>

              {msg.speaker === 'user' && (
                <div className={`w-7 h-7 rounded-lg border flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  isGlass ? 'bg-sky-50 border-sky-200 text-sky-600' : 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                }`}>
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Active Tool Executions HUD */}
      {activeTools.length > 0 && (
        <div className={`border-t px-4 py-2.5 space-y-1.5 ${
          isGlass ? 'border-slate-200/80 bg-slate-50/90' : 'border-slate-800/80 bg-slate-950/70'
        }`}>
          <div className={`flex items-center space-x-2 text-xs font-mono ${isGlass ? 'text-slate-600' : 'text-slate-400'}`}>
            <Wrench className={`w-3.5 h-3.5 ${isGlass ? 'text-emerald-600' : 'text-emerald-400'}`} />
            <span className={`font-semibold ${isGlass ? 'text-slate-700' : 'text-slate-300'}`}>Autonomous Tool Orchestration Layer:</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {activeTools.map((tool) => (
              <div
                key={tool.id}
                className={`flex items-center space-x-2 px-2.5 py-1 rounded-lg text-xs font-mono border shadow-xs ${
                  isGlass
                    ? 'bg-white border-emerald-300 text-emerald-800'
                    : 'bg-slate-900 border-emerald-500/40 text-emerald-300 shadow-sm'
                }`}
              >
                <CheckCircle2 className={`w-3.5 h-3.5 ${isGlass ? 'text-emerald-600' : 'text-emerald-400'}`} />
                <span className="font-semibold">{tool.name}</span>
                {tool.result && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                    isGlass ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {tool.name === 'process_retention_offer'
                      ? 'Clamped 15% (Policy)'
                      : tool.name === 'enrich_prospect_dossier'
                      ? 'Saved to Vault & CRM'
                      : 'Synced CRM'}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interactive Text & Keyboard Input Bar */}
      <div className={`border-t p-3 space-y-2 ${
        isGlass ? 'border-slate-200/80 bg-slate-50/95' : 'border-slate-800/80 bg-slate-950/95'
      }`}>
        {/* Quick Answer Chips */}
        <div className={`flex items-center space-x-1.5 overflow-x-auto pb-1 text-[11px] font-mono scrollbar-none ${
          isGlass ? 'text-slate-600' : 'text-slate-400'
        }`}>
          <span className={`font-semibold flex-shrink-0 flex items-center space-x-1 ${isGlass ? 'text-slate-700' : 'text-slate-500'}`}>
            <Sparkles className={`w-3 h-3 ${isGlass ? 'text-sky-600' : 'text-cyan-400'}`} />
            <span>Suggestions:</span>
          </span>
          <button
            type="button"
            onClick={() => setTypedInput('My email is founder@mygrowthproject.com and phone is +1 (555) 234-5678')}
            className={`px-2 py-0.5 rounded border text-xs transition-all flex-shrink-0 ${
              isGlass
                ? 'bg-white hover:bg-sky-50 border-slate-200 text-sky-800 shadow-xs'
                : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-cyan-300 hover:text-cyan-200'
            }`}
          >
            📧 Attach Email & Phone
          </button>
          <button
            type="button"
            onClick={() => setTypedInput('We have 15,000 members and $5,000 budget, looking to launch a $2,997 program in 3 weeks')}
            className={`px-2 py-0.5 rounded border text-xs transition-all flex-shrink-0 ${
              isGlass
                ? 'bg-white hover:bg-purple-50 border-slate-200 text-purple-800 shadow-xs'
                : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-purple-300 hover:text-purple-200'
            }`}
          >
            💰 $5k Budget & 15k Members
          </button>
          <button
            type="button"
            onClick={() => setTypedInput('How does your 14-day action-based guarantee work?')}
            className={`px-2 py-0.5 rounded border text-xs transition-all flex-shrink-0 ${
              isGlass
                ? 'bg-white hover:bg-amber-50 border-slate-200 text-amber-800 shadow-xs'
                : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-amber-300 hover:text-amber-200'
            }`}
          >
            🛡️ 14-Day Guarantee
          </button>
        </div>

        {/* Keyboard Input Form */}
        <form onSubmit={handleSend} className="flex items-center space-x-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={typedInput}
              onChange={(e) => setTypedInput(e.target.value)}
              placeholder="Type your email, phone, project details, or questions to Anna..."
              className={`w-full pl-3.5 pr-20 py-2.5 rounded-xl border text-xs font-mono transition-all ${
                isGlass
                  ? 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 shadow-xs'
                  : 'bg-slate-900 border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500'
              }`}
            />
            <span className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono pointer-events-none ${
              isGlass ? 'text-slate-400' : 'text-slate-600'
            }`}>
              Press ↵
            </span>
          </div>

          <button
            type="submit"
            disabled={!typedInput.trim() || isSendingMessage}
            className={`flex items-center space-x-1.5 px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg disabled:opacity-40 transition-all flex-shrink-0 ${
              isGlass
                ? 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white shadow-sky-500/20'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-cyan-500/20'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};

