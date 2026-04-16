'use client';

import { motion } from 'framer-motion';
import ShieldIcon from '@/components/ui/ShieldIcon';

interface ShieldLogoProps {
  show: boolean;
}

export default function ShieldLogo({ show }: ShieldLogoProps) {
  return (
    <motion.div
      className="flex flex-col items-center gap-4"
      initial={{ scale: 0, opacity: 0, y: 20 }}
      animate={
        show
          ? {
              scale: [0, 1.3, 1],
              opacity: [0, 1, 1],
              y: [20, -10, 0],
            }
          : {}
      }
      transition={{
        duration: 0.8,
        ease: [0.34, 1.56, 0.64, 1],
        times: [0, 0.6, 1],
      }}
    >
      <ShieldIcon size={140} glowing />
      <motion.h1
        className="text-4xl font-bold tracking-wider"
        initial={{ opacity: 0, y: 10 }}
        animate={show ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        <span className="text-ez-yellow">EZ</span>
        <span className="text-ez-white">Shield</span>
      </motion.h1>
      <motion.p
        className="text-sm text-gray-400 tracking-widest uppercase"
        initial={{ opacity: 0 }}
        animate={show ? { opacity: 1 } : {}}
        transition={{ delay: 0.7, duration: 0.5 }}
      >
        Home Security System
      </motion.p>
    </motion.div>
  );
}
