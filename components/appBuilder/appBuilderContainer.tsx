// components/appBuilder/appBuilderContainer.tsx
import React, { useState, useEffect } from 'react';
import { ChatBar } from './chatBar';
import { CanvasDisplay } from './canvasDisplay';
import { Button } from '@/components/ui/button';
import { FileTree } from './FileTree';
import { AppBuilderCodeBlock } from './codeBlock';
import { AppBuilderTerminalBlock } from './terminalBlock';

export function AppBuilderContainer() {
  const [canvasMode, setCanvasMode] = useState<'terminal' | 'canvas' | 'code'>('code');
  const [canvasContent, setCanvasContent] = useState<string>('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [terminalContent, setTerminalContent] = useState<string>('Welcome to the AI SDK Terminal!');
  const [fileTreeKey, setFileTreeKey] = useState(0); // for FileTree refresh
  const [commandInput, setCommandInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Refresh FileTree (after CRUD)
  const refreshFileTree = () => setFileTreeKey((k) => k + 1);

  // Function to analyze AI message and update canvas display
  const handleAssistantMessage = (assistantMessage: string) => {
    if (assistantMessage.includes('```typescript') || assistantMessage.includes('```javascript') || assistantMessage.includes('```json')) {
      setCanvasMode('code');
      const codeMatch = assistantMessage.match(/```(typescript|javascript|json)\n([\s\S]*?)```/);
      if (codeMatch && codeMatch[2]) {
        setCanvasContent(codeMatch[2].trim());
      } else {
        setCanvasContent(assistantMessage);
      }
    } else if (assistantMessage.includes('$ ') || assistantMessage.includes('> ')) {
      setCanvasMode('terminal');
      setTerminalContent(assistantMessage);
    } else {
      setCanvasMode('terminal');
      setTerminalContent(assistantMessage);
    }
  };

  const handleClearCanvas = () => {
    setCanvasContent('');
    setCanvasMode('code');
  };

  // Save file handler
  const handleSaveFile = async () => {
    if (!activeFile) return;
    try {
      const res = await fetch('/api/ai-sdk/files', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: activeFile, content: canvasContent }),
      });
      if (!res.ok) throw new Error('Failed to save file');
      setTerminalContent(`Saved: ${activeFile}`);
    } catch (err) {
      setTerminalContent('Error saving file: ' + (err instanceof Error ? err.message : String(err)));
      // Log error
      try {
        const logger = (await import('@/lib/memory/upstash/upstash-logger')).upstashLogger;
        logger.error('file-save', 'Save error', err instanceof Error ? err : { error: String(err) });
      } catch {}
    }
  };

  // Canvas onChange handler (only for editable mode)
  const handleCanvasChange = (val: string) => {
    setCanvasContent(val);
  };

  // File open handler
  const handleFileSelect = async (file: { path: string; isDir: boolean }) => {
    if (!file.isDir) {
      setActiveFile(file.path);
      // Fetch file content from API and setCanvasContent
      try {
        const res = await fetch(`/api/ai-sdk/files?path=${encodeURIComponent(file.path)}`);
        if (!res.ok) throw new Error('Failed to fetch file content');
        const data = await res.json();
        if (typeof data.content === 'string') {
          setCanvasContent(data.content);
          setCanvasMode('code');
        }
      } catch (err) {
        // Optionally: show error in terminalContent
        setTerminalContent('Error loading file: ' + (err instanceof Error ? err.message : String(err)));
        setCanvasContent('');
      }
    }
  };

  // Terminal command execution
  const handleTerminalCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = commandInput.trim();
    if (!cmd) return;
    setCommandHistory((h) => [...h, cmd]);
    setHistoryIndex(-1);
    setTerminalContent((prev) => prev + '\n> ' + cmd);
    setCommandInput('');
    try {
      const res = await fetch('/api/ai-sdk/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd }),
      });
      const data = await res.json();
      if (data.output) {
        setTerminalContent((prev) => prev + '\n' + data.output);
      } else if (data.error) {
        setTerminalContent((prev) => prev + '\n' + data.error);
      }
    } catch (err) {
      setTerminalContent((prev) => prev + '\nError running command: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Terminal input history navigation
  const handleTerminalInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(newIndex);
      setCommandInput(commandHistory[newIndex] || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      const newIndex = historyIndex === -1 ? -1 : Math.min(commandHistory.length - 1, historyIndex + 1);
      setHistoryIndex(newIndex);
      setCommandInput(newIndex === -1 ? '' : commandHistory[newIndex] || '');
    }
  };

  // Ensure activeFile is always used (fix unused warning)
  useEffect(() => {
    // Optionally, highlight active file in FileTree or show file path in UI
  }, [activeFile]);

  return (
    <div className="flex h-full w-full">
      {/* Sidebar: File Tree */}
      {sidebarOpen && (
        <div className="flex flex-col h-full w-56 bg-muted border-r">
          <div className="flex items-center justify-between p-2 border-b">
            <span className="font-bold text-lg">Files</span>
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
              <span className="sr-only">Close sidebar</span>×
            </Button>
          </div>
          <FileTree key={fileTreeKey} onFileSelect={handleFileSelect} />
        </div>
      )}
      {/* Main area: Code/Canvas and Chat */}
      <div className="flex-1 flex flex-col h-full">
        <div className="flex-1 flex flex-row overflow-hidden">
          {/* Main code/canvas area */}
          <div className="flex-1 flex flex-col h-full">
            <div className="mb-2 flex justify-between gap-2 p-2 items-center">
              <div className="text-xs text-muted-foreground truncate max-w-[60%]">
                {activeFile ? <span>Editing: <span className="font-mono">{activeFile}</span></span> : <span>No file selected</span>}
              </div>
              <div className="flex gap-2">
                <Button onClick={handleClearCanvas} variant="outline" size="sm">Clear</Button>
                <Button onClick={handleSaveFile} variant="default" size="sm" disabled={!activeFile}>Save</Button>
                <Button onClick={refreshFileTree} variant="ghost" size="sm">Refresh Files</Button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-2">
              {/* Use AppBuilderCodeBlock for code, AppBuilderTerminalBlock for terminal */}
              {canvasMode === 'code' ? (
                <AppBuilderCodeBlock
                  language={activeFile?.endsWith('.json') ? 'json' : 'typescript'}
                  code={canvasContent}
                />
              ) : canvasMode === 'terminal' ? (
                <AppBuilderTerminalBlock content={terminalContent} />
              ) : (
                <CanvasDisplay
                  mode={canvasMode}
                  content={canvasContent}
                  language={activeFile?.endsWith('.json') ? 'json' : 'typescript'}
                  editable={!!activeFile && (canvasMode as string) === 'code'}
                  onChange={handleCanvasChange}
                />
              )}
            </div>
          </div>
          {/* Chat bar as a right panel */}
          <div className="w-96 border-l bg-background flex flex-col">
            <ChatBar onMessageSend={handleAssistantMessage} />
          </div>
        </div>
        {/* Terminal at the bottom */}
        <div className="h-40 border-t bg-black text-green-400 text-xs font-mono overflow-auto p-2 flex flex-col">
          <AppBuilderTerminalBlock content={terminalContent} />
          <form className="flex gap-2 mt-2" onSubmit={handleTerminalCommand}>
            <input
              className="flex-1 bg-zinc-900 border border-border rounded px-2 py-1 text-xs text-green-300 font-mono outline-none"
              placeholder="Type a command and press Enter..."
              value={commandInput}
              onChange={e => setCommandInput(e.target.value)}
              onKeyDown={handleTerminalInputKeyDown}
              autoComplete="off"
            />
            <Button type="submit" size="sm" variant="secondary">Run</Button>
          </form>
        </div>
      </div>
    </div>
  );
}
