'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FlashbangEffectProps {
  onComplete: () => void;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  color: string;
}

// The grenade SVG shape
function FlashbangGrenade({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size * 1.3} viewBox="0 0 40 52" fill="none">
      {/* Pin ring */}
      <circle cx="20" cy="6" r="4" stroke="#888" strokeWidth="1.5" fill="none" />
      {/* Spoon/lever */}
      <rect x="18" y="4" width="4" height="14" rx="1" fill="#666" />
      {/* Body */}
      <rect x="10" y="16" width="20" height="30" rx="4" fill="#4a4a4a" />
      <rect x="10" y="16" width="20" height="30" rx="4" stroke="#666" strokeWidth="1" />
      {/* Body details */}
      <rect x="13" y="20" width="14" height="3" rx="1" fill="#555" />
      <rect x="13" y="26" width="14" height="3" rx="1" fill="#555" />
      <rect x="13" y="32" width="14" height="3" rx="1" fill="#555" />
      {/* Top cap */}
      <rect x="12" y="14" width="16" height="5" rx="2" fill="#5a5a5a" />
    </svg>
  );
}

// Spark particles on bounce — each bounce spawns a new batch
function BounceParticlesBatch({ x, y, intensity }: { x: number; y: number; intensity: number }) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const sparks: Particle[] = [];
    const count = Math.floor(6 + intensity * 8);
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 0.2) + (Math.random() * Math.PI * 0.6);
      const speed = (1 + Math.random() * 3) * intensity;
      sparks.push({
        id: i,
        x: x + (Math.random() - 0.5) * 10,
        y,
        vx: Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1),
        vy: -Math.sin(angle) * speed,
        size: 1.5 + Math.random() * 2.5 * intensity,
        life: 1,
        color: Math.random() > 0.5 ? '#FFD700' : '#FFA500',
      });
    }
    setParticles(sparks);
  }, [x, y, intensity]);

  return (
    <>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            left: p.x,
            top: p.y,
            boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
          }}
          initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
          animate={{
            x: p.vx * 25,
            y: p.vy * 25 + 30,
            opacity: 0,
            scale: 0.2,
          }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      ))}
    </>
  );
}

