'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import FlashbangEffect from '@/components/login/FlashbangEffect';
import ShieldLogo from '@/components/login/ShieldLogo';
import LoginForm from '@/components/login/LoginForm';

export default function LoginPage() {
  const [phase, setPhase] = useState<'cutscene' | 'shield' | 'form'>('cutscene');

  const handleFlashComplete = () => {
    setPhase('shield');
    setTimeout(() => setPhase('form'), 800);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-ez-navy relative overflow-hidden">
      {/* Background grid — fades in after cutscene */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: phase !== 'cutscene' ? 0.05 : 0 }}
          transition={{ delay: 0.5, duration: 1 }}
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,215,0,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,215,0,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />
        {/* Radial glow behind shield */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
          initial={{ opacity: 0, scale: 0 }}
          animate={
            phase !== 'cutscene'
              ? { opacity: 0.15, scale: 1 }
              : {}
          }
          transition={{ duration: 1.5, ease: 'easeOut' }}
          style={{
            background: 'radial-gradient(circle, rgba(255,215,0,0.2) 0%, transparent 70%)',
          }}
        />
      </div>

      {/* Flashbang cutscene */}
      {phase === 'cutscene' && (
        <FlashbangEffect onComplete={handleFlashComplete} />
      )}

      {/* Main content — shield + login form */}
      <motion.div
        className="relative z-10 flex flex-col items-center gap-10 px-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: phase !== 'cutscene' ? 1 : 0 }}
        transition={{ duration: 0.5 }}
      >
        <ShieldLogo show={phase === 'shield' || phase === 'form'} />
        <LoginForm show={phase === 'form'} />
      </motion.div>

      {/* Bottom accent line */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-ez-yellow to-transparent"
        initial={{ scaleX: 0 }}
        animate={phase === 'form' ? { scaleX: 1 } : {}}
        transition={{ delay: 0.5, duration: 1, ease: 'easeOut' }}
      />
    </div>
  );
}
