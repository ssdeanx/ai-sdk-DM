'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Code, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Particles } from '@tsparticles/react';

export default function HeroSection() {
  const [heroData, setHeroData] = useState({
    title: 'Build Powerful AI Applications with DeanmachinesAI',
    subtitle:
      'The open-source framework for building AI applications with agents, tools, and memory',
    description:
      'Create, deploy, and manage AI agents with a powerful toolkit designed for developers.',
    cta: 'Get Started',
    secondaryCta: 'View Documentation',
  });

  useEffect(() => {
    const fetchHeroContent = async () => {
      try {
        const response = await fetch('/api/ai-sdk/content/hero');
        if (response.ok) {
          const data = await response.json();
          if (data) {
            setHeroData((prev) => ({
              title: data.title || prev.title,
              subtitle: data.subtitle || prev.subtitle,
              description: data.description || prev.description,
              cta: data.data?.cta || prev.cta,
              secondaryCta: data.data?.secondaryCta || prev.secondaryCta,
            }));
          }
        }
      } catch {
        // Optionally log error in production
      }
    };
    fetchHeroContent();
  }, []);

  return (
    <section className="relative py-20 md:py-32 overflow-hidden bg-zinc-950">
      {/* Animated Gradient Overlay */}
      <div className="pointer-events-none absolute inset-0 z-0 animate-gradient-x hero-gradient-overlay" />
      {/* Multi-layered Particles Background */}
      <div className="absolute inset-0 z-0">
        <Particles
          id="tsparticles-hero"
          options={{
            background: { color: '#09090b' },
            fpsLimit: 90,
            particles: {
              number: {
                value: 120,
                density: { enable: true },
              },
              color: { value: ['#39FF14', '#00bfff', '#fff', '#0ff', '#ff0'] },
              shape: { type: ['circle', 'triangle', 'edge', 'polygon'] },
              opacity: {
                value: { min: 0.5, max: 0.8 },
                animation: { enable: true, speed: 0.6, sync: false },
              },
              size: {
                value: { min: 1, max: 4 },
                animation: { enable: true, speed: 2, sync: false },
              },
              move: {
                enable: true,
                speed: 1.5,
                direction: 'none',
                random: true,
                straight: false,
                outModes: { default: 'bounce' },
                attract: { enable: true, rotate: { x: 600, y: 1200 } },
              },
              links: {
                enable: true,
                color: '#39FF14',
                distance: 120,
                opacity: 0.2,
                width: 1,
                triangles: { enable: true, color: '#00bfff', opacity: 0.1 },
                shadow: {
                  enable: true,
                  color: '#39FF14',
                  blur: 5,
                },
              },
            },
            interactivity: {
              events: {
                onHover: { enable: true, mode: 'repulse' },
                onClick: { enable: true, mode: 'push' },
                resize: { enable: true },
              },
              modes: {
                repulse: { distance: 140, duration: 0.5 },
                push: { quantity: 8 },
                bubble: { distance: 200, size: 8, duration: 2, opacity: 0.8 },
                grab: { distance: 180, links: { opacity: 0.5 } },
              },
            },
            detectRetina: true,
            fullScreen: false,
            zLayers: 3,
          }}
        />
      </div>
      {/* Neon Glows */}
      <div className="pointer-events-none absolute top-1/4 left-1/4 w-96 h-96 bg-[#39FF14] rounded-full blur-[160px] opacity-20 z-0"></div>
      <div className="pointer-events-none absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#00bfff] rounded-full blur-[160px] opacity-20 z-0"></div>
      {/* Glassmorphism Card Overlay */}
      <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
        <div className="glass-card max-w-2xl w-full mx-auto p-8 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-2xl bg-white/10 dark:bg-black/30">
          <div className="container relative z-10">
            <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mb-4"
              >
                <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium bg-gradient-to-r from-[#39FF14]/20 to-[#00bfff]/20 text-[#39FF14] ring-1 ring-inset ring-[#39FF14]/40 mb-4 shadow-[0_0_8px_#39FF14]">
                  <Sparkles className="mr-1 h-3 w-3 text-[#00bfff]" />
                  DeanmachinesAI
                </span>
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-[#39FF14] to-[#00bfff] mb-6 drop-shadow-[0_0_16px_#39FF14]"
              >
                {heroData.title}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-xl md:text-2xl text-zinc-300 mb-4"
              >
                {heroData.subtitle}
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="text-zinc-400 mb-8 max-w-2xl"
              >
                {heroData.description}
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="flex flex-col sm:flex-row gap-4"
              >
                <Button
                  asChild
                  size="lg"
                  className="bg-gradient-to-r from-[#39FF14] to-[#00bfff] text-zinc-950 font-bold shadow-[0_0_16px_#39FF14] hover:from-[#00FF99] hover:to-[#00bfff]"
                >
                  <Link href="/dashboard">
                    {heroData.cta}
                    <ArrowRight className="ml-2 h-4 w-4 text-[#00bfff]" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-[#00bfff] text-[#00bfff] hover:bg-zinc-900 hover:text-[#39FF14] hover:border-[#39FF14] font-bold"
                >
                  <Link href="/docs">
                    <Code className="mr-2 h-4 w-4 text-[#39FF14]" />
                    {heroData.secondaryCta}
                  </Link>
                </Button>
              </motion.div>
              {/* Code preview - canvas-inspired, glowing, no inline styles */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.6 }}
                className="mt-16 w-full max-w-3xl mx-auto"
              >
                <div className="code-canvas-preview">
                  <div className="code-canvas-header">
                    <div className="code-canvas-dots">
                      <div className="dot dot-green"></div>
                      <div className="dot dot-blue"></div>
                      <div className="dot dot-gray"></div>
                    </div>
                    <div className="code-canvas-title">
                      appBuilder-canvas.tsx
                    </div>
                    <div></div>
                  </div>
                  <div className="code-canvas-body">
                    <pre>
                      <code>
                        <span className="text-cyan-400">import</span>{' '}
                        <span className="text-zinc-100">
                          {'{'} Canvas, Node, Edge {'}'}
                        </span>{' '}
                        <span className="text-cyan-400">from</span>{' '}
                        <span className="text-[#00bfff]">
                          &apos;@ai-sdk/react&apos;
                        </span>
                        <span className="text-zinc-100">;</span>
                        <br />
                        <span className="text-cyan-400">const</span>{' '}
                        <span className="text-[#39FF14]">canvas</span>{' '}
                        <span className="text-zinc-100">=</span>{' '}
                        <span className="text-cyan-400">new</span>{' '}
                        <span className="text-[#00bfff]">Canvas</span>
                        <span className="text-zinc-100">()</span>
                        <br />
                        <br />
                        <span className="text-cyan-400">canvas</span>.
                        <span className="text-[#00bfff]">addNode</span>
                        <span className="text-zinc-100">(</span>
                        <span className="text-[#39FF14]">new</span>{' '}
                        <span className="text-[#00bfff]">Node</span>
                        <span className="text-zinc-100">
                          {'('}
                          {'{'} label:{' '}
                        </span>
                        <span className="text-[#00bfff]">
                          &apos;Input&apos;
                        </span>
                        <span className="text-zinc-100"> {'}'})</span>)
                        <br />
                        <span className="text-cyan-400">canvas</span>.
                        <span className="text-[#00bfff]">addNode</span>
                        <span className="text-zinc-100">(</span>
                        <span className="text-[#39FF14]">new</span>{' '}
                        <span className="text-[#00bfff]">Node</span>
                        <span className="text-zinc-100">{'({ label: '}</span>
                        <span className="text-[#39FF14]">
                          &apos;AI Agent&apos;
                        </span>
                        <span className="text-zinc-100"> {'}'})</span>)
                        <br />
                        <span className="text-cyan-400">canvas</span>.
                        <span className="text-[#00bfff]">addEdge</span>
                        <span className="text-zinc-100">(</span>
                        <span className="text-[#39FF14]">new</span>{' '}
                        <span className="text-[#00bfff]">Edge</span>
                        <span className="text-zinc-100">
                          {'('}
                          {'{'} from:{' '}
                        </span>
                        <span className="text-[#00bfff]">
                          &apos;Input&apos;
                        </span>
                        <span className="text-zinc-100">, to: </span>
                        <span className="text-[#39FF14]">
                          &apos;AI Agent&apos;
                        </span>
                        <span className="text-zinc-100"> {'}'})</span>)
                      </code>
                    </pre>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
