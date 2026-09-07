import React, { useEffect, useRef } from 'react';

export const AmbientVercelShader: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    let mouseX = width / 2;
    let mouseY = height / 3;
    let targetMouseX = mouseX;
    let targetMouseY = mouseY;

    const handleMouseMove = (e: MouseEvent) => {
      targetMouseX = e.clientX;
      targetMouseY = e.clientY;
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);

    // Particle field
    const particles: Array<{
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      opacity: number;
    }> = [];

    for (let i = 0; i < 45; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 1.5 + 0.5,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: (Math.random() - 0.5) * 0.3,
        opacity: Math.random() * 0.4 + 0.1
      });
    }

    let time = 0;

    const render = () => {
      time += 0.01;

      // Smooth mouse follow (spring lerp)
      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;

      ctx.clearRect(0, 0, width, height);

      // 1. OLED Black Base
      ctx.fillStyle = '#05070f';
      ctx.fillRect(0, 0, width, height);

      // 2. Cursor-Following Glowing Radial Beam (Vercel Spotlight)
      const spotlight = ctx.createRadialGradient(
        mouseX,
        mouseY,
        0,
        mouseX,
        mouseY,
        Math.max(width * 0.4, 450)
      );
      spotlight.addColorStop(0, 'rgba(56, 189, 248, 0.12)'); // Cyan glow
      spotlight.addColorStop(0.35, 'rgba(99, 102, 241, 0.06)'); // Indigo glow
      spotlight.addColorStop(0.7, 'rgba(147, 51, 234, 0.02)'); // Purple glow
      spotlight.addColorStop(1, 'transparent');

      ctx.fillStyle = spotlight;
      ctx.fillRect(0, 0, width, height);

      // 3. Top Horizon Ambient Beam
      const horizonBeam = ctx.createRadialGradient(
        width / 2,
        0,
        0,
        width / 2,
        0,
        width * 0.6
      );
      horizonBeam.addColorStop(0, 'rgba(16, 185, 129, 0.05)'); // Emerald hint
      horizonBeam.addColorStop(0.5, 'rgba(6, 182, 212, 0.03)');
      horizonBeam.addColorStop(1, 'transparent');
      ctx.fillStyle = horizonBeam;
      ctx.fillRect(0, 0, width, height * 0.5);

      // 4. Subtle 3D Perspective Cyber Grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
      ctx.lineWidth = 1;

      const gridSize = 48;
      const startX = 0;
      const startY = 0;

      // Vertical lines
      for (let x = startX; x <= width; x += gridSize) {
        // Subtle proximity glow to mouse
        const distToMouse = Math.abs(x - mouseX);
        if (distToMouse < 220) {
          const alpha = 0.025 + (1 - distToMouse / 220) * 0.06;
          ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
        } else {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
        }

        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Horizontal lines
      for (let y = startY; y <= height; y += gridSize) {
        const distToMouse = Math.abs(y - mouseY);
        if (distToMouse < 220) {
          const alpha = 0.025 + (1 - distToMouse / 220) * 0.06;
          ctx.strokeStyle = `rgba(168, 85, 247, ${alpha})`;
        } else {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
        }

        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // 5. Floating Ambient Dust Particles
      for (const p of particles) {
        p.x += p.speedX;
        p.y += p.speedY;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(148, 163, 184, ${p.opacity * (0.8 + 0.2 * Math.sin(time + p.x))})`;
        ctx.fill();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 opacity-90 transition-opacity duration-1000"
      style={{ willChange: 'transform' }}
    />
  );
};
