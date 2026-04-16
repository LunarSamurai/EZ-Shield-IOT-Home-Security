'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GlowButton from '@/components/ui/GlowButton';
import { SMS_CARRIERS } from '@/lib/carriers';

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
  // Notifications
  emergency_email: string;
  emergency_phone: string;
  phone_carrier: string;
  smtp_email: string;
  smtp_password: string;
  notify_email_enabled: string;
  notify_sms_enabled: string;
  notify_voice_enabled: string;
  alarm_message: string;
}

const alarmLabels: Record<string, { label: string; description: string; type: 'number' | 'toggle' | 'time'; min?: number; max?: number }> = {
  entry_delay_seconds: { label: 'Entry Delay', description: 'Seconds before alarm triggers when door opens (armed)', type: 'number', min: 0, max: 300 },
  exit_delay_seconds: { label: 'Exit Delay', description: 'Seconds to leave after arming', type: 'number', min: 0, max: 300 },
  alarm_duration_seconds: { label: 'Alarm Duration', description: 'How long the alarm sounds (seconds)', type: 'number', min: 10, max: 3600 },
  siren_enabled: { label: 'Siren Enabled', description: 'Enable audible siren on alarm', type: 'toggle' },
  auto_arm_enabled: { label: 'Auto-Arm', description: 'Automatically arm the system at a set time', type: 'toggle' },
  auto_arm_time: { label: 'Auto-Arm Time', description: 'Time to auto-arm (24h format)', type: 'time' },
  alert_cooldown_seconds: { label: 'Alert Cooldown', description: 'Minimum seconds between alerts for the same zone', type: 'number', min: 1, max: 600 },
  ultrasonic_poll_interval_ms: { label: 'Ultrasonic Poll Rate', description: 'How often to read ultrasonic sensors (ms)', type: 'number', min: 100, max: 10000 },
};

const inputClass = 'w-full bg-ez-navy-light/50 border border-ez-navy-light rounded-lg px-3 py-2 text-sm text-ez-white';

