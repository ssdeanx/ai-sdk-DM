'use client';

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { GradientCard } from '@/components/ui/gradient-card';
import { Progress } from '@/components/ui/progress';

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  color: string;
  progress?: number;
  index?: number;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  color,
  progress = 60,
  index = 0,
}: StatCardProps) {
  return (
    <motion.div
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className="relative"
    >
      {/* Glow effect behind card */}
      <div
        className={`absolute inset-0 rounded-xl blur-xl opacity-30 ${
          color.includes('green')
            ? 'bg-green-500/30'
            : color.includes('violet')
              ? 'bg-violet-500/30'
              : color.includes('blue')
                ? 'bg-blue-500/30'
                : 'bg-amber-500/30'
        }`}
      />

      <GradientCard
        gradientFrom={
          color.includes('green')
            ? 'from-green-500'
            : color.includes('violet')
              ? 'from-violet-500'
              : color.includes('blue')
                ? 'from-blue-500'
                : 'from-amber-500'
        }
        gradientTo={
          color.includes('green')
            ? 'to-emerald-600'
            : color.includes('violet')
              ? 'to-purple-600'
              : color.includes('blue')
                ? 'to-cyan-600'
                : 'to-orange-600'
        }
        className="overflow-hidden h-full backdrop-blur-sm relative z-10"
        hoverEffect={true}
      >
        <div className="p-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {label}
              </p>
              <h3 className="text-3xl font-bold mt-1">{value}</h3>
            </div>
            <div
              className={`p-3 rounded-full bg-gradient-to-br ${
                color.includes('green')
                  ? 'from-green-500/20 to-emerald-600/20'
                  : color.includes('violet')
                    ? 'from-violet-500/20 to-purple-600/20'
                    : color.includes('blue')
                      ? 'from-blue-500/20 to-cyan-600/20'
                      : 'from-amber-500/20 to-orange-600/20'
              } backdrop-blur-sm`}
            >
              <Icon className={`w-6 h-6 ${color}`} />
            </div>
          </div>

          {/* Animated progress indicator */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <motion.div
              className={`h-1 rounded-full ${
                color.includes('green')
                  ? 'bg-green-500/20'
                  : color.includes('violet')
                    ? 'bg-violet-500/20'
                    : color.includes('blue')
                      ? 'bg-blue-500/20'
                      : 'bg-amber-500/20'
              }`}
            >
              <motion.div
                className={`h-full rounded-full ${
                  color.includes('green')
                    ? 'bg-green-500'
                    : color.includes('violet')
                      ? 'bg-violet-500'
                      : color.includes('blue')
                        ? 'bg-blue-500'
                        : 'bg-amber-500'
                }`}
                initial={{ width: '0%' }}
                animate={{ width: `${progress}%` }}
                transition={{
                  duration: 1.5,
                  delay: 0.2 + index * 0.1,
                  ease: 'easeOut',
                }}
              />
            </motion.div>
          </div>
        </div>
      </GradientCard>
    </motion.div>
  );
}
