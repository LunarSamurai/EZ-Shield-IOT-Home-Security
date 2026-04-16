'use client';

import { motion } from 'framer-motion';

interface NotificationBannerProps {
  configured: boolean;
  onOpenSettings: () => void;
}

export default function NotificationBanner({ configured, onOpenSettings }: NotificationBannerProps) {
  if (configured) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-yellow-600/40 bg-yellow-900/20 p-4 flex items-center gap-4"
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-ez-yellow">Emergency notifications not configured</p>
        <p className="text-xs text-gray-400 mt-0.5">
          Set up email, SMS, and voice alerts so you get notified instantly during a break-in.
        </p>
      </div>
      <button
        onClick={onOpenSettings}
        className="flex-shrink-0 px-4 py-2 rounded-lg bg-ez-yellow/20 text-ez-yellow text-sm font-medium
                   hover:bg-ez-yellow/30 transition-colors whitespace-nowrap"
      >
        Set Up Now
      </button>
    </motion.div>
  );
}
