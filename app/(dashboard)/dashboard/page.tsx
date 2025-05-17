'use client';

import { motion } from 'framer-motion';
import {
  Activity,
  Zap,
  Sparkles,
  Code,
  Brain,
  Network,
  MessageSquare,
  Settings,
} from 'lucide-react';

// Import modular components
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { DashboardStats } from '@/components/dashboard/dashboard-stats';
import { FeatureCard } from '@/components/dashboard/feature-card';
import { CallToAction } from '@/components/dashboard/call-to-action';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { SystemMetrics } from '@/components/dashboard/system-metrics';

export default function DashboardPage() {
  // Animation variants for features section
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 260,
        damping: 20,
      },
    },
  };

  const features = [
    {
      title: 'AI Models',
      description: 'Configure and manage AI models from various providers',
      icon: Sparkles,
      color: 'from-violet-500 to-purple-600',
      link: '/models',
    },
    {
      title: 'Tools',
      description: 'Create and manage tools for your AI agents',
      icon: Code,
      color: 'from-blue-500 to-cyan-600',
      link: '/tools',
    },
    {
      title: 'Agents',
      description: 'Build intelligent agents with custom workflows',
      icon: Brain,
      color: 'from-green-500 to-emerald-600',
      link: '/agents',
    },
    {
      title: 'Networks',
      description: 'Create multi-agent networks for complex tasks',
      icon: Network,
      color: 'from-orange-500 to-amber-600',
      link: '/networks',
    },
    {
      title: 'Chat',
      description: 'Interact with your AI models and agents',
      icon: MessageSquare,
      color: 'from-pink-500 to-rose-600',
      link: '/chat',
    },
    {
      title: 'Demo Chat',
      description: 'Try different chat interfaces',
      icon: MessageSquare,
      color: 'from-purple-500 to-indigo-600',
      link: '/demo-chat',
    },
    {
      title: 'Settings',
      description: 'Configure your AI SDK Framework',
      icon: Settings,
      color: 'from-gray-500 to-slate-600',
      link: '/settings',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <DashboardHeader
        title="Welcome to"
        subtitle="Build, manage, and deploy sophisticated AI systems with cutting-edge technology"
        highlightedText="DeanmachinesAI"
      />

      {/* Real-time stats from Supabase */}
      <DashboardStats className="mb-8" />

      {/* Dashboard Analytics Section */}
      <div className="grid gap-6 md:grid-cols-2">
        <RecentActivity />
        <SystemMetrics />
      </div>

      {/* Features Section */}
      <motion.div
        className="grid gap-4 md:grid-cols-3"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {features.map((feature, i) => (
          <motion.div key={i} variants={item}>
            <FeatureCard
              title={feature.title}
              description={feature.description}
              icon={feature.icon}
              color={feature.color}
              link={feature.link}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Call to Action */}
      <CallToAction
        title="Ready to get started?"
        description="Explore our documentation to learn how to build powerful AI applications with DeanmachinesAI."
        primaryAction={{
          label: 'Quick Start',
          href: '/docs/quickstart',
          icon: Zap,
        }}
        secondaryAction={{
          label: 'View Docs',
          href: '/docs',
        }}
        visual={
          <div className="w-full h-full bg-gradient-to-br from-blue-500/20 via-violet-500/20 to-pink-500/20 dark:from-blue-500/10 dark:via-violet-500/10 dark:to-pink-500/10 flex items-center justify-center">
            <Activity className="w-12 h-12 text-primary/50" />
          </div>
        }
      />
    </div>
  );
}
