"use client";

import React, { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import styles from './canvasDisplay.module.css';
// Import xterm.js and the canvas addon
import { Terminal } from "@xterm/xterm";
import { CanvasAddon } from "@xterm/addon-canvas";

export interface CanvasDisplayProps {
  width?: number;
  height?: number;
  className?: string;
  draw?: (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => void;
  children?: React.ReactNode;
  terminal?: boolean; // If true, show a terminal in the canvas
  terminalOptions?: ConstructorParameters<typeof Terminal>[0];
  terminalWelcomeMessage?: string;
}

/**
 * CanvasDisplay: Renders a live HTML5 canvas and allows custom drawing via a draw callback.
 * You can use this to render code, terminal, or even a VSCode-like UI in the canvas.
 *
 * Example usage:
 * <CanvasDisplay width={600} height={400} draw={(ctx, canvas) => { ctx.fillStyle = '#222'; ctx.fillRect(0,0,canvas.width,canvas.height); }} />
 */
export function CanvasDisplay({
  width = 600,
  height = 400,
  className,
  draw,
  children,
  terminal = false,
  terminalOptions,
  terminalWelcomeMessage = 'Welcome to the AI SDK Canvas Terminal!',
}: CanvasDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [term, setTerm] = useState<Terminal | null>(null);

  // Canvas drawing effect
  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    if (draw) {
      setIsDrawing(true);
      draw(ctx, canvasRef.current);
      setIsDrawing(false);
    }
  }, [draw, width, height, children]);

  // Terminal effect
  useEffect(() => {
    if (!terminal || !terminalRef.current) return;
    if (term) return;
    const xterm = new Terminal({
      fontSize: 16,
      theme: {
        background: '#18181b',
        foreground: '#e5e5e5',
        cursor: '#00ff00',
      },
      ...terminalOptions,
    });
    const canvasAddon = new CanvasAddon();
    xterm.loadAddon(canvasAddon);
    xterm.open(terminalRef.current);
    xterm.writeln(terminalWelcomeMessage);
    const prompt = () => {
      xterm.write('\r\n$ ');
    };
    prompt();
    xterm.onKey(({ key, domEvent }: { key: string; domEvent: KeyboardEvent }) => {
      if (domEvent.key === 'Enter') {
        prompt();
      } else if (domEvent.key === 'Backspace') {
        if (xterm.buffer.active.cursorX > 2) {
          xterm.write('\b \b');
        }
      } else if (domEvent.key.length === 1) {
        xterm.write(key);
      }
    });
    setTerm(xterm);
    return () => {
      xterm.dispose();
      setTerm(null);
    };
  }, [terminal, terminalOptions, terminalWelcomeMessage, term]);

  return (
    <div className={cn(styles.canvasDisplayRoot, className)}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className={styles.canvas}
      />
      {terminal && (
        <div
          ref={terminalRef}
          className={styles.terminal}
        />
      )}
      {children && <div className="hidden">{children}</div>}
      {isDrawing && <div className={styles.drawingStatus}>Drawing...</div>}
    </div>
  );
}