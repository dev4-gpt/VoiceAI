import React, { useState, useEffect, useRef } from 'react';
import {
  Compass,
  Zap,
  Mic,
  Database,
  Sparkles,
  BarChart3,
  GitFork,
  ChevronRight,
  ChevronDown,
  Navigation2,
  Sliders,
  Maximize2
} from 'lucide-react';

export interface SpatialStratum {
  id: string;
  name: string;
  subtitle: string;
  depthMeters: number; // e.g. 0, 1800, 3600, 5400, 7200
  accentColor: string;
  icon: React.ReactNode;
}

export const STRATA: SpatialStratum[] = [
  {
    id: 'senses',
    name: 'Stratum 0: Acoustic Surface',
    subtitle: 'Real-time Full-Duplex Speech & Sensory Gateway',
    depthMeters: 0,
    accentColor: '#06b6d4', // Cyan
    icon: <Mic className="w-4 h-4 text-cyan-400" />
  },
  {
    id: 'crm',
    name: 'Stratum 1: Logic Stream',
    subtitle: 'Autonomous BANT Qualification & Revenue Pipeline',
    depthMeters: 1800,
    accentColor: '#10b981', // Emerald
    icon: <Database className="w-4 h-4 text-emerald-400" />
  },
  {
    id: 'content',
    name: 'Stratum 2: Synthesizer Reactor',
    subtitle: 'Hermes Content Studio & DeepSeek-R1 DSPy Self-Healing',
    depthMeters: 3600,
    accentColor: '#a855f7', // Purple
    icon: <Sparkles className="w-4 h-4 text-purple-400" />
  },
  {
    id: 'evals',
    name: 'Stratum 3: Diagnostics Observatory',
    subtitle: 'Anthropic Automated Evals & Latency Telemetry Matrix',
    depthMeters: 5400,
    accentColor: '#3b82f6', // Blue
    icon: <BarChart3 className="w-4 h-4 text-blue-400" />
  },
  {
    id: 'vault',
    name: 'Stratum 4: Memory Cosmos',
    subtitle: 'Persistent Knowledge Graph & Obsidian Markdown Vault',
    depthMeters: 7200,
    accentColor: '#10b981', // Emerald
    icon: <GitFork className="w-4 h-4 text-emerald-400" />
  }
];

interface Spatial3DOdysseyProps {
  consoleContent: React.ReactNode;
  crmContent: React.ReactNode;
  contentStudioContent: React.ReactNode;
  evalsContent: React.ReactNode;
  graphContent: React.ReactNode;
  onExitOdyssey?: () => void;
}

