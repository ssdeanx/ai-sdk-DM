'use client';

import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import { ReactNode } from 'react';

interface DashboardHeaderProps {
  title: string;
  subtitle: string;
  highlightedText?: string;
  children?: ReactNode;
}

export function DashboardHeader({
  title,
  subtitle,
  highlightedText = 'DeanmachinesAI',
  children,
}: DashboardHeaderProps) {
  const { theme } = useTheme();

  return (
    <motion.div
      className="relative overflow-hidden rounded-xl p-8 mb-8"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-violet-500/10 to-purple-500/10 dark:from-blue-500/20 dark:via-violet-500/20 dark:to-purple-500/20 z-0" />

      {/* Animated particles/glow effect */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-blue-500/20 dark:bg-blue-400/20 blur-xl"
            style={{
              width: Math.random() * 100 + 50,
              height: Math.random() * 100 + 50,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
            }}
            animate={{
              x: [0, Math.random() * 40 - 20],
              y: [0, Math.random() * 40 - 20],
              opacity: [0.4, 0.8, 0.4],
            }}
            transition={{
              duration: Math.random() * 5 + 10,
              repeat: Infinity,
              repeatType: 'reverse',
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10">
        <motion.h1
          className="text-4xl font-bold tracking-tight mb-2"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {title}{' '}
          <span className="gradient-text font-extrabold">
            {highlightedText}
          </span>
        </motion.h1>
        <motion.p
          className="text-xl text-muted-foreground max-w-3xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {subtitle}
        </motion.p>

        {children && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-6"
          >
            {children}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
