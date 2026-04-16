'use client';

import { motion } from 'framer-motion';

interface GlowButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'yellow' | 'red' | 'green' | 'blue';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  type?: 'button' | 'submit';
  className?: string;
}

const variantStyles = {
  yellow: {
    bg: 'bg-yellow-500',
    hover: 'hover:bg-yellow-400',
    shadow: 'rgba(255, 215, 0, 0.4)',
    text: 'text-gray-900',
  },
  red: {
    bg: 'bg-red-600',
    hover: 'hover:bg-red-500',
    shadow: 'rgba(255, 23, 68, 0.4)',
    text: 'text-white',
  },
  green: {
    bg: 'bg-green-600',
    hover: 'hover:bg-green-500',
    shadow: 'rgba(0, 230, 118, 0.4)',
    text: 'text-white',
  },
  blue: {
    bg: 'bg-blue-600',
    hover: 'hover:bg-blue-500',
    shadow: 'rgba(30, 58, 95, 0.6)',
    text: 'text-white',
  },
};

const sizeStyles = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-5 text-xl min-w-[140px]',
};

export default function GlowButton({
  children,
  onClick,
  variant = 'yellow',
  size = 'md',
  disabled = false,
  type = 'button',
  className = '',
}: GlowButtonProps) {
  const styles = variantStyles[variant];

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: 1.02 }}
      className={`
        ${styles.bg} ${styles.hover} ${styles.text}
        ${sizeStyles[size]}
        rounded-xl font-bold
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        touch-target
        ${className}
      `}
      style={{
        boxShadow: disabled ? 'none' : `0 0 20px ${styles.shadow}`,
      }}
    >
      {children}
    </motion.button>
  );
}