// Explosion particles
function ExplosionParticles({ active }: { active: boolean }) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!active) return;

    const explosion: Particle[] = [];
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 8;
      explosion.push({
        id: i,
        x: 0,
        y: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 6,
        life: 1,
        color: ['#FFD700', '#FFA500', '#FFFFFF', '#FFE44D', '#FFF8DC'][Math.floor(Math.random() * 5)],
      });
    }
    setParticles(explosion);
  }, [active]);

  if (!active || particles.length === 0) return null;

  return (
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
          }}
          initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
          animate={{
            x: p.vx * 60,
            y: p.vy * 60,
            opacity: 0,
            scale: 0,
          }}
          transition={{ duration: 0.8 + Math.random() * 0.4, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

type Stage = 'lob' | 'bounce1' | 'bounce2' | 'bounce3' | 'bounce4' | 'settle' | 'explode' | 'flash' | 'done';

export default function FlashbangEffect({ onComplete }: FlashbangEffectProps) {
  const [stage, setStage] = useState<Stage>('lob');
  const [bounceSparks, setBounceSparks] = useState<{ id: number; intensity: number }[]>([]);
  const [screenCenter, setScreenCenter] = useState({ x: 500, y: 400 });

  useEffect(() => {
    setScreenCenter({
      x: window.innerWidth / 2,
      y: window.innerHeight * 0.62,
    });
  }, []);

  // Cutscene timeline: lob -> 4 bounces (diminishing) -> settle -> explode -> flash -> done
  useEffect(() => {
    let sparkId = 0;
    const addSparks = (intensity: number) => {
      setBounceSparks((prev) => [...prev, { id: sparkId++, intensity }]);
    };

    const timeline = [
      // Initial lob lands — big bounce
      { delay: 1100, action: () => { setStage('bounce1'); addSparks(1.0); } },
      // Second bounce — medium
      { delay: 1500, action: () => { setStage('bounce2'); addSparks(0.7); } },
      // Third bounce — smaller
      { delay: 1800, action: () => { setStage('bounce3'); addSparks(0.4); } },
      // Fourth bounce — tiny
      { delay: 2000, action: () => { setStage('bounce4'); addSparks(0.2); } },
      // Settles on ground, starts glowing
      { delay: 2200, action: () => setStage('settle') },
      // Explode
      { delay: 2900, action: () => setStage('explode') },
      // White flash
      { delay: 3100, action: () => setStage('flash') },
      // Done
      { delay: 4400, action: () => { setStage('done'); onComplete(); } },
    ];

    const timers = timeline.map(({ delay, action }) => setTimeout(action, delay));
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  const isGrenadeVisible = stage.startsWith('bounce') || stage === 'lob' || stage === 'settle';

  // Bounce heights — each bounce is smaller than the last
  const bounceY: Record<string, number> = {
    lob: 0,
    bounce1: -80,
    bounce2: -40,
    bounce3: -18,
    bounce4: -6,
    settle: 0,
  };

  // Horizontal drift — grenade rolls slightly on each bounce
  const bounceX: Record<string, number> = {
    lob: 0,
    bounce1: 0,
    bounce2: 15,
    bounce3: 22,
    bounce4: 25,
    settle: 26,
  };

  // Rotation accumulates
  const bounceRotate: Record<string, number> = {
    lob: 720,
    bounce1: 780,
    bounce2: 830,
    bounce3: 860,
    bounce4: 875,
    settle: 880,
  };

  const currentY = bounceY[stage] ?? 0;
  const currentX = bounceX[stage] ?? 0;
  const currentRotate = bounceRotate[stage] ?? 880;

  // Duration gets shorter for each bounce
  const bounceDuration: Record<string, number> = {
    bounce1: 0.3,
    bounce2: 0.22,
    bounce3: 0.15,
    bounce4: 0.1,
    settle: 0.15,
  };

  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
      {/* Dark background during cutscene */}
      <motion.div
        className="absolute inset-0 bg-ez-navy"
        initial={{ opacity: 1 }}
        animate={{ opacity: stage === 'done' ? 0 : 1 }}
        transition={{ duration: 0.8 }}
      />

      {/* The grenade */}
      <AnimatePresence>
        {isGrenadeVisible && (
          <motion.div
            className="absolute"
            style={{ left: '50%', top: '60%', marginLeft: -20 }}
            initial={{
              x: -400,
              y: -500,
              rotate: 0,
              scale: 0.6,
              opacity: 0,
            }}
            animate={
              stage === 'lob'
                ? {
                    x: 0,
                    y: 0,
                    rotate: 720,
                    scale: 1,
                    opacity: 1,
                  }
                : {
                    x: currentX,
                    y: currentY,
                    rotate: currentRotate,
                    scale: 1,
                    opacity: 1,
                  }
            }
            exit={{
              scale: 0,
              opacity: 0,
              transition: { duration: 0.1 },
            }}
            transition={
              stage === 'lob'
                ? {
                    duration: 1.0,
                    ease: [0.25, 0.46, 0.45, 0.94],
                    opacity: { duration: 0.3 },
                  }
                : {
                    duration: bounceDuration[stage] ?? 0.2,
                    ease: currentY < 0 ? 'easeOut' : 'easeIn',
                  }
            }
          >
            <FlashbangGrenade size={40} />

            {/* Shadow under grenade */}
            <motion.div
              className="absolute -bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/30"
              animate={{
                width: currentY < -20 ? 12 : 25,
                height: currentY < -20 ? 2 : 6,
                opacity: currentY < -20 ? 0.15 : 0.4,
              }}
              transition={{ duration: 0.15 }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bounce spark particles — one batch per bounce */}
      {bounceSparks.map((spark) => (
        <BounceParticlesBatch
          key={spark.id}
          x={screenCenter.x}
          y={screenCenter.y}
          intensity={spark.intensity}
        />
      ))}

      {/* Pre-explosion glow (grenade "cooking") */}
      {stage === 'settle' && (
        <motion.div
          className="absolute left-1/2 -translate-x-1/2 rounded-full"
          initial={{ width: 10, height: 10, opacity: 0 }}
          animate={{
            width: [10, 25, 15, 35, 20, 50],
            height: [10, 25, 15, 35, 20, 50],
            opacity: [0, 0.5, 0.3, 0.7, 0.4, 0.9],
          }}
          transition={{ duration: 0.7, ease: 'easeIn' }}
          style={{
            top: '58%',
            background: 'radial-gradient(circle, rgba(255,215,0,0.8) 0%, transparent 70%)',
          }}
        />
      )}

      {/* Explosion burst */}
      {(stage === 'explode' || stage === 'flash') && (
        <>
          {/* Central explosion ring */}
          <motion.div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            initial={{ width: 0, height: 0, opacity: 1 }}
            animate={{ width: 600, height: 600, opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{
              background: 'radial-gradient(circle, rgba(255,215,0,0.6) 0%, rgba(255,165,0,0.3) 40%, transparent 70%)',
            }}
          />
          {/* Second ring */}
          <motion.div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-yellow-400/50"
            initial={{ width: 0, height: 0, opacity: 1 }}
            animate={{ width: 400, height: 400, opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut', delay: 0.05 }}
          />
          <ExplosionParticles active={true} />
        </>
      )}

      {/* White flash overlay */}
      {(stage === 'flash' || stage === 'done') && (
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{
            opacity: stage === 'flash' ? [0, 1, 1, 0.5] : [0.5, 0],
          }}
          transition={{
            duration: stage === 'flash' ? 0.8 : 0.8,
            times: stage === 'flash' ? [0, 0.1, 0.4, 1] : [0, 1],
            ease: 'easeOut',
          }}
          style={{
            background: stage === 'flash'
              ? 'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,245,200,0.9) 50%, rgba(255,215,0,0.3) 100%)'
              : 'radial-gradient(circle, rgba(255,255,255,0.5) 0%, rgba(10,22,40,0) 70%)',
          }}
        />
      )}
    </div>
  );
}
