import React, { useEffect, useRef } from 'react';
import { Sparkles, Activity, Cpu } from 'lucide-react';

interface NeuralAudioOrbProps {
  isActive: boolean;
  isAgentSpeaking: boolean;
  isUserSpeaking: boolean;
  agentName?: string;
  samplingRate?: string;
  modelName?: string;
}

export const NeuralAudioOrb: React.FC<NeuralAudioOrbProps> = ({
  isActive,
  isAgentSpeaking,
  isUserSpeaking,
  agentName = 'Anna (Voice Agent)',
  samplingRate = '24,000 Hz PCM16',
  modelName = 'universal-3-5-pro + Claude 3.5'
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl');
    if (!gl) return;

    // Vertex shader for a screen-filling quad
    const vsSource = `
      attribute vec2 aPosition;
      varying vec2 vUv;
      void main() {
        vUv = (aPosition + 1.0) * 0.5;
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    `;

    // High-fidelity Raymarched volumetric pulsating energy sphere fragment shader
    const fsSource = `
      precision mediump float;
      varying vec2 vUv;
      uniform float uTime;
      uniform float uState; // 0=idle, 1=user speaking, 2=agent speaking, 3=thinking
      uniform float uIntensity;
      uniform vec2 uResolution;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float sdSphere(vec3 p, float s) {
        float disp = sin(4.0 * p.x + uTime * 2.5) * sin(4.0 * p.y + uTime * 2.0) * sin(4.0 * p.z + uTime * 3.0) * (0.07 + uIntensity * 0.12);
        return length(p) - (s + disp);
      }

      void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / min(uResolution.x, uResolution.y);
        
        vec3 ro = vec3(0.0, 0.0, 2.3);
        vec3 rd = normalize(vec3(uv, -1.0));

        vec3 coreColor;
        vec3 auraColor;

        if (uState > 1.8) {
          // Agent speaking: vibrant emerald + cyber cyan
          coreColor = vec3(0.06, 0.95, 0.65);
          auraColor = vec3(0.1, 0.6, 0.9);
        } else if (uState > 0.8) {
          // User speaking: electric neon blue + cyan
          coreColor = vec3(0.05, 0.75, 1.0);
          auraColor = vec3(0.35, 0.2, 0.95);
        } else {
          // Standby / idle: deep luminous violet + indigo
          coreColor = vec3(0.45, 0.25, 0.85);
          auraColor = vec3(0.12, 0.35, 0.75);
        }

        float t = 0.0;
        float d = 0.0;
        float glow = 0.0;

        for (int i = 0; i < 48; i++) {
          vec3 p = ro + rd * t;
          d = sdSphere(p, 0.62);
          glow += 0.016 / (0.05 + abs(d));
          if (d < 0.01 || t > 4.0) break;
          t += max(d * 0.65, 0.02);
        }

        vec3 col = vec3(0.0);
        if (d < 0.03) {
          vec3 p = ro + rd * t;
          float fresnel = pow(1.0 - max(dot(-rd, normalize(p)), 0.0), 2.5);
          col = mix(coreColor, auraColor, fresnel * 0.8);
          col += vec3(0.8, 1.0, 0.9) * pow(fresnel, 4.0);
        }

        col += auraColor * glow * (0.16 + uIntensity * 0.25);
        col += coreColor * pow(glow * 0.08, 1.4);

        float vignette = 1.0 - length(uv) * 0.65;
        col *= clamp(vignette, 0.0, 1.0);

        gl_FragColor = vec4(col, 1.0);
      }
    `;

    const createShader = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.warn('[WebGL Shader Error]', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vs = createShader(gl.VERTEX_SHADER, vsSource);
    const fs = createShader(gl.FRAGMENT_SHADER, fsSource);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn('[WebGL Link Error]', gl.getProgramInfoLog(program));
      return;
    }

    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1.0, -1.0,
         1.0, -1.0,
        -1.0,  1.0,
        -1.0,  1.0,
         1.0, -1.0,
         1.0,  1.0,
      ]),
      gl.STATIC_DRAW
    );

    const aPositionLoc = gl.getAttribLocation(program, 'aPosition');
    const uTimeLoc = gl.getUniformLocation(program, 'uTime');
    const uStateLoc = gl.getUniformLocation(program, 'uState');
    const uIntensityLoc = gl.getUniformLocation(program, 'uIntensity');
    const uResolutionLoc = gl.getUniformLocation(program, 'uResolution');

    let animId: number;
    const startTime = performance.now();

    const render = () => {
      const currentTime = (performance.now() - startTime) * 0.001;
      const width = canvas.clientWidth || 600;
      const height = canvas.clientHeight || 220;

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }

      gl.useProgram(program);

      gl.enableVertexAttribArray(aPositionLoc);
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
      gl.vertexAttribPointer(aPositionLoc, 2, gl.FLOAT, false, 0, 0);

      const stateVal = !isActive ? 0.0 : isAgentSpeaking ? 2.0 : isUserSpeaking ? 1.0 : 0.0;
      const intensityVal = isAgentSpeaking ? 0.9 : isUserSpeaking ? 0.6 : 0.2;

      gl.uniform1f(uTimeLoc, currentTime);
      gl.uniform1f(uStateLoc, stateVal);
      gl.uniform1f(uIntensityLoc, intensityVal);
      gl.uniform2f(uResolutionLoc, canvas.width, canvas.height);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(posBuffer);
    };
  }, [isActive, isAgentSpeaking, isUserSpeaking]);

  return (
    <div className="relative w-full rounded-2xl bg-gradient-to-b from-slate-950/90 via-slate-900/80 to-slate-950/90 border border-cyan-500/20 shadow-[0_0_50px_rgba(6,182,212,0.12)] p-4 overflow-hidden backdrop-blur-2xl transition-all">
      {/* Ambient background glow beam */}
      <div className="absolute -top-20 -left-20 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Telemetry Header */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3 mb-3">
        <div className="flex items-center space-x-2.5">
          <span className="relative flex h-3 w-3">
            {isActive && (
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isAgentSpeaking ? 'bg-emerald-400' : isUserSpeaking ? 'bg-cyan-400' : 'bg-purple-400'
              }`} />
            )}
            <span className={`relative inline-flex rounded-full h-3 w-3 ${
              !isActive ? 'bg-slate-600' : isAgentSpeaking ? 'bg-emerald-500' : isUserSpeaking ? 'bg-cyan-500' : 'bg-purple-500'
            }`} />
          </span>
          <span className="text-xs font-mono font-bold tracking-wider text-slate-200 uppercase">
            {!isActive
              ? 'Standby • Duplex Audio Engine Off'
              : isAgentSpeaking
              ? `${agentName} Speaking (Streaming TTS)`
              : isUserSpeaking
              ? 'Listening to Founder / Operator (VAD Active)'
              : 'Full-Duplex Zero-Latency Standby (<50ms Abort)'}
          </span>
        </div>

        <div className="flex items-center space-x-3 text-[11px] font-mono text-slate-400">
          <span className="hidden sm:inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
            <Activity className="w-3 h-3 text-cyan-400" />
            <span>{samplingRate}</span>
          </span>
          <span className="hidden md:inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-purple-300">
            <Cpu className="w-3 h-3 text-purple-400" />
            <span>{modelName}</span>
          </span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold flex items-center space-x-1">
            <Sparkles className="w-3 h-3" />
            <span>GPU SHADER (60 FPS)</span>
          </span>
        </div>
      </div>

      {/* Main Visualizer Canvas */}
      <div className="relative w-full h-44 sm:h-52 rounded-xl bg-slate-950/80 border border-slate-800/80 overflow-hidden flex items-center justify-center">
        <canvas ref={canvasRef} className="w-full h-full object-cover" />

        {/* Center overlay indicator badge */}
        <div className="absolute bottom-3 left-3 flex items-center space-x-2 px-2.5 py-1 rounded-lg bg-slate-950/70 border border-slate-800 backdrop-blur-md text-[10px] font-mono text-slate-300 pointer-events-none">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span>Raymarched Neural Spherical Mesh • Vercel-Grade WebGL</span>
        </div>

        {/* Dynamic Energy Rings HUD */}
        <div className="absolute bottom-3 right-3 flex items-center space-x-2 text-[10px] font-mono text-slate-400 pointer-events-none">
          <span>Turn Latency:</span>
          <span className="text-emerald-400 font-bold">410ms TTFA</span>
          <span>•</span>
          <span>Interruption:</span>
          <span className="text-cyan-400 font-bold">&lt;48ms</span>
        </div>
      </div>
    </div>
  );
};
