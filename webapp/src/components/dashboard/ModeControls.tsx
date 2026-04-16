'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { SystemMode } from '@/lib/types';
import GlowButton from '@/components/ui/GlowButton';
import PinModal from './PinModal';

interface ModeControlsProps {
  currentMode: SystemMode;
  onArm: (mode: SystemMode, pin: string) => Promise<void>;
}

const modeConfig: { mode: SystemMode; label: string; variant: 'yellow' | 'red' | 'green'; icon: string }[] = [
  { mode: 'stay', label: 'STAY', variant: 'yellow', icon: '🏠' },
  { mode: 'away', label: 'AWAY', variant: 'red', icon: '🚪' },
  { mode: 'disarm', label: 'DISARM', variant: 'green', icon: '🔓' },
];

export default function ModeControls({ currentMode, onArm }: ModeControlsProps) {
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [targetMode, setTargetMode] = useState<SystemMode>('disarm');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleModeClick = (mode: SystemMode) => {
    if (mode === currentMode) return;
    setTargetMode(mode);
    setError('');
    setPinModalOpen(true);
  };

  const handleConfirm = async (pin: string) => {
    setLoading(true);
    setError('');
    try {
      await onArm(targetMode, pin);
      setPinModalOpen(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">System Control</h2>
        <div className="flex gap-3">
          {modeConfig.map(({ mode, label, variant, icon }) => {
            const isActive = currentMode === mode;
            return (
              <motion.div
                key={mode}
                className="flex-1"
                whileTap={{ scale: 0.95 }}
              >
                <GlowButton
                  variant={variant}
                  size="lg"
                  onClick={() => handleModeClick(mode)}
                  className={`w-full flex flex-col items-center gap-1 ${
                    isActive ? 'ring-2 ring-white/30 animate-pulse-glow' : 'opacity-60'
                  }`}
                >
                  <span className="text-2xl">{icon}</span>
                  <span>{label}</span>
                </GlowButton>
              </motion.div>
            );
          })}
        </div>
      </div>

      <PinModal
        isOpen={pinModalOpen}
        targetMode={targetMode}
        onConfirm={handleConfirm}
        onCancel={() => setPinModalOpen(false)}
        error={error}
        loading={loading}
      />
    </>
  );
}