export const Spatial3DOdyssey: React.FC<Spatial3DOdysseyProps> = ({
  consoleContent,
  crmContent,
  contentStudioContent,
  evalsContent,
  graphContent,
  onExitOdyssey
}) => {
  // Current camera Z position in CSS pixels (0 to 7200)
  const [currentZ, setCurrentZ] = useState(0);
  const targetZRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Mouse tilt / parallax state
  const [mouseTilt, setMouseTilt] = useState({ x: 0, y: 0 });

  // Camera damping physics loop (lerp)
  useEffect(() => {
    const loop = () => {
      setCurrentZ((prev) => {
        const diff = targetZRef.current - prev;
        if (Math.abs(diff) < 0.2) return targetZRef.current;
        return prev + diff * 0.085; // smooth damping
      });
      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Wheel scroll handler: map vertical scroll delta to Z-axis travel
  const handleWheel = (e: React.WheelEvent) => {
    // Only scroll Z if not actively scrolling an inner container that has overflow
    const target = e.target as HTMLElement;
    const isInsideScrollable = target.closest('.scrollable-chamber-content');
    
    // If the inner content is scrolled to bounds or not hovering a scrollable, travel in Z
    if (!isInsideScrollable) {
      e.preventDefault();
      const delta = e.deltaY * 1.6;
      targetZRef.current = Math.max(0, Math.min(7200, targetZRef.current + delta));
    }
  };

  // Mouse move for subtle 3D parallax
  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;
    const x = (clientX / innerWidth - 0.5) * 4; // -2 to +2 deg
    const y = (clientY / innerHeight - 0.5) * -4;
    setMouseTilt({ x, y });
  };

  // Warp directly to a stratum
  const handleWarpToStratum = (depth: number) => {
    targetZRef.current = depth;
  };

  // Find active stratum based on currentZ
  const activeStratumIndex = Math.min(
    STRATA.length - 1,
    Math.max(0, Math.round(currentZ / 1800))
  );
  const activeStratum = STRATA[activeStratumIndex];

  // Calculate chamber transform style based on camera position
  const getChamberStyle = (stratumDepth: number) => {
    // Distance from camera plane
    const relZ = stratumDepth - currentZ;
    const absDist = Math.abs(relZ);

    // Culling logic: completely hide chambers that are very far
    if (absDist > 2400) {
      return {
        display: 'none',
        transform: `translate3d(0, 0, ${-stratumDepth}px)`
      };
    }

    // Opacity: 1 when close, fades out smoothly as distance increases
    const opacity = Math.max(0, Math.min(1, 1 - (absDist - 300) / 1200));

    // Scale & perspective push: create tactile volumetric presence
    const blur = Math.max(0, (absDist - 400) / 120);

    // Pointer events: only interactive when in immediate focus
    const isInteractive = absDist < 450;

    return {
      transform: `translate3d(0, 0, ${-stratumDepth}px)`,
      opacity,
      filter: blur > 0.5 ? `blur(${blur}px)` : 'none',
      pointerEvents: isInteractive ? ('auto' as const) : ('none' as const),
      transition: 'filter 0.3s ease-out, opacity 0.3s ease-out'
    };
  };

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onMouseMove={handleMouseMove}
      className="relative w-full h-[calc(100vh-80px)] overflow-hidden bg-[#03050d] select-none"
      style={{ perspective: '1100px' }}
    >
      {/* 1. Spatial Warp Radar HUD (Floating Top Control Deck) */}
      <div className="absolute top-4 left-6 right-6 z-40 flex flex-wrap items-center justify-between gap-3 pointer-events-auto">
        {/* Left: Active Chamber Telemetry */}
        <div className="flex items-center space-x-3 bg-slate-950/80 border border-cyan-800/60 backdrop-blur-2xl px-4 py-2 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
            <Compass className="w-4 h-4 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold">
                {activeStratum.name}
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 border border-cyan-800 text-cyan-300 font-bold">
                Z: -{Math.round(currentZ)}m
              </span>
            </div>
            <p className="text-[11px] text-slate-300 font-medium">{activeStratum.subtitle}</p>
          </div>
        </div>

        {/* Center: Interactive Stratum Warp Pills */}
        <div className="flex items-center space-x-1.5 bg-slate-950/80 border border-slate-800/80 backdrop-blur-2xl p-1.5 rounded-2xl shadow-xl">
          {STRATA.map((stratum, idx) => {
            const isActive = activeStratumIndex === idx;
            return (
              <button
                key={stratum.id}
                onClick={() => handleWarpToStratum(stratum.depthMeters)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/60 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                {stratum.icon}
                <span className="hidden md:inline">{stratum.name.split(':')[1]?.trim() || stratum.name}</span>
                <span className="text-[9px] opacity-60">L{idx}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Depth Scrubber & Exit Control */}
        <div className="flex items-center space-x-2 bg-slate-950/80 border border-slate-800/80 backdrop-blur-2xl px-3 py-1.5 rounded-2xl shadow-xl">
          <div className="flex items-center space-x-2 mr-2">
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <input
              type="range"
              min="0"
              max="7200"
              step="50"
              value={Math.round(currentZ)}
              onChange={(e) => {
                targetZRef.current = Number(e.target.value);
              }}
              className="w-24 sm:w-32 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              title="Z-Axis Scrollytelling Depth Slider"
            />
          </div>

          {onExitOdyssey && (
            <button
              onClick={onExitOdyssey}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono transition-all"
              title="Return to standard flat workspace view"
            >
              <Maximize2 className="w-3 h-3 text-slate-400" />
              <span>Tactical View</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Floating Navigation Helper Pill (Bottom Center) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 pointer-events-none flex items-center space-x-2 bg-slate-950/80 border border-cyan-800/40 backdrop-blur-xl px-4 py-1.5 rounded-full text-[11px] text-slate-300 font-mono shadow-2xl">
        <Navigation2 className="w-3.5 h-3.5 text-cyan-400 animate-bounce" />
        <span>
          Scroll mouse wheel to <strong>Dive Forward</strong> into AI Core • Click pills above to <strong>Warp</strong>
        </span>
      </div>

      {/* 3. The 3D Spatial World (Container with 3D Space) */}
      <div
        className="w-full h-full relative"
        style={{
          transformStyle: 'preserve-3d',
          transform: `translate3d(0, 0, ${currentZ}px) rotateX(${mouseTilt.y}deg) rotateY(${mouseTilt.x}deg)`,
          transition: 'transform 0.06s cubic-bezier(0.1, 0.9, 0.2, 1)'
        }}
      >
        {/* ============================================================ */}
        {/* CHAMBER 0: THE ACOUSTIC SURFACE (Voice Console & Senses)     */}
        {/* ============================================================ */}
        <div
          className="absolute inset-0 flex items-center justify-center p-6"
          style={getChamberStyle(0)}
        >
          <div className="w-full max-w-6xl max-h-[85vh] overflow-y-auto custom-scrollbar scrollable-chamber-content bg-slate-950/75 border border-cyan-800/40 rounded-3xl p-6 shadow-[0_30px_90px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-cyan-800/30">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300">
                  <Mic className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight flex items-center space-x-2">
                    <span>Stratum 0 • The Acoustic Surface</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-semibold">
                      Z = 0m
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">Full-Duplex Speech Acoustics & Interactive Inbound Demo Hub</p>
                </div>
              </div>
              <button
                onClick={() => handleWarpToStratum(1800)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/40 border border-cyan-500/50 text-cyan-200 text-xs font-mono font-semibold transition-all"
              >
                <span>Dive to Revenue CRM</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            {consoleContent}
          </div>
        </div>

        {/* ============================================================ */}
        {/* CHAMBER 1: THE LOGIC STREAM (Revenue CRM & Deal Flow)        */}
        {/* ============================================================ */}
        <div
          className="absolute inset-0 flex items-center justify-center p-6"
          style={getChamberStyle(1800)}
        >
          <div className="w-full max-w-6xl max-h-[85vh] overflow-y-auto custom-scrollbar scrollable-chamber-content bg-slate-950/75 border border-emerald-800/40 rounded-3xl p-6 shadow-[0_30px_90px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-emerald-800/30">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight flex items-center space-x-2">
                    <span>Stratum 1 • The Logic Stream</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold">
                      Z = -1,800m
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">Autonomous BANT Qualification & Revenue Pipeline Cylinder</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleWarpToStratum(0)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 text-xs font-mono"
                >
                  ↑ Surface
                </button>
                <button
                  onClick={() => handleWarpToStratum(3600)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/50 text-emerald-200 text-xs font-mono font-semibold transition-all"
                >
                  <span>Dive to Hermes Reactor</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {crmContent}
          </div>
        </div>

        {/* ============================================================ */}
        {/* CHAMBER 2: THE SYNTHESIZER REACTOR (Hermes Content Studio)   */}
        {/* ============================================================ */}
        <div
          className="absolute inset-0 flex items-center justify-center p-6"
          style={getChamberStyle(3600)}
        >
          <div className="w-full max-w-6xl max-h-[85vh] overflow-y-auto custom-scrollbar scrollable-chamber-content bg-slate-950/75 border border-purple-800/40 rounded-3xl p-6 shadow-[0_30px_90px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-purple-800/30">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-400/40 text-purple-300">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight flex items-center space-x-2">
                    <span>Stratum 2 • The Synthesizer Reactor</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-semibold">
                      Z = -3,600m
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">DeepSeek-R1 DSPy Self-Healing & Parallel Research Matrix</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleWarpToStratum(1800)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 text-xs font-mono"
                >
                  ↑ CRM
                </button>
                <button
                  onClick={() => handleWarpToStratum(5400)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/50 text-purple-200 text-xs font-mono font-semibold transition-all"
                >
                  <span>Dive to Diagnostics</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {contentStudioContent}
          </div>
        </div>

        {/* ============================================================ */}
        {/* CHAMBER 3: THE DIAGNOSTICS OBSERVATORY (Anthropic Evals)     */}
        {/* ============================================================ */}
        <div
          className="absolute inset-0 flex items-center justify-center p-6"
          style={getChamberStyle(5400)}
        >
          <div className="w-full max-w-6xl max-h-[85vh] overflow-y-auto custom-scrollbar scrollable-chamber-content bg-slate-950/75 border border-blue-800/40 rounded-3xl p-6 shadow-[0_30px_90px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-blue-800/30">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-blue-500/20 border border-blue-400/40 text-blue-300">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight flex items-center space-x-2">
                    <span>Stratum 3 • The Diagnostics Observatory</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-semibold">
                      Z = -5,400m
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">Anthropic Automated Evals, Pass@k & Latency Radar Range</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleWarpToStratum(3600)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 text-xs font-mono"
                >
                  ↑ Synthesizer
                </button>
                <button
                  onClick={() => handleWarpToStratum(7200)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/50 text-blue-200 text-xs font-mono font-semibold transition-all"
                >
                  <span>Dive to Memory Vault</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {evalsContent}
          </div>
        </div>

        {/* ============================================================ */}
        {/* CHAMBER 4: THE MEMORY COSMOS (Knowledge Graph & Vault)       */}
        {/* ============================================================ */}
        <div
          className="absolute inset-0 flex items-center justify-center p-6"
          style={getChamberStyle(7200)}
        >
          <div className="w-full max-w-6xl max-h-[85vh] overflow-y-auto custom-scrollbar scrollable-chamber-content bg-slate-950/75 border border-emerald-800/40 rounded-3xl p-6 shadow-[0_30px_90px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-emerald-800/30">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300">
                  <GitFork className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight flex items-center space-x-2">
                    <span>Stratum 4 • The Memory Cosmos & Cognitive Vault</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold">
                      Z = -7,200m
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">3D Synaptic Constellation & Obsidian Markdown Knowledge Graph</p>
                </div>
              </div>
              <button
                onClick={() => handleWarpToStratum(0)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/50 text-emerald-200 text-xs font-mono font-semibold transition-all"
              >
                <span>↑ Ascent to Surface (Z = 0m)</span>
              </button>
            </div>
            {graphContent}
          </div>
        </div>
      </div>
    </div>
  );
};
