'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Maximize,
  Minimize,
  Terminal,
  Copy,
  Check,
  Play,
  Pause,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ComputerUseProps {
  title: string;
  content: string;
  isTerminal?: boolean;
  isRunnable?: boolean;
  className?: string;
  onRun?: () => void;
}

export function ComputerUse({
  title,
  content,
  isTerminal = false,
  isRunnable = false,
  className,
  onRun,
}: ComputerUseProps) {
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [copied, setCopied] = useState(false);
  const [running, setRunning] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRunToggle = () => {
    if (onRun) {
      onRun();
    }
    setRunning(!running);
  };

  return (
    <div
      className={cn(
        'relative rounded-lg overflow-hidden border border-border/50 shadow-md transition-all duration-300 bg-background',
        expanded && 'fixed inset-4 z-50 bg-background flex flex-col',
        className
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-zinc-900 to-zinc-800 px-3 py-2 text-white">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-green-400" />
          <span className="text-sm font-medium">{title}</span>
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: hovered || expanded ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-1"
        >
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-7 w-7 rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            <span className="sr-only">Copy content</span>
          </Button>
          {isRunnable && (
            <Button
              variant="ghost"
              size="icon-sm"
              className={cn(
                'h-7 w-7 rounded-full bg-white/10 text-white hover:bg-white/20',
                running &&
                  'bg-green-500/20 text-green-400 hover:bg-green-500/30'
              )}
              onClick={handleRunToggle}
            >
              {running ? (
                <Pause className="h-3.5 w-3.5" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              <span className="sr-only">{running ? 'Stop' : 'Run'}</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-7 w-7 rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <Minimize className="h-3.5 w-3.5" />
            ) : (
              <Maximize className="h-3.5 w-3.5" />
            )}
            <span className="sr-only">
              {expanded ? 'Minimize' : 'Maximize'}
            </span>
          </Button>
        </motion.div>
      </div>

      {/* Content */}
      <div
        ref={contentRef}
        className={cn(
          'p-4 overflow-auto font-mono text-sm',
          isTerminal ? 'bg-black text-green-400' : 'bg-zinc-950 text-zinc-200',
          expanded ? 'flex-1' : 'max-h-[400px]'
        )}
      >
        {isTerminal ? (
          <pre className="whitespace-pre-wrap">{content}</pre>
        ) : (
          <pre className="whitespace-pre">{content}</pre>
        )}

        {running && isRunnable && (
          <div className="mt-4 border-t border-zinc-800 pt-4">
            <div className="flex items-center gap-2 text-yellow-400 animate-pulse">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Running...</span>
            </div>
            <div className="mt-2 text-zinc-400">
              {/* Simulated output could go here */}
              <p>$ executing command...</p>
              <p>$ process started with PID 1234</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
