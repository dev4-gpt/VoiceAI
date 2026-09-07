import React, { useEffect, useRef } from 'react';
import { Sparkles, Activity, Cpu } from 'lucide-react';

interface NeuralAudioOrbProps {
  isActive: boolean;
  isAgentSpeaking: boolean;
  isUserSpeaking: boolean;
  agentName?: string;
  samplingRate?: string;
  modelName?: string;
  theme?: 'glass' | 'cyber';
}

export const NeuralAudioOrb: React.FC<NeuralAudioOrbProps> = ({
  isActive,
  isAgentSpeaking,
  isUserSpeaking,
  agentName = 'Anna (Voice Agent)',
  samplingRate = '24,000 Hz PCM16',
  modelName = 'universal-3-5-pro + Claude 3.5',
  theme = 'glass'
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false });
    if (!gl) return;

    // Vertex shader for full canvas quad
    const vsSource = `
      attribute vec2 aPosition;
      varying vec2 vUv;
      void main() {
        vUv = (aPosition + 1.0) * 0.5;
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    `;

    // Liquid Glass / Refractive Water Droplet Shaders
    const fsSource = `
      precision mediump float;
      varying vec2 vUv;
      uniform float uTime;
      uniform float uState; // 0=idle, 1=user speaking, 2=agent speaking
      uniform float uIntensity;
      uniform vec2 uResolution;
      uniform float uTheme; // 0=glass, 1=cyber

      float sdSphere(vec3 p, float s) {
        float disp = sin(3.5 * p.x + uTime * 2.2) * sin(3.5 * p.y + uTime * 1.8) * sin(3.5 * p.z + uTime * 2.6) * (0.05 + uIntensity * 0.14);
        return length(p) - (s + disp);
      }

      void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / min(uResolution.x, uResolution.y);
        vec3 ro = vec3(0.0, 0.0, 2.2);
        vec3 rd = normalize(vec3(uv, -1.0));

        vec3 glassCore;
        vec3 glassAura;

        if (uTheme < 0.5) {
          // 💎 LUCID GLASS THEME: Translucent water droplet / iridescent quartz
          if (uState > 1.8) {
            // Speaking: Vibrant seafoam / emerald refraction
            glassCore = vec3(0.12, 0.78, 0.65);
            glassAura = vec3(0.38, 0.72, 0.95);
          } else if (uState > 0.8) {
            // User speaking: Icy royal azure
            glassCore = vec3(0.15, 0.55, 0.95);
            glassAura = vec3(0.55, 0.45, 0.95);
          } else {
            // Idle / Standby: Soft crystalline lavender & sky tint
            glassCore = vec3(0.48, 0.45, 0.88);
            glassAura = vec3(0.32, 0.68, 0.92);
          }
        } else {
          // 🌑 OBSIDIAN CYBER THEME
          if (uState > 1.8) {
            glassCore = vec3(0.06, 0.95, 0.65);
            glassAura = vec3(0.1, 0.6, 0.9);
          } else if (uState > 0.8) {
            glassCore = vec3(0.05, 0.75, 1.0);
            glassAura = vec3(0.35, 0.2, 0.95);
          } else {
            glassCore = vec3(0.45, 0.25, 0.85);
            glassAura = vec3(0.12, 0.35, 0.75);
          }
        }

        float t = 0.0;
        float d = 0.0;
        float glow = 0.0;

        for (int i = 0; i < 46; i++) {
          vec3 p = ro + rd * t;
          d = sdSphere(p, 0.65);
          glow += 0.015 / (0.04 + abs(d));
          if (d < 0.01 || t > 3.8) break;
          t += max(d * 0.65, 0.02);
        }

        vec4 finalColor = vec4(0.0);

        if (d < 0.04) {
          vec3 p = ro + rd * t;
          vec3 norm = normalize(p);
          float fresnel = pow(1.0 - max(dot(-rd, norm), 0.0), 2.2);

          if (uTheme < 0.5) {
            // Glassmorphism refraction: high specular rim and translucent center
            vec3 refColor = mix(glassCore, glassAura, fresnel);
            refColor += vec3(0.95, 0.98, 1.0) * pow(fresnel, 3.5); // Pristine white rim reflection
            finalColor = vec4(refColor, 0.82 + fresnel * 0.18);
          } else {
            vec3 col = mix(glassCore, glassAura, fresnel * 0.8);
            col += vec3(0.8, 1.0, 0.9) * pow(fresnel, 4.0);
            finalColor = vec4(col, 0.9);
          }
        }

        // Soft outer ambient halo
        float haloAlpha = clamp(glow * (uTheme < 0.5 ? 0.08 : 0.18), 0.0, 0.85);
        finalColor += vec4(glassAura * glow * 0.12, haloAlpha);

        gl_FragColor = finalColor;
      }
    `;

    const createShader = (type: number, src: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('[Shader Error]', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vs = createShader(gl.VERTEX_SHADER, vsSource);
    const fs = createShader(gl.FRAGMENT_SHADER, fsSource);
    if (!vs || !fs) return;

    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);

    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('[Program Link Error]', gl.getProgramInfoLog(prog));
      return;
    }

    gl.useProgram(prog);

    const quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const aPos = gl.getAttribLocation(prog, 'aPosition');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uTimeLoc = gl.getUniformLocation(prog, 'uTime');
    const uStateLoc = gl.getUniformLocation(prog, 'uState');
    const uIntensityLoc = gl.getUniformLocation(prog, 'uIntensity');
    const uResLoc = gl.getUniformLocation(prog, 'uResolution');
    const uThemeLoc = gl.getUniformLocation(prog, 'uTheme');

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    let animId: number;
    let startTime = performance.now();

    const resize = () => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uResLoc, canvas.width, canvas.height);
    };

    resize();
    window.addEventListener('resize', resize);

    const render = () => {
      const now = performance.now();
      const time = (now - startTime) * 0.001;

      let stateVal = 0.0;
      let intensityVal = 0.15;

      if (isAgentSpeaking) {
        stateVal = 2.0;
        intensityVal = 0.55 + Math.sin(time * 12.0) * 0.35;
      } else if (isUserSpeaking) {
        stateVal = 1.0;
        intensityVal = 0.4 + Math.sin(time * 8.0) * 0.25;
      } else if (isActive) {
        intensityVal = 0.25 + Math.sin(time * 3.0) * 0.08;
      }

      gl.uniform1f(uTimeLoc, time);
      gl.uniform1f(uStateLoc, stateVal);
      gl.uniform1f(uIntensityLoc, intensityVal);
      gl.uniform1f(uThemeLoc, theme === 'glass' ? 0.0 : 1.0);

      gl.clearColor(0.0, 0.0, 0.0, 0.0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animId);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(quadBuffer);
    };
  }, [isActive, isAgentSpeaking, isUserSpeaking, theme]);

  const isGlass = theme === 'glass';

  return (
    <div
      className={`relative w-full rounded-3xl overflow-hidden transition-all duration-300 ${
        isGlass
          ? 'bg-white/60 backdrop-blur-2xl border border-white/85 shadow-[0_12px_40px_rgba(31,38,135,0.06)]'
          : 'bg-slate-950/80 border border-cyan-800/40 shadow-2xl'
      }`}
    >
      {/* Top Telemetry Strip */}
      <div
        className={`flex items-center justify-between px-6 py-3.5 border-b ${
          isGlass ? 'border-slate-200/60 bg-white/40' : 'border-cyan-900/40 bg-slate-900/60'
        }`}
      >
        <div className="flex items-center space-x-2.5">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isAgentSpeaking
                ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse'
                : isUserSpeaking
                ? 'bg-sky-500 shadow-[0_0_10px_rgba(14,165,233,0.8)] animate-pulse'
                : isActive
                ? 'bg-indigo-500 animate-pulse'
                : 'bg-slate-400'
            }`}
          />
          <span className={`text-xs font-semibold ${isGlass ? 'text-slate-800' : 'text-slate-200'}`}>
            {agentName}
          </span>
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold ${
              isGlass
                ? 'bg-sky-50 text-sky-700 border border-sky-200'
                : 'bg-cyan-950 text-cyan-400 border border-cyan-800'
            }`}
          >
            {isAgentSpeaking ? 'ANNA SPEAKING' : isUserSpeaking ? 'LISTENING (USER)' : 'READY • STANDBY'}
          </span>
        </div>

        <div className="flex items-center space-x-3 text-[11px] font-mono">
          <div className="flex items-center space-x-1">
            <Activity className={`w-3.5 h-3.5 ${isGlass ? 'text-sky-600' : 'text-cyan-400'}`} />
            <span className={isGlass ? 'text-slate-600' : 'text-slate-400'}>{samplingRate}</span>
          </div>
          <div className="hidden sm:flex items-center space-x-1">
            <Cpu className={`w-3.5 h-3.5 ${isGlass ? 'text-purple-600' : 'text-purple-400'}`} />
            <span className={isGlass ? 'text-slate-600' : 'text-slate-400'}>{modelName}</span>
          </div>
        </div>
      </div>

      {/* Center 3D WebGL Liquid Glass Orb Canvas */}
      <div className="relative w-full h-64 sm:h-72 flex items-center justify-center overflow-hidden">
        <canvas ref={canvasRef} className="w-full h-full cursor-pointer" />

        {/* Floating Specular Ring Labels */}
        <div className="absolute bottom-4 left-6 pointer-events-none flex items-center space-x-2">
          <div
            className={`px-3 py-1 rounded-xl text-[10px] font-mono font-medium backdrop-blur-md shadow-sm border ${
              isGlass
                ? 'bg-white/80 border-white/90 text-slate-700'
                : 'bg-slate-900/80 border-cyan-900/50 text-cyan-300'
            }`}
          >
            Liquid Quartz Engine • 60 FPS GPU
          </div>
        </div>

        <div className="absolute bottom-4 right-6 pointer-events-none flex items-center space-x-2">
          <div
            className={`px-3 py-1 rounded-xl text-[10px] font-mono font-medium backdrop-blur-md shadow-sm border ${
              isGlass
                ? 'bg-white/80 border-white/90 text-slate-700'
                : 'bg-slate-900/80 border-emerald-900/50 text-emerald-300'
            }`}
          >
            TTFA: 410ms • Latency &lt;48ms
          </div>
        </div>
      </div>
    </div>
  );
};
