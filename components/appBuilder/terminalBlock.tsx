'use client';

import React, { useRef, useEffect } from 'react';
import { Terminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import { CanvasAddon } from '@xterm/addon-canvas';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

interface AppBuilderTerminalBlockProps {
  /** Initial content to display in the terminal (static mode) */
  content?: string;
  className?: string;
  /** Callback for command handling in non-interactive mode */
  onCommand?: (cmd: string) => void;
  /** Enable interactive terminal mode: user input is sent to backend */
  interactive?: boolean;
}

export const AppBuilderTerminalBlock: React.FC<
  AppBuilderTerminalBlockProps
> = ({ content = '', className = '', onCommand, interactive = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const cmdBufferRef = useRef<string>('');
  const commandHistoryRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number>(-1);

  // Initialize terminal once
  useEffect(() => {
    if (containerRef.current && !termRef.current) {
      const term = new Terminal({
        cursorBlink: true,
        convertEol: true,
        theme: { background: '#000000', foreground: '#00FF00' },
      });
      term.loadAddon(new CanvasAddon());
      term.open(containerRef.current);
      // Write initial content
      if (content) {
        term.write(content + '\r\n');
      }
      // Show prompt in interactive mode
      if (interactive) {
        term.write('$ ');
      }
      // Key handling for interactive command execution
      term.onKey(({ key, domEvent }) => {
        const printable =
          !domEvent.altKey &&
          !domEvent.ctrlKey &&
          !domEvent.metaKey &&
          key.length === 1;
        if (domEvent.key === 'Enter') {
          term.write('\r\n');
          const cmd = cmdBufferRef.current;
          // Save command in history if non-empty
          if (cmd.trim() !== '') {
            commandHistoryRef.current.push(cmd);
          }
          historyIndexRef.current = commandHistoryRef.current.length;
          cmdBufferRef.current = '';
          if (interactive) {
            // Execute command via backend
            fetch('/api/ai-sdk/terminal', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ command: cmd }),
            })
              .then((res) => res.json())
              .then((data) => {
                if (data.output) {
                  term.write(data.output.replace(/\n/g, '\r\n'));
                } else if (data.error) {
                  term.write(data.error.replace(/\n/g, '\r\n'));
                }
              })
              .catch((err) => {
                term.write(('Error: ' + err.message).replace(/\n/g, '\r\n'));
              })
              .finally(() => {
                term.write('\r\n$ ');
              });
          } else {
            onCommand?.(cmd);
          }
        } else if (domEvent.key === 'Backspace') {
          if (cmdBufferRef.current.length > 0) {
            term.write('\b \b');
            cmdBufferRef.current = cmdBufferRef.current.slice(0, -1);
          }
        } else if (domEvent.key === 'ArrowUp') {
          // Navigate up in command history
          if (
            commandHistoryRef.current.length > 0 &&
            historyIndexRef.current > 0
          ) {
            historyIndexRef.current -= 1;
            const historyCmd =
              commandHistoryRef.current[historyIndexRef.current];
            // Clear current line and reprint prompt and command
            term.write('\r\x1b[K');
            term.write('$ ' + historyCmd);
            cmdBufferRef.current = historyCmd;
          }
        } else if (domEvent.key === 'ArrowDown') {
          // Navigate down in command history
          if (
            commandHistoryRef.current.length > 0 &&
            historyIndexRef.current < commandHistoryRef.current.length - 1
          ) {
            historyIndexRef.current += 1;
            const historyCmd =
              commandHistoryRef.current[historyIndexRef.current];
            term.write('\r\x1b[K');
            term.write('$ ' + historyCmd);
            cmdBufferRef.current = historyCmd;
          } else {
            // If at the end, clear the line
            historyIndexRef.current = commandHistoryRef.current.length;
            term.write('\r\x1b[K');
            term.write('$ ');
            cmdBufferRef.current = '';
          }
        } else if (printable) {
          term.write(key);
          cmdBufferRef.current += key;
        }
      });
      termRef.current = term;
    }
    return () => {
      termRef.current?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update static display when content changes (non-interactive)
  useEffect(() => {
    const term = termRef.current;
    if (term && !interactive) {
      term.clear();
      if (content) {
        term.write(content + '\r\n');
      }
    }
  }, [content, interactive]);

  return (
    <Card className={className}>
      <CardHeader className="flex justify-end">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (termRef.current) {
              termRef.current.clear();
            }
          }}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div ref={containerRef} className="w-full" />
      </CardContent>
    </Card>
  );
};
