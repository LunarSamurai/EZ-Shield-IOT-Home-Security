'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface VoiceAlarmProps {
  active: boolean;
  zoneName: string | null;
  mode: string;
  voiceEnabled: boolean;
  customMessage?: string;
}

export default function VoiceAlarm({ active, zoneName, mode, voiceEnabled, customMessage }: VoiceAlarmProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasInteractedRef = useRef(false);

  // Track user interaction for autoplay policy
  useEffect(() => {
    const handler = () => { hasInteractedRef.current = true; };
    window.addEventListener('click', handler, { once: true });
    window.addEventListener('touchstart', handler, { once: true });
    return () => {
      window.removeEventListener('click', handler);
      window.removeEventListener('touchstart', handler);
    };
  }, []);

  const speak = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 0.8;
    utterance.volume = 1;

    // Try to find a clear, authoritative voice
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(
      (v) => v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel') || v.name.includes('Microsoft')
    );
    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, []);

  const startSiren = useCallback(() => {
    if (audioContextRef.current) return;

    try {
      const ctx = new AudioContext();
      audioContextRef.current = ctx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.value = 800;
      gain.gain.value = 0.15;

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      oscillatorRef.current = osc;
      gainRef.current = gain;

      // Siren sweep effect: oscillate between 600Hz and 1200Hz
      let rising = true;
      const sweepInterval = setInterval(() => {
        if (!oscillatorRef.current) return;
        const freq = oscillatorRef.current.frequency.value;
        if (rising) {
          oscillatorRef.current.frequency.value = Math.min(freq + 20, 1200);
          if (freq >= 1200) rising = false;
        } else {
          oscillatorRef.current.frequency.value = Math.max(freq - 20, 600);
          if (freq <= 600) rising = true;
        }
      }, 30);

      intervalRef.current = sweepInterval;
    } catch {
      // AudioContext not available
    }
  }, []);

  const stopSiren = useCallback(() => {
    if (oscillatorRef.current) {
      try { oscillatorRef.current.stop(); } catch { /* already stopped */ }
      oscillatorRef.current = null;
    }
    if (gainRef.current) {
      gainRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  useEffect(() => {
    if (!active || !voiceEnabled || muted) {
      stopSiren();
      return;
    }

    if (!hasInteractedRef.current) return;

    // Start siren
    startSiren();

    // Speak the alarm message
    const zone = zoneName || 'an unknown zone';
    const baseMessage = customMessage || 'Your home security system has been triggered.';
    const fullMessage = `ALERT. ALERT. ${baseMessage}. Intrusion detected at ${zone}. System is armed in ${mode} mode. ALERT.`;

    // Speak immediately, then repeat every 15 seconds
    speak(fullMessage);
    const repeatInterval = setInterval(() => {
      if (!muted) speak(fullMessage);
    }, 15000);

    return () => {
      clearInterval(repeatInterval);
      stopSiren();
    };
  }, [active, voiceEnabled, muted, zoneName, mode, customMessage, speak, startSiren, stopSiren]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopSiren();
  }, [stopSiren]);

  if (!active || !voiceEnabled) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed bottom-6 right-6 z-50"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
      >
        <button
          onClick={() => setMuted(!muted)}
          className={`
            w-16 h-16 rounded-full flex items-center justify-center
            text-2xl font-bold shadow-lg transition-all
            ${muted
              ? 'bg-gray-700 text-gray-400'
              : 'bg-red-600 text-white animate-pulse-glow'
            }
          `}
          title={muted ? 'Unmute alarm' : 'Mute alarm'}
        >
          {muted ? (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          ) : (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          )}
        </button>
        {isSpeaking && !muted && (
          <motion.div
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500"
            animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
            transition={{ repeat: Infinity, duration: 0.5 }}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
