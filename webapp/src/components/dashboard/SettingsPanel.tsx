'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GlowButton from '@/components/ui/GlowButton';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SettingsState {
  entry_delay_seconds: string;
  exit_delay_seconds: string;
  alarm_duration_seconds: string;
  siren_enabled: string;
  auto_arm_enabled: string;
  auto_arm_time: string;
  alert_cooldown_seconds: string;
  ultrasonic_poll_interval_ms: string;
}

const settingsLabels: Record<string, { label: string; description: string; type: 'number' | 'toggle' | 'time' }> = {
  entry_delay_seconds: { label: 'Entry Delay', description: 'Seconds before alarm triggers when door opens (armed)', type: 'number' },
  exit_delay_seconds: { label: 'Exit Delay', description: 'Seconds to leave after arming', type: 'number' },
  alarm_duration_seconds: { label: 'Alarm Duration', description: 'How long the alarm sounds (seconds)', type: 'number' },
  siren_enabled: { label: 'Siren Enabled', description: 'Enable audible siren on alarm', type: 'toggle' },
  auto_arm_enabled: { label: 'Auto-Arm', description: 'Automatically arm the system at a set time', type: 'toggle' },
  auto_arm_time: { label: 'Auto-Arm Time', description: 'Time to auto-arm (24h format)', type: 'time' },
  alert_cooldown_seconds: { label: 'Alert Cooldown', description: 'Minimum seconds between alerts for the same zone', type: 'number' },
  ultrasonic_poll_interval_ms: { label: 'Ultrasonic Poll Rate', description: 'How often to read ultrasonic sensors (ms)', type: 'number' },
};

export default function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [settings, setSettings] = useState<SettingsState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [changePinOpen, setChangePinOpen] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinSuccess, setPinSuccess] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        setSettings(data);
        setLoading(false);
      });
  }, [isOpen]);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setSaved(false);
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleChangePin = async () => {
    setPinError('');
    setPinSuccess('');
    if (newPin.length < 4) {
      setPinError('PIN must be at least 4 digits');
      return;
    }
    const res = await fetch('/api/pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: newPin, current_pin: currentPin }),
    });
    if (!res.ok) {
      const data = await res.json();
      setPinError(data.error);
      return;
    }
    setPinSuccess('PIN updated!');
    setCurrentPin('');
    setNewPin('');
    setTimeout(() => { setPinSuccess(''); setChangePinOpen(false); }, 1500);
  };

  const updateSetting = (key: string, value: string) => {
    setSettings((prev) => prev ? { ...prev, [key]: value } : prev);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-md h-full bg-ez-navy border-l border-ez-navy-light overflow-y-auto"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-ez-navy/95 backdrop-blur-sm border-b border-ez-navy-light/30 p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-ez-yellow">Settings</h2>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-xl bg-ez-navy-light/30 flex items-center justify-center text-gray-400 hover:text-ez-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-4 flex flex-col gap-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-ez-yellow/30 border-t-ez-yellow rounded-full animate-spin" />
                </div>
              ) : settings && (
                <>
                  {/* Alarm Settings */}
                  <div className="flex flex-col gap-4">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider border-b border-ez-navy-light/30 pb-2">
                      Alarm Timing
                    </h3>
                    {Object.entries(settingsLabels).map(([key, config]) => (
                      <div key={key} className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-ez-white">{config.label}</label>
                          {config.type === 'toggle' ? (
                            <button
                              onClick={() => updateSetting(key, settings[key as keyof SettingsState] === 'true' ? 'false' : 'true')}
                              className={`w-12 h-7 rounded-full transition-colors relative ${
                                settings[key as keyof SettingsState] === 'true' ? 'bg-ez-yellow' : 'bg-gray-600'
                              }`}
                            >
                              <div
                                className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
                                  settings[key as keyof SettingsState] === 'true' ? 'translate-x-6' : 'translate-x-1'
                                }`}
                              />
                            </button>
                          ) : config.type === 'time' ? (
                            <input
                              type="time"
                              value={settings[key as keyof SettingsState]}
                              onChange={(e) => updateSetting(key, e.target.value)}
                              className="bg-ez-navy-light/50 border border-ez-navy-light rounded-lg px-3 py-1.5 text-sm text-ez-white"
                            />
                          ) : (
                            <input
                              type="number"
                              value={settings[key as keyof SettingsState]}
                              onChange={(e) => updateSetting(key, e.target.value)}
                              className="w-24 bg-ez-navy-light/50 border border-ez-navy-light rounded-lg px-3 py-1.5 text-sm text-ez-white text-right"
                              min={0}
                            />
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{config.description}</p>
                      </div>
                    ))}
                  </div>

                  {/* Save button */}
                  <GlowButton variant="yellow" size="md" onClick={handleSave} disabled={saving} className="w-full">
                    {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}
                  </GlowButton>

                  {/* Change PIN Section */}
                  <div className="flex flex-col gap-4">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider border-b border-ez-navy-light/30 pb-2">
                      Security
                    </h3>

                    {!changePinOpen ? (
                      <GlowButton variant="blue" size="md" onClick={() => setChangePinOpen(true)} className="w-full">
                        Change PIN
                      </GlowButton>
                    ) : (
                      <div className="flex flex-col gap-3 bg-ez-navy-light/20 rounded-xl p-4 border border-ez-navy-light/30">
                        <div className="flex flex-col gap-1">
                          <label className="text-sm text-gray-400">Current PIN</label>
                          <input
                            type="password"
                            value={currentPin}
                            onChange={(e) => setCurrentPin(e.target.value)}
                            maxLength={6}
                            className="w-full bg-ez-navy-light/50 border border-ez-navy-light rounded-lg px-3 py-2 text-ez-white tracking-[0.3em] text-center font-mono"
                            placeholder="----"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-sm text-gray-400">New PIN</label>
                          <input
                            type="password"
                            value={newPin}
                            onChange={(e) => setNewPin(e.target.value)}
                            maxLength={6}
                            className="w-full bg-ez-navy-light/50 border border-ez-navy-light rounded-lg px-3 py-2 text-ez-white tracking-[0.3em] text-center font-mono"
                            placeholder="----"
                          />
                        </div>
                        {pinError && <p className="text-red-400 text-xs">{pinError}</p>}
                        {pinSuccess && <p className="text-green-400 text-xs">{pinSuccess}</p>}
                        <div className="flex gap-2">
                          <GlowButton variant="yellow" size="sm" onClick={handleChangePin} className="flex-1">
                            Update PIN
                          </GlowButton>
                          <button
                            onClick={() => { setChangePinOpen(false); setPinError(''); }}
                            className="px-4 py-2 text-sm text-gray-400 hover:text-ez-white transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
