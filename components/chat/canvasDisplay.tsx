"use client";

import React, { useEffect, useRef, useState, Suspense } from "react";
import styles from "./canvasDisplay.module.css";
import { upstashLogger } from "@/lib/memory/upstash/upstash-logger";

// Dynamic imports for CodeMirror and xterm.js (avoid SSR issues)
const CodeMirror = React.lazy(() => import("@uiw/react-codemirror"));
let Terminal: any = null;
if (typeof window !== "undefined") {
  import("xterm").then((mod) => {
    Terminal = mod.Terminal;
  });
}

export type CanvasDisplayMode = "code" | "canvas" | "terminal";

export interface CanvasDisplayProps {
  mode: CanvasDisplayMode;
  code?: string;
  language?: string;
  onCodeChange?: (code: string) => void;
  canvasDraw?: (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => void;
  terminalContent?: string;
  onTerminalInput?: (input: string) => void;
  width?: number;
  height?: number;
  className?: string;
  fileName?: string;
}

export const CanvasDisplay: React.FC<CanvasDisplayProps> = ({
  mode,
  code = "",
  language = "typescript",
  onCodeChange,
  canvasDraw,
  terminalContent = "",
  onTerminalInput,
  width = 800,
  height = 600,
  className,
  fileName,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const [term, setTerm] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Canvas drawing effect
  useEffect(() => {
    if (mode === "canvas" && canvasRef.current && canvasDraw) {
      try {
        const ctx = canvasRef.current.getContext("2d");
        if (ctx) {
          canvasDraw(ctx, canvasRef.current);
        }
      } catch (err: any) {
        setError("Canvas error: " + err.message);
        upstashLogger("Canvas error", err);
      }
    }
  }, [mode, canvasDraw]);

  // Terminal effect (xterm.js)
  useEffect(() => {
    if (mode === "terminal" && terminalRef.current && typeof window !== "undefined" && Terminal) {
      try {
        if (!term) {
          const t = new Terminal({
            cols: 80,
            rows: 24,
            theme: {
              background: "#18181b",
              foreground: "#e4e4e7",
            },
          });
          t.open(terminalRef.current);
          t.write(terminalContent || "\u001b[1;32mWelcome to the AI Terminal\u001b[0m\r\n");
          t.onData((input: string) => {
            onTerminalInput?.(input);
          });
          setTerm(t);
        } else {
          term.write(terminalContent || "");
        }
      } catch (err: any) {
        setError("Terminal error: " + err.message);
        upstashLogger("Terminal error", err);
      }
    }
    // Cleanup
    return () => {
      if (term) {
        term.dispose();
        setTerm(null);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, terminalContent]);

  // Error display
  if (error) {
    return (
      <div className={styles.error + " p-4 text-red-500 bg-red-50 dark:bg-red-900/20 rounded"}>
        <strong>Error:</strong> {error}
      </div>
    );
  }

  // Main render
  return (
    <div className={className || styles.canvasDisplay} style={{ width, height, minHeight: 300 }}>
      {mode === "code" && (
        <Suspense fallback={<div>Loading editor…</div>}>
          <CodeMirror
            value={code}
            height={height - 32}
            width={width}
            theme="dark"
            extensions={[]}
            onChange={onCodeChange}
            basicSetup={{ lineNumbers: true, highlightActiveLine: true }}
            style={{ fontSize: 16, borderRadius: 8 }}
          />
        </Suspense>
      )}
      {mode === "canvas" && (
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="rounded border border-border/30 bg-background"
        />
      )}
      {mode === "terminal" && (
        <div
          ref={terminalRef}
          className="rounded border border-border/30 bg-black text-green-400 p-2"
          style={{ width, height, minHeight: 200, overflow: "auto" }}
        >
          {/* xterm.js will mount here */}
          {!Terminal && <div>Loading terminal…</div>}
        </div>
      )}
    </div>
  );
};

export default CanvasDisplay;