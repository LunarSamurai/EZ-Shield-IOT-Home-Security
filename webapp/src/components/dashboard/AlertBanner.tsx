'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { Alert } from '@/lib/types';

interface AlertBannerProps {
  alerts: Alert[];
  hasActiveAlarm: boolean;
}

export default function AlertBanner({ alerts, hasActiveAlarm }: AlertBannerProps) {
  const unacknowledged = alerts.filter((a) => !a.acknowledged);

  if (unacknowledged.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className={`rounded-xl border overflow-hidden ${
          hasActiveAlarm
            ? 'bg-red-900/40 border-red-500/50'
            : 'bg-yellow-900/30 border-yellow-500/30'
        }`}
      >
        {hasActiveAlarm && (
          <motion.div
            className="bg-red-600 text-white text-center py-2 font-bold text-lg tracking-wider"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ repeat: Infinity, duration: 0.5 }}
          >
            ALARM TRIGGERED
          </motion.div>
        )}
        <div className="p-4 space-y-2 max-h-40 overflow-y-auto">
          {unacknowledged.slice(0, 5).map((alert) => (
            <div
              key={alert.id}
              className="flex items-center gap-3 text-sm"
            >
              <div
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  alert.severity === 'critical'
                    ? 'bg-red-500 animate-alert-flash'
                    : alert.severity === 'warning'
                    ? 'bg-yellow-500'
                    : 'bg-blue-500'
                }`}
              />
              <span className="text-ez-white flex-1">{alert.message}</span>
              <span className="text-gray-500 text-xs whitespace-nowrap">
                {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
          {unacknowledged.length > 5 && (
            <div className="text-xs text-gray-400 text-center">
              +{unacknowledged.length - 5} more alerts
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
