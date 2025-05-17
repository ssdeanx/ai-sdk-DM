'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Maximize, Minimize, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ImageDisplayProps {
  src: string;
  alt: string;
  className?: string;
}

export function ImageDisplay({ src, alt, className }: ImageDisplayProps) {
  const [expanded, setExpanded] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [hovered, setHovered] = useState(false);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = src;
    link.download = alt || 'image';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className={cn(
        'relative rounded-lg overflow-hidden border border-border/50 shadow-md transition-all duration-300 bg-background/50',
        expanded &&
          'fixed inset-4 z-50 bg-background/95 backdrop-blur-sm flex flex-col',
        className
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-center justify-between bg-gradient-to-r from-gray-900/90 to-gray-800/90 px-3 py-1.5 text-xs text-white">
        <span className="font-medium truncate max-w-[200px]">{alt}</span>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: hovered || expanded ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-1"
        >
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-6 w-6 rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={() => setZoomed(!zoomed)}
          >
            {zoomed ? (
              <ZoomOut className="h-3 w-3" />
            ) : (
              <ZoomIn className="h-3 w-3" />
            )}
            <span className="sr-only">{zoomed ? 'Zoom out' : 'Zoom in'}</span>
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-6 w-6 rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={handleDownload}
          >
            <Download className="h-3 w-3" />
            <span className="sr-only">Download</span>
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-6 w-6 rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <Minimize className="h-3 w-3" />
            ) : (
              <Maximize className="h-3 w-3" />
            )}
            <span className="sr-only">
              {expanded ? 'Minimize' : 'Maximize'}
            </span>
          </Button>
        </motion.div>
      </div>

      <div
        className={cn(
          'relative overflow-hidden bg-background/50 backdrop-blur-sm',
          expanded && 'flex-1 flex items-center justify-center'
        )}
      >
        {src.startsWith('data:') || src.startsWith('http') ? (
          <div
            className={cn(
              'relative transition-all duration-300 ease-in-out',
              zoomed && 'scale-150',
              expanded && 'max-h-full max-w-full'
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              className={cn(
                'max-w-full object-contain',
                expanded ? 'max-h-[calc(100vh-8rem)]' : 'max-h-[300px]'
              )}
            />
          </div>
        ) : (
          <div className="p-4 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-md">
            <p>Unable to display image. Invalid source.</p>
          </div>
        )}
      </div>
    </div>
  );
}
