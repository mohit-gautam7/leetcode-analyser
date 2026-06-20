import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { isLowEndDevice } from '@/utils/helpers';

// ── Canvas-based fluid plasma background ─────────────────────────────────────
export function LiquidBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || isLowEndDevice()) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = canvas.width = canvas.offsetWidth;
    let H = canvas.height = canvas.offsetHeight;
    let t = 0;
    let rafId: number;

    // Color stops for the fluid gradient
    const palette = [
      [124, 58, 237],   // violet-600
      [99,  102, 241],  // indigo-500
      [6,   182, 212],  // cyan-500
      [34,  197, 94],   // emerald-500
      [236, 72,  153],  // pink-500
    ];

    function lerp(a: number[], b: number[], f: number) {
      return a.map((v, i) => Math.round(v + (b[i] - v) * f));
    }

    function plasmaColor(v: number) {
      v = (v + 1) / 2; // 0..1
      const n = palette.length - 1;
      const i = Math.min(Math.floor(v * n), n - 1);
      const f = v * n - i;
      const [r, g, b] = lerp(palette[i], palette[i + 1], f);
      return `rgba(${r},${g},${b},0.07)`;
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);

      // 3 overlapping radial plasma blobs
      const blobs = [
        { x: W * (0.2 + 0.3 * Math.sin(t * 0.4)),  y: H * (0.3 + 0.25 * Math.cos(t * 0.3)), r: W * 0.55, v: Math.sin(t * 0.3) },
        { x: W * (0.7 + 0.25 * Math.cos(t * 0.35)), y: H * (0.6 + 0.3  * Math.sin(t * 0.28)), r: W * 0.5, v: Math.sin(t * 0.5 + 2) },
        { x: W * (0.5 + 0.2  * Math.sin(t * 0.45)), y: H * (0.2 + 0.2  * Math.cos(t * 0.5)),  r: W * 0.4, v: Math.cos(t * 0.4 + 1) },
      ];

      for (const b of blobs) {
        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        g.addColorStop(0, plasmaColor(b.v));
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      }

      t += 0.012;
    }

    let frame = 0;
    function loop() {
      rafId = requestAnimationFrame(loop);
      frame++;
      if (frame % 2 !== 0) return; // 30 fps cap
      draw();
    }

    const ro = new ResizeObserver(() => {
      W = canvas.width = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
    });
    ro.observe(canvas);

    loop();
    return () => { cancelAnimationFrame(rafId); ro.disconnect(); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0, opacity: 1 }}
    />
  );
}

