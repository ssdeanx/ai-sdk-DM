'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Github, Twitter } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function CTASection() {
  const [ctaData, setCtaData] = useState({
    title: 'Ready to Build Your AI Application?',
    description:
      'Get started with AI SDK Framework today and build powerful AI applications with agents, tools, and memory.',
    primaryCta: 'Get Started',
    secondaryCta: 'View on GitHub',
    twitterCta: 'Follow on Twitter',
    githubUrl: 'https://github.com/ssdeanx/ai-sdk-DM',
    twitterUrl: 'https://x.com/deanmachinesai',
  });

  useEffect(() => {
    // Fetch CTA content from API
    const fetchCtaContent = async () => {
      try {
        const response = await fetch('/api/content/cta');
        if (response.ok) {
          const data = await response.json();
          if (data) {
            setCtaData({
              title: data.title || ctaData.title,
              description: data.description || ctaData.description,
              primaryCta: data.data?.primaryCta || ctaData.primaryCta,
              secondaryCta: data.data?.secondaryCta || ctaData.secondaryCta,
              twitterCta: data.data?.twitterCta || ctaData.twitterCta,
              githubUrl: data.data?.githubUrl || ctaData.githubUrl,
              twitterUrl: data.data?.twitterUrl || ctaData.twitterUrl,
            });
          }
        }
      } catch (error) {
        console.error('Error fetching CTA content:', error);
      }
    };

    fetchCtaContent();
  }, []);

  return (
    <section className="py-20 bg-gray-900 relative">
      {/* Background elements */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

      {/* Glowing orbs */}
      <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-blue-500 rounded-full filter blur-[128px] opacity-20 animate-pulse-slow"></div>
      <div
        className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-purple-500 rounded-full filter blur-[128px] opacity-20 animate-pulse-slow"
        style={{ animationDelay: '1s' }}
      ></div>

      <div className="container relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 mb-6">
              {ctaData.title}
            </h2>
            <p className="text-gray-400 mb-8 text-lg">{ctaData.description}</p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700"
              >
                <Link href="/dashboard">
                  {ctaData.primaryCta}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                <Link
                  href={ctaData.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Github className="mr-2 h-4 w-4" />
                  {ctaData.secondaryCta}
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                <Link
                  href={ctaData.twitterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Twitter className="mr-2 h-4 w-4" />
                  {ctaData.twitterCta}
                </Link>
              </Button>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16 text-center"
          >
            <div>
              <div className="text-3xl font-bold text-white mb-1">10k+</div>
              <div className="text-gray-500">Downloads</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white mb-1">50+</div>
              <div className="text-gray-500">Contributors</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white mb-1">100+</div>
              <div className="text-gray-500">GitHub Stars</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white mb-1">24/7</div>
              <div className="text-gray-500">Support</div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
