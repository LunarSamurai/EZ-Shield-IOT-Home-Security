'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { ZoneWithStatus } from '@/lib/types';

export function useRealtimeZones() {
  const [zones, setZones] = useState<ZoneWithStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchZones = useCallback(async () => {
    const res = await fetch('/api/zones');
    if (res.ok) {
      const data = await res.json();
      setZones(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchZones();

    const supabase = createClient();

    // Subscribe to new events to update zone status
    const channel = supabase
      .channel('zone-events')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'events' },
        () => {
          // Refetch zones when new event comes in
          fetchZones();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchZones]);

  return { zones, loading, refetch: fetchZones };
}
