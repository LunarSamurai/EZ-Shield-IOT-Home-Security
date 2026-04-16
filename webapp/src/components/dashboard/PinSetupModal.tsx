'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GlowButton from '@/components/ui/GlowButton';
import ShieldIcon from '@/components/ui/ShieldIcon';

interface PinSetupModalProps {
  isOpen: boolean;
  onComplete: (pin: string) => Promise<void>;
}

export default function PinSetupModal({ isOpen, onComplete }: PinSetupModalProps) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDigit = (digit: string) => {
    if (step === 'enter' && pin.length < 6) {
      setPin((prev) => prev + digit);
    } else if (step === 'confirm' && confirmPin.length < 6) {
      setConfirmPin((prev) => prev + digit);
    }
  };

  const handleBackspace = () => {
    if (step === 'enter') {
      setPin((prev) => prev.slice(0, -1));
    } else {
      setConfirmPin((prev) => prev.slice(0, -1));
    }
  };

  const handleNext = () => {
    if (step === 'enter') {
      if (pin.length < 4) {
        setError('PIN must be at least 4 digits');
        return;
      }
      setStep('confirm');
      setError('');
    }
  };

  const handleSubmit = async () => {
    if (pin !== confirmPin) {
      setError('PINs do not match. Try again.');
      setConfirmPin('');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onComplete(pin);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to set PIN');
    } finally {
      setLoading(false);
    }
  };

  const currentPin = step === 'enter' ? pin : confirmPin;
  const maxDots = 6;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-ez-navy-mid border border-ez-yellow/30 rounded-2xl p-8 w-full max-w-sm mx-4"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
          >
            {/* Shield icon */}
            <div className="flex justify-center mb-4">
              <ShieldIcon size={60} glowing />
            </div>

            <h2 className="text-center text-xl font-bold mb-1 text-ez-yellow">
              Welcome to EZShield
            </h2>
            <p className="text-center text-sm text-gray-400 mb-6">
              {step === 'enter'
                ? 'Set your security PIN (4-6 digits)'
                : 'Confirm your PIN'
              }
            </p>

            {/* PIN dots display */}
            <div className="flex justify-center gap-3 my-6">
              {[...Array(maxDots)].map((_, i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                    i < currentPin.length
                      ? 'bg-ez-yellow border-ez-yellow scale-110'
                      : i < 4
                      ? 'border-gray-500'
                      : 'border-gray-700'
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
                  if (i === 9) return <div key="spacer" />;
                  if (i === 11) {
                    return (
                      <button
                        key="back"
                        onClick={handleBackspace}
                        className="h-14 rounded-xl text-gray-400 text-2xl font-medium
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
                      className="h-14 rounded-xl bg-ez-navy-light/30 text-ez-white text-2xl font-bold
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
                variant="yellow"
                size="lg"
                onClick={step === 'enter' ? handleNext : handleSubmit}
                disabled={(step === 'enter' ? pin.length < 4 : confirmPin.length < 4) || loading}
                className="w-full"
              >
                {loading ? 'Setting PIN...' : step === 'enter' ? 'Next' : 'Set PIN'}
              </GlowButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