// ── Floating orbs with 3D-like depth ─────────────────────────────────────────
export function FloatingOrbs() {
  if (isLowEndDevice()) return null;

  const orbs = [
    { size: 280, x: '-5%',  y: '10%',  colors: ['rgba(124,58,237,0.12)', 'rgba(99,102,241,0.06)'],  duration: 18, delay: 0 },
    { size: 220, x: '55%',  y: '45%',  colors: ['rgba(6,182,212,0.10)',  'rgba(34,197,94,0.05)'],   duration: 22, delay: 2 },
    { size: 180, x: '30%',  y: '70%',  colors: ['rgba(236,72,153,0.08)', 'rgba(124,58,237,0.04)'],  duration: 26, delay: 4 },
    { size: 150, x: '80%',  y: '10%',  colors: ['rgba(34,197,94,0.07)',  'rgba(6,182,212,0.04)'],   duration: 20, delay: 6 },
  ];

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: orb.size,
            height: orb.size,
            left: orb.x,
            top: orb.y,
            background: `radial-gradient(circle at 40% 40%, ${orb.colors[0]}, ${orb.colors[1]}, transparent 70%)`,
            filter: 'blur(28px)',
          }}
          animate={{
            x: [0, 40, -30, 20, 0],
            y: [0, -30, 40, -20, 0],
            scale: [1, 1.08, 0.94, 1.04, 1],
          }}
          transition={{
            duration: orb.duration,
            delay: orb.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Aurora strip at top */}
      <motion.div
        className="absolute top-0 left-0 right-0"
        style={{
          height: 160,
          background: 'linear-gradient(180deg, rgba(124,58,237,0.18) 0%, rgba(99,102,241,0.1) 40%, transparent 100%)',
          filter: 'blur(20px)',
        }}
        animate={{ opacity: [0.6, 1, 0.7, 1, 0.6] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}

// ── Glass card with animated border ──────────────────────────────────────────
export function GlassCard({ children, className = '', glow = false, color = '#7C3AED' }: {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  color?: string;
}) {
  return (
    <motion.div
      className={`relative rounded-xl border backdrop-blur-sm ${className}`}
      style={{
        background: 'rgba(15,23,42,0.7)',
        borderColor: glow ? `${color}44` : 'rgba(100,116,139,0.15)',
        boxShadow: glow
          ? `0 0 0 1px ${color}22, 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)`
          : '0 4px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
      whileHover={glow ? {
        boxShadow: `0 0 0 1px ${color}55, 0 12px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)`,
        y: -1,
      } : {}}
      transition={{ duration: 0.2 }}
    >
      {glow && (
        <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
          <motion.div
            className="absolute inset-0 rounded-xl"
            style={{
              background: `linear-gradient(135deg, ${color}0A 0%, transparent 50%, ${color}06 100%)`,
            }}
            animate={{ opacity: [0.4, 0.9, 0.4] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
      )}
      {children}
    </motion.div>
  );
}

// ── Neon animated border ──────────────────────────────────────────────────────
export function NeonBorder({ children, className = '', active = false, color = '#8B5CF6' }: {
  children: React.ReactNode;
  className?: string;
  active?: boolean;
  color?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      {active && (
        <motion.div
          className="absolute inset-0 rounded-lg pointer-events-none"
          style={{
            background: `conic-gradient(from var(--angle), transparent 30%, ${color}, transparent 70%)`,
            padding: 1,
            WebkitMaskImage: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
          }}
          animate={{ '--angle': ['0deg', '360deg'] } as Record<string, string>}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />
      )}
      {children}
    </div>
  );
}

// ── Shimmer loader ────────────────────────────────────────────────────────────
export function ShimmerLoader({ className = '' }: { className?: string }) {
  return (
    <motion.div
      className={`rounded-lg ${className}`}
      style={{
        background: 'linear-gradient(90deg, rgba(30,41,59,0) 0%, rgba(124,58,237,0.12) 50%, rgba(30,41,59,0) 100%)',
        backgroundSize: '200% 100%',
      }}
      animate={{ backgroundPosition: ['-200% 0', '200% 0'] }}
      transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
    />
  );
}

// ── Ripple effect ─────────────────────────────────────────────────────────────
export function RippleEffect({ x, y, onComplete }: { x: number; y: number; onComplete: () => void }) {
  return (
    <motion.div
      className="absolute pointer-events-none rounded-full bg-violet-500/20"
      style={{ width: 20, height: 20, left: x - 10, top: y - 10 }}
      initial={{ scale: 0, opacity: 0.6 }}
      animate={{ scale: 10, opacity: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      onAnimationComplete={onComplete}
    />
  );
}

// ── Particle field (low-frequency) ────────────────────────────────────────────
export function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (isLowEndDevice()) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const COLORS = ['124,58,237', '99,102,241', '6,182,212', '34,197,94'];
    const particles = Array.from({ length: 25 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      size: Math.random() * 1.5 + 0.5,
      opacity: Math.random() * 0.35 + 0.05,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));

    let animId: number;
    let frame = 0;

    function draw() {
      animId = requestAnimationFrame(draw);
      frame++;
      if (frame % 3 !== 0) return; // 20 fps cap

      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas!.width;
        if (p.x > canvas!.width) p.x = 0;
        if (p.y < 0) p.y = canvas!.height;
        if (p.y > canvas!.height) p.y = 0;

        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(${p.color}, ${p.opacity})`;
        ctx!.fill();
      }
    }

    draw();
    return () => cancelAnimationFrame(animId);
  }, []);

  if (isLowEndDevice()) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
