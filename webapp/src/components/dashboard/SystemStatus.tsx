'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface SystemStatusProps {
  piOnline: boolean;
  lastHeartbeat: string | null;
  activeAlerts: number;
}

export default function SystemStatus({ piOnline, lastHeartbeat, activeAlerts }: SystemStatusProps) {
  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">System Status</h2>
      <div className="grid grid-cols-3 gap-3">
        {/* Pi Connection */}
        <div className="bg-ez-navy-light/30 rounded-xl p-4 border border-ez-navy-light/50">
          <div className="flex items-center gap-2 mb-2">
            <motion.div
              className={`w-3 h-3 rounded-full ${piOnline ? 'bg-green-500' : 'bg-red-500'}`}
              animate={piOnline ? { scale: [1, 1.2, 1] } : {}}
              transition={{ repeat: Infinity, duration: 2 }}
            />
            <span className="text-xs text-gray-400 uppercase">Pi Server</span>
          </div>
          <div className={`text-lg font-bold ${piOnline ? 'text-green-400' : 'text-red-400'}`}>
            {piOnline ? 'Online' : 'Offline'}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Last ping: {formatTime(lastHeartbeat)}
          </div>
        </div>

        {/* Active Alerts */}
        <div className={`rounded-xl p-4 border ${
          activeAlerts > 0
            ? 'bg-red-900/20 border-red-500/30'
            : 'bg-ez-navy-light/30 border-ez-navy-light/50'
        }`}>
          <div className="text-xs text-gray-400 uppercase mb-2">Active Alerts</div>
          <div className={`text-3xl font-bold ${
            activeAlerts > 0 ? 'text-red-400 animate-alert-flash' : 'text-green-400'
          }`}>
            {activeAlerts}
          </div>
        </div>

        {/* Clock */}
        <div className="bg-ez-navy-light/30 rounded-xl p-4 border border-ez-navy-light/50">
          <div className="text-xs text-gray-400 uppercase mb-2">Current Time</div>
          <Clock />
        </div>
      </div>
    </div>
  );
}

function Clock() {
  const [time, setTime] = useState('');

  useEffect(() => {
    const update = () => {
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-2xl font-mono font-bold text-ez-yellow" suppressHydrationWarning>
      {time || '--:--:--'}
    </div>
  );
}
