'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import ShieldIcon from '@/components/ui/ShieldIcon';
import ModeControls from '@/components/dashboard/ModeControls';
import ZoneGrid from '@/components/dashboard/ZoneGrid';
import ActivityFeed from '@/components/dashboard/ActivityFeed';
import SystemStatus from '@/components/dashboard/SystemStatus';
import AlertBanner from '@/components/dashboard/AlertBanner';
import PinSetupModal from '@/components/dashboard/PinSetupModal';
import SettingsPanel from '@/components/dashboard/SettingsPanel';
import VoiceAlarm from '@/components/dashboard/VoiceAlarm';
import NotificationBanner from '@/components/dashboard/NotificationBanner';
import { useSystemState } from '@/hooks/useSystemState';
import { useRealtimeZones } from '@/hooks/useRealtimeZones';
import { useAlerts } from '@/hooks/useAlerts';
import type { Profile } from '@/lib/types';

const modeBadge = {
  stay: { label: 'ARMED - STAY', color: 'bg-yellow-500 text-gray-900' },
  away: { label: 'ARMED - AWAY', color: 'bg-red-600 text-white' },
  disarm: { label: 'DISARMED', color: 'bg-green-600 text-white' },
};

export default function DashboardPage() {
  const router = useRouter();
  const { mode, piOnline, lastHeartbeat, activeAlerts, armSystem } = useSystemState();
  const { zones, loading: zonesLoading } = useRealtimeZones();
  const { unacknowledgedAlerts, hasActiveAlarm } = useAlerts();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Notification settings state
  const [notificationsConfigured, setNotificationsConfigured] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [alarmMessage, setAlarmMessage] = useState('');

  // Find the zone that triggered the alarm (latest critical unacknowledged alert)
  const triggeredAlert = unacknowledgedAlerts.find((a) => a.severity === 'critical');
  const triggeredZoneName = triggeredAlert?.zone?.name || triggeredAlert?.message?.match(/ALARM: (.+?) —/)?.[1] || null;

  const fetchProfile = useCallback(async () => {
    const res = await fetch('/api/profile');
    if (res.ok) {
      const data: Profile = await res.json();
      setProfile(data);
      if (!data.pin_set) {
        setShowPinSetup(true);
      }
    }
  }, []);

  const fetchNotificationSettings = useCallback(async () => {
    const res = await fetch('/api/settings');
    if (res.ok) {
      const settings = await res.json();
      // Notifications are "configured" if they have SMTP + at least one channel enabled
      const hasSmtp = settings.smtp_email && settings.smtp_password;
      const hasEmailOrSms = settings.notify_email_enabled === 'true' || settings.notify_sms_enabled === 'true';
      const hasVoice = settings.notify_voice_enabled === 'true';
      setNotificationsConfigured((hasSmtp && hasEmailOrSms) || hasVoice);
      setVoiceEnabled(settings.notify_voice_enabled === 'true');
      setAlarmMessage(settings.alarm_message || '');
    }
  }, []);

  useEffect(() => {
    fetchProfile();
    fetchNotificationSettings();
  }, [fetchProfile, fetchNotificationSettings]);

  // Refetch notification settings when settings panel closes
  useEffect(() => {
    if (!settingsOpen) {
      fetchNotificationSettings();
    }
  }, [settingsOpen, fetchNotificationSettings]);

  const handlePinSetup = async (pin: string) => {
    const res = await fetch('/api/pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error);
    }
    setShowPinSetup(false);
    await fetchProfile();
  };

  const badge = modeBadge[mode];

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className={`min-h-screen bg-ez-navy ${hasActiveAlarm ? 'ring-2 ring-red-500 ring-inset' : ''}`}>
      {/* First-time PIN setup */}
      <PinSetupModal isOpen={showPinSetup} onComplete={handlePinSetup} />

      {/* Settings slide-out */}
      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* AI Voice Alarm — speaks and plays siren when alarm triggers */}
      <VoiceAlarm
        active={hasActiveAlarm}
        zoneName={triggeredZoneName}
        mode={mode}
        voiceEnabled={voiceEnabled}
        customMessage={alarmMessage}
      />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-ez-navy/95 backdrop-blur-sm border-b border-ez-navy-light/30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldIcon size={40} glowing={mode !== 'disarm'} />
            <div>
              <h1 className="text-xl font-bold">
                <span className="text-ez-yellow">EZ</span>Shield
              </h1>
            </div>
          </div>

          <motion.div
            className={`px-4 py-1.5 rounded-full font-bold text-sm tracking-wider ${badge.color}`}
            key={mode}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            {badge.label}
          </motion.div>

          <div className="flex items-center gap-3">
            {/* Settings cogwheel */}
            <button
              onClick={() => setSettingsOpen(true)}
              className="w-10 h-10 rounded-xl bg-ez-navy-light/30 flex items-center justify-center text-gray-400 hover:text-ez-yellow transition-colors"
              title="Settings"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="10" cy="10" r="3" />
                <path d="M10 1.5v2M10 16.5v2M1.5 10h2M16.5 10h2M3.4 3.4l1.4 1.4M15.2 15.2l1.4 1.4M3.4 16.6l1.4-1.4M15.2 4.8l1.4-1.4" />
              </svg>
            </button>

            {profile && (
              <span className="text-sm text-gray-400 hidden sm:block">
                {profile.name}
              </span>
            )}

            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-ez-white text-sm transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-6 flex flex-col gap-6">
        {/* Notification setup banner */}
        <NotificationBanner
          configured={notificationsConfigured}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        {/* Alert Banner */}
        <AlertBanner alerts={unacknowledgedAlerts} hasActiveAlarm={hasActiveAlarm} />

        {/* Mode Controls */}
        <ModeControls currentMode={mode} onArm={armSystem} />

        {/* System Status */}
        <SystemStatus
          piOnline={piOnline}
          lastHeartbeat={lastHeartbeat}
          activeAlerts={activeAlerts}
        />

        {/* Two column layout for zones + activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ZoneGrid zones={zones} loading={zonesLoading} />
          </div>
          <div className="lg:col-span-1">
            <ActivityFeed />
          </div>
        </div>
      </main>
    </div>
  );
}