export default function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [settings, setSettings] = useState<SettingsState | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [changePinOpen, setChangePinOpen] = useState(false);
  const [changingPin, setChangingPin] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinSuccess, setPinSuccess] = useState('');
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoadError('');
    setLoading(true);
    fetch('/api/settings')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load settings');
        return res.json();
      })
      .then((data) => {
        setSettings(data);
        setLoading(false);
      })
      .catch((err) => {
        setLoadError(err.message);
        setLoading(false);
      });
  }, [isOpen]);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setSaved(false);
    setSaveError('');
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error('Failed to save');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setSaveError('Failed to save settings. Please try again.');
      setTimeout(() => setSaveError(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePin = async () => {
    setPinError('');
    setPinSuccess('');
    if (newPin.length < 4) {
      setPinError('PIN must be at least 4 digits');
      return;
    }
    setChangingPin(true);
    try {
      const res = await fetch('/api/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: newPin, current_pin: currentPin }),
      });
      if (!res.ok) {
        const data = await res.json();
        setPinError(data.error || 'Failed to update PIN');
        return;
      }
      setPinSuccess('PIN updated!');
      setCurrentPin('');
      setNewPin('');
      setTimeout(() => { setPinSuccess(''); setChangePinOpen(false); }, 1500);
    } catch {
      setPinError('Network error. Please try again.');
    } finally {
      setChangingPin(false);
    }
  };

  const updateSetting = (key: string, value: string) => {
    setSettings((prev) => prev ? { ...prev, [key]: value } : prev);
  };

  const renderSettingRow = (key: string, config: typeof alarmLabels[string]) => (
    <div key={key} className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-ez-white">{config.label}</label>
        {config.type === 'toggle' ? (
          <button
            onClick={() => updateSetting(key, settings![key as keyof SettingsState] === 'true' ? 'false' : 'true')}
            className={`w-12 h-7 rounded-full transition-colors relative ${
              settings![key as keyof SettingsState] === 'true' ? 'bg-ez-yellow' : 'bg-gray-600'
            }`}
          >
            <div
              className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
                settings![key as keyof SettingsState] === 'true' ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        ) : config.type === 'time' ? (
          <input
            type="time"
            value={settings![key as keyof SettingsState]}
            onChange={(e) => updateSetting(key, e.target.value)}
            className="bg-ez-navy-light/50 border border-ez-navy-light rounded-lg px-3 py-1.5 text-sm text-ez-white"
          />
        ) : (
          <input
            type="number"
            value={settings![key as keyof SettingsState]}
            onChange={(e) => updateSetting(key, e.target.value)}
            className="w-24 bg-ez-navy-light/50 border border-ez-navy-light rounded-lg px-3 py-1.5 text-sm text-ez-white text-right"
            min={config.min ?? 0}
            max={config.max}
          />
        )}
      </div>
      <p className="text-xs text-gray-500">{config.description}</p>
    </div>
  );

  const SectionHeader = ({ children }: { children: string }) => (
    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider border-b border-ez-navy-light/30 pb-2">
      {children}
    </h3>
  );

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
            <div className="sticky top-0 bg-ez-navy/95 backdrop-blur-sm border-b border-ez-navy-light/30 p-4 flex items-center justify-between z-10">
              <h2 className="text-xl font-bold text-ez-yellow">Settings</h2>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-xl bg-ez-navy-light/30 flex items-center justify-center text-gray-400 hover:text-ez-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-4 flex flex-col gap-6 pb-20">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-ez-yellow/30 border-t-ez-yellow rounded-full animate-spin" />
                </div>
              ) : loadError ? (
                <div className="text-center py-12">
                  <p className="text-red-400 mb-4">{loadError}</p>
                  <GlowButton variant="blue" size="sm" onClick={() => { setLoading(true); setLoadError(''); fetch('/api/settings').then(r => r.json()).then(d => { setSettings(d); setLoading(false); }).catch(() => { setLoadError('Still unable to load'); setLoading(false); }); }}>
                    Retry
                  </GlowButton>
                </div>
              ) : settings && (
                <>
                  {/* ===== NOTIFICATIONS SECTION ===== */}
                  <div className="flex flex-col gap-4">
                    <SectionHeader>Emergency Notifications</SectionHeader>
                    <p className="text-xs text-gray-400 -mt-2">
                      Get alerted instantly when your system detects an intrusion. Requires a Gmail account with an App Password.
                    </p>

                    {/* SMTP Config */}
                    <div className="bg-ez-navy-light/10 rounded-xl p-4 border border-ez-navy-light/20 flex flex-col gap-3">
                      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Email Account (Gmail)</div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-500">Gmail Address</label>
                        <input
                          type="email"
                          value={settings.smtp_email || ''}
                          onChange={(e) => updateSetting('smtp_email', e.target.value)}
                          className={inputClass}
                          placeholder="your.alerts@gmail.com"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-500">App Password</label>
                        <div className="flex gap-2">
                          <input
                            type={showSmtpPassword ? 'text' : 'password'}
                            value={settings.smtp_password || ''}
                            onChange={(e) => updateSetting('smtp_password', e.target.value)}
                            className={`${inputClass} flex-1`}
                            placeholder="xxxx xxxx xxxx xxxx"
                          />
                          <button
                            onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                            className="px-3 text-xs text-gray-400 hover:text-ez-white transition-colors"
                          >
                            {showSmtpPassword ? 'Hide' : 'Show'}
                          </button>
                        </div>
                        <p className="text-xs text-gray-600">
                          Google Account &gt; Security &gt; 2-Step Verification &gt; App Passwords
                        </p>
                      </div>
                    </div>

                    {/* Email Notification */}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-ez-white">Email Alerts</label>
                        <button
                          onClick={() => updateSetting('notify_email_enabled', settings.notify_email_enabled === 'true' ? 'false' : 'true')}
                          className={`w-12 h-7 rounded-full transition-colors relative ${
                            settings.notify_email_enabled === 'true' ? 'bg-ez-yellow' : 'bg-gray-600'
                          }`}
                        >
                          <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
                            settings.notify_email_enabled === 'true' ? 'translate-x-6' : 'translate-x-1'
                          }`} />
                        </button>
                      </div>
                      {settings.notify_email_enabled === 'true' && (
                        <input
                          type="email"
                          value={settings.emergency_email || ''}
                          onChange={(e) => updateSetting('emergency_email', e.target.value)}
                          className={inputClass}
                          placeholder="Alert recipient email"
                        />
                      )}
                      <p className="text-xs text-gray-500">Sends a detailed alarm email with zone info and timestamp</p>
                    </div>

                    {/* SMS Notification */}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-ez-white">SMS Text Alerts</label>
                        <button
                          onClick={() => updateSetting('notify_sms_enabled', settings.notify_sms_enabled === 'true' ? 'false' : 'true')}
                          className={`w-12 h-7 rounded-full transition-colors relative ${
                            settings.notify_sms_enabled === 'true' ? 'bg-ez-yellow' : 'bg-gray-600'
                          }`}
                        >
                          <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
                            settings.notify_sms_enabled === 'true' ? 'translate-x-6' : 'translate-x-1'
                          }`} />
                        </button>
                      </div>
                      {settings.notify_sms_enabled === 'true' && (
                        <div className="flex flex-col gap-2">
                          <input
                            type="tel"
                            value={settings.emergency_phone || ''}
                            onChange={(e) => updateSetting('emergency_phone', e.target.value)}
                            className={inputClass}
                            placeholder="(555) 123-4567"
                          />
                          <select
                            value={settings.phone_carrier || ''}
                            onChange={(e) => updateSetting('phone_carrier', e.target.value)}
                            className={`${inputClass} appearance-none`}
                          >
                            <option value="">Select your carrier</option>
                            {SMS_CARRIERS.map((c) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      <p className="text-xs text-gray-500">Sends text via your carrier's email gateway — no extra service needed</p>
                    </div>

                    {/* Voice Alarm */}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-ez-white">Voice Alarm on Dashboard</label>
                        <button
                          onClick={() => updateSetting('notify_voice_enabled', settings.notify_voice_enabled === 'true' ? 'false' : 'true')}
                          className={`w-12 h-7 rounded-full transition-colors relative ${
                            settings.notify_voice_enabled === 'true' ? 'bg-ez-yellow' : 'bg-gray-600'
                          }`}
                        >
                          <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
                            settings.notify_voice_enabled === 'true' ? 'translate-x-6' : 'translate-x-1'
                          }`} />
                        </button>
                      </div>
                      <p className="text-xs text-gray-500">AI voice speaks the alarm through the dashboard speakers when triggered</p>
                    </div>

                    {/* Custom alarm message */}
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-ez-white">Alarm Message</label>
                      <textarea
                        value={settings.alarm_message || ''}
                        onChange={(e) => updateSetting('alarm_message', e.target.value)}
                        className={`${inputClass} h-20 resize-none`}
                        placeholder="ALERT: Your home security system has been triggered."
                      />
                      <p className="text-xs text-gray-500">This message is included in all notifications and spoken by the voice alarm</p>
                    </div>
                  </div>

                  {/* ===== ALARM TIMING ===== */}
                  <div className="flex flex-col gap-4">
                    <SectionHeader>Alarm Timing</SectionHeader>
                    {Object.entries(alarmLabels).map(([key, config]) => renderSettingRow(key, config))}
                  </div>

                  {/* Save button */}
                  <div className="flex flex-col gap-2">
                    <GlowButton variant="yellow" size="md" onClick={handleSave} disabled={saving} className="w-full">
                      {saving ? 'Saving...' : saved ? 'Saved!' : 'Save All Settings'}
                    </GlowButton>
                    {saveError && <p className="text-red-400 text-xs text-center">{saveError}</p>}
                  </div>

                  {/* ===== SECURITY ===== */}
                  <div className="flex flex-col gap-4">
                    <SectionHeader>Security</SectionHeader>
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
                            className={`${inputClass} tracking-[0.3em] text-center font-mono`}
                            placeholder="----"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-sm text-gray-400">New PIN (4-6 digits)</label>
                          <input
                            type="password"
                            value={newPin}
                            onChange={(e) => setNewPin(e.target.value)}
                            maxLength={6}
                            className={`${inputClass} tracking-[0.3em] text-center font-mono`}
                            placeholder="----"
                          />
                        </div>
                        {pinError && <p className="text-red-400 text-xs">{pinError}</p>}
                        {pinSuccess && <p className="text-green-400 text-xs">{pinSuccess}</p>}
                        <div className="flex gap-2">
                          <GlowButton variant="yellow" size="sm" onClick={handleChangePin} disabled={changingPin} className="flex-1">
                            {changingPin ? 'Updating...' : 'Update PIN'}
                          </GlowButton>
                          <button
                            onClick={() => { setChangePinOpen(false); setPinError(''); setCurrentPin(''); setNewPin(''); }}
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
