'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Maximize,
  Minimize,
  Download,
  Box,
  RotateCcw,
  Pause,
  Play,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

// Import Three.js dynamically to avoid SSR issues
import dynamic from 'next/dynamic';
const ThreeViewer = dynamic(
  () => import('./three-viewer').then((mod) => mod.ThreeViewer),
  { ssr: false }
);

export interface ModelViewerProps {
  title?: string;
  modelUrl: string;
  format?: 'gltf' | 'glb' | 'obj' | 'stl';
  className?: string;
  backgroundColor?: string;
  autoRotate?: boolean;
}

export function ModelViewer({
  title = '3D Model',
  modelUrl,
  format = 'glb',
  className,
  backgroundColor = '#f5f5f5',
  autoRotate = true,
}: ModelViewerProps) {
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [isRotating, setIsRotating] = useState(autoRotate);
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle download model
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = modelUrl;
    link.download = title.replace(/\s+/g, '-').toLowerCase() + '.' + format;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle toggle rotation
  const handleToggleRotation = () => {
    setIsRotating(!isRotating);
  };

  // Handle reset view
  const handleResetView = () => {
    // This would be implemented in the ThreeViewer component
    if (containerRef.current) {
      const resetEvent = new CustomEvent('reset-view');
      containerRef.current.dispatchEvent(resetEvent);
    }
  };

  // Handle zoom change
  const handleZoomChange = (value: number[]) => {
    setZoom(value[0]);
    // This would be implemented in the ThreeViewer component
    if (containerRef.current) {
      const zoomEvent = new CustomEvent('set-zoom', {
        detail: { zoom: value[0] },
      });
      containerRef.current.dispatchEvent(zoomEvent);
    }
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
      ref={containerRef}
    >
      <div className="flex items-center justify-between bg-gradient-to-r from-slate-800 to-gray-800 px-4 py-2 text-white">
        <div className="flex items-center gap-2">
          <Box className="h-4 w-4" />
          <span className="font-medium">{title}</span>
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
            onClick={handleToggleRotation}
          >
            {isRotating ? (
              <Pause className="h-3.5 w-3.5" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            <span className="sr-only">
              {isRotating ? 'Pause rotation' : 'Start rotation'}
            </span>
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-7 w-7 rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={handleResetView}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="sr-only">Reset view</span>
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-7 w-7 rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={handleDownload}
          >
            <Download className="h-3.5 w-3.5" />
            <span className="sr-only">Download model</span>
          </Button>
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

      <div className={cn('relative', expanded ? 'flex-1' : 'h-[300px]')}>
        {/* This is a placeholder for the actual Three.js component */}
        <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <p className="text-muted-foreground">
            3D Model Viewer would render here using Three.js
          </p>
        </div>

        {/* Controls overlay */}
        <div className="absolute bottom-4 left-4 right-4 bg-black/20 backdrop-blur-sm rounded-md p-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-white">Zoom:</span>
            <Slider
              value={[zoom]}
              min={0.5}
              max={3}
              step={0.1}
              onValueChange={handleZoomChange}
              className="flex-1"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
