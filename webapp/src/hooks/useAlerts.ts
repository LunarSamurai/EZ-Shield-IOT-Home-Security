'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Alert } from '@/lib/types';

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    const res = await fetch('/api/alerts');
    if (res.ok) {
      const data = await res.json();
      setAlerts(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAlerts();

    const supabase = createClient();

    const channel = supabase
      .channel('alerts-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alerts' },
        () => fetchAlerts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAlerts]);

  const unacknowledgedAlerts = alerts.filter((a) => !a.acknowledged);
  const hasActiveAlarm = unacknowledgedAlerts.some((a) => a.severity === 'critical');

  return { alerts, unacknowledgedAlerts, hasActiveAlarm, loading, refetch: fetchAlerts };
}
