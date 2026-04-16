'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import type { SensorEvent } from '@/lib/types';

export default function ActivityFeed() {
  const [events, setEvents] = useState<(SensorEvent & { zone?: { name: string } })[]>([]);

  const fetchEvents = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('events')
      .select('*, zone:zones(name)')
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setEvents(data);
  }, []);

  useEffect(() => {
    fetchEvents();

    const supabase = createClient();
    const channel = supabase
      .channel('activity-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'events' },
        () => fetchEvents()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchEvents]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'open': return '🔴';
      case 'closed': return '🟢';
      case 'triggered': return '🔴';
      case 'clear': return '🔵';
      default: return '⚪';
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Activity Log</h2>
      <div className="bg-ez-navy-light/20 rounded-xl border border-ez-navy-light/30 overflow-hidden max-h-80 overflow-y-auto">
        {events.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No activity yet</div>
        ) : (
          <AnimatePresence mode="popLayout">
            {events.map((event) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-3 px-4 py-3 border-b border-ez-navy-light/20 last:border-0"
              >
                <span className="text-lg">{getEventIcon(event.event_type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-ez-white truncate">
                    {event.zone?.name || `Zone ${event.zone_id}`}
                  </div>
                  <div className="text-xs text-gray-400">
                    {event.event_type.toUpperCase()}
                    {event.value ? ` - ${event.value}cm` : ''}
                  </div>
                </div>
                <div className="text-xs text-gray-500 whitespace-nowrap">
                  {formatTime(event.created_at)}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
