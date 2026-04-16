'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { SystemMode } from '@/lib/types';

interface SystemStatus {
  mode: SystemMode;
  piOnline: boolean;
  lastHeartbeat: string | null;
  activeAlerts: number;
}

export function useSystemState() {
  const [status, setStatus] = useState<SystemStatus>({
    mode: 'disarm',
    piOnline: false,
    lastHeartbeat: null,
    activeAlerts: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    const res = await fetch('/api/status');
    if (res.ok) {
      const data = await res.json();
      setStatus({
        mode: data.mode,
        piOnline: data.pi_online,
        lastHeartbeat: data.last_heartbeat,
        activeAlerts: data.active_alerts,
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStatus();

    const supabase = createClient();

    // Subscribe to system state changes
    const stateChannel = supabase
      .channel('system-state')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'system_state' },
        () => fetchStatus()
      )
      .subscribe();

    // Subscribe to heartbeats
    const heartbeatChannel = supabase
      .channel('heartbeats')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'heartbeats' },
        () => fetchStatus()
      )
      .subscribe();

    // Subscribe to alerts
    const alertChannel = supabase
      .channel('alerts-count')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alerts' },
        () => fetchStatus()
      )
      .subscribe();

    // Poll status every 30s for heartbeat freshness
    const interval = setInterval(fetchStatus, 30000);

    return () => {
      supabase.removeChannel(stateChannel);
      supabase.removeChannel(heartbeatChannel);
      supabase.removeChannel(alertChannel);
      clearInterval(interval);
    };
  }, [fetchStatus]);

  const armSystem = async (mode: SystemMode, pin: string) => {
    const res = await fetch('/api/arm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, pin }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to change mode');
    }

    await fetchStatus();
  };

  return { ...status, loading, armSystem, refetch: fetchStatus };
}
