'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SystemMode } from '@/lib/types';
import GlowButton from '@/components/ui/GlowButton';

interface PinModalProps {
  isOpen: boolean;
  targetMode: SystemMode;
  onConfirm: (pin: string) => void;
  onCancel: () => void;
  error?: string;
  loading?: boolean;
}

const modeLabels: Record<SystemMode, string> = {
  stay: 'ARM STAY',
  away: 'ARM AWAY',
  disarm: 'DISARM',
};

const modeColors: Record<SystemMode, string> = {
  stay: 'text-ez-yellow',
  away: 'text-ez-red',
  disarm: 'text-ez-green',
};

export default function PinModal({ isOpen, targetMode, onConfirm, onCancel, error, loading }: PinModalProps) {
  const [pin, setPin] = useState('');

  const handleDigit = (digit: string) => {
    if (pin.length < 6) {
      setPin((prev) => prev + digit);
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const handleSubmit = () => {
    if (pin.length >= 4) {
      onConfirm(pin);
      setPin('');
    }
  };

  const handleClose = () => {
    setPin('');
    onCancel();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <motion.div
            className="bg-ez-navy-mid border border-ez-navy-light rounded-2xl p-8 w-full max-w-sm mx-4"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-center text-xl font-bold mb-2">
              Enter PIN to{' '}
              <span className={modeColors[targetMode]}>{modeLabels[targetMode]}</span>
            </h2>

            {/* PIN dots display */}
            <div className="flex justify-center gap-3 my-6">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-5 h-5 rounded-full border-2 transition-all duration-200 ${
                    i < pin.length
                      ? 'bg-ez-yellow border-ez-yellow'
                      : 'border-gray-500'
                  }`}
                />
              ))}
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center mb-4">{error}</p>
            )}

            {/* Number pad */}
            <div className="grid grid-cols-3 gap-3">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', ''].map(
                (digit, i) => {
                  if (i === 9) {
                    return (
                      <button
                        key="cancel"
                        onClick={handleClose}
                        className="h-16 rounded-xl text-gray-400 text-lg font-medium
                                   active:bg-ez-navy-light/50 transition-colors touch-target"
                      >
                        Cancel
                      </button>
                    );
                  }
                  if (i === 11) {
                    return (
                      <button
                        key="back"
                        onClick={handleBackspace}
                        className="h-16 rounded-xl text-gray-400 text-2xl font-medium
                                   active:bg-ez-navy-light/50 transition-colors touch-target"
                      >
                        ←
                      </button>
                    );
                  }
                  return (
                    <button
                      key={digit}
                      onClick={() => handleDigit(digit)}
                      className="h-16 rounded-xl bg-ez-navy-light/30 text-ez-white text-2xl font-bold
                                 active:bg-ez-yellow/20 active:text-ez-yellow
                                 transition-colors touch-target"
                    >
                      {digit}
                    </button>
                  );
                }
              )}
            </div>

            <div className="mt-4">
              <GlowButton
                variant={targetMode === 'disarm' ? 'green' : targetMode === 'away' ? 'red' : 'yellow'}
                size="lg"
                onClick={handleSubmit}
                disabled={pin.length < 4 || loading}
                className="w-full"
              >
                {loading ? 'Verifying...' : 'Confirm'}
              </GlowButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
