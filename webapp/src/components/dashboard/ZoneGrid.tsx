'use client';

import { motion } from 'framer-motion';
import type { ZoneWithStatus } from '@/lib/types';

interface ZoneGridProps {
  zones: ZoneWithStatus[];
  loading: boolean;
}

export default function ZoneGrid({ zones, loading }: ZoneGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="h-32 rounded-xl bg-ez-navy-light/30 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (zones.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Zones</h2>
        <div className="rounded-xl p-8 border border-ez-navy-light/30 bg-ez-navy-light/10 text-center">
          <p className="text-gray-400 text-lg mb-2">No zones registered</p>
          <p className="text-gray-500 text-sm">
            Zones will appear automatically when your ESP/Arduino sensors connect to the Pi server.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Zones</h2>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {zones.map((zone, i) => (
          <motion.div
            key={zone.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`
              rounded-xl p-4 border transition-all
              ${!zone.connected
                ? 'bg-gray-900/40 border-red-800/40'
                : zone.is_triggered
                ? 'bg-red-900/30 border-red-500/50 shadow-[0_0_15px_rgba(255,23,68,0.2)]'
                : 'bg-ez-navy-light/30 border-ez-navy-light/50'
              }
            `}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400 uppercase tracking-wider">
                {zone.sensor_type === 'hall' ? 'Door/Window' : 'Proximity'}
              </span>
              {zone.connected ? (
                <div
                  className={`w-3 h-3 rounded-full ${
                    zone.is_triggered
                      ? 'bg-red-500 animate-alert-flash'
                      : 'bg-green-500'
                  }`}
                />
              ) : (
                <div className="w-3 h-3 rounded-full bg-red-800 animate-pulse" />
              )}
            </div>

            {/* Zone name */}
            <h3 className={`text-lg font-bold mb-1 ${zone.connected ? 'text-ez-white' : 'text-gray-500'}`}>
              {zone.name}
            </h3>

            {zone.device_name && (
              <p className="text-xs text-gray-600 mb-1 font-mono">{zone.device_name}</p>
            )}
            <p className="text-xs text-gray-500 mb-3">{zone.location || ''}</p>

            {/* Connection / Status */}
            {!zone.connected ? (
              <div className="flex flex-col gap-1">
                <div className="text-sm font-semibold text-red-500">
                  DISCONNECTED
                </div>
                <div className="text-xs text-red-400/70">
                  Check your door sensors
                </div>
              </div>
            ) : zone.sensor_type === 'hall' ? (
              <div className={`text-sm font-semibold ${zone.is_triggered ? 'text-red-400' : 'text-green-400'}`}>
                {zone.is_triggered ? 'OPEN' : 'SECURED'}
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Distance</span>
                  <span className={zone.is_triggered ? 'text-red-400' : 'text-blue-400'}>
                    {zone.latest_event?.value ? `${zone.latest_event.value}cm` : '--'}
                  </span>
                </div>
                {/* Distance bar */}
                <div className="w-full h-2 rounded-full bg-ez-navy overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${zone.is_triggered ? 'bg-red-500' : 'bg-blue-500'}`}
                    initial={{ width: 0 }}
                    animate={{
                      width: zone.latest_event?.value
                        ? `${Math.min(100, (parseInt(zone.latest_event.value) / (zone.threshold_cm || 100)) * 100)}%`
                        : '0%',
                    }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <div className="text-xs text-gray-500">
                  Threshold: {zone.threshold_cm || 30}cm
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
