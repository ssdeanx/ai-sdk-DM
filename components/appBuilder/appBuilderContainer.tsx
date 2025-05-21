'use client';

// components/appBuilder/appBuilderContainer.tsx
import React, { useState } from 'react';
import { ChatBar } from './chatBar';
import { CanvasDisplay } from './canvasDisplay';
import { Button } from '@/components/ui/button';
import { FileTree } from './FileTree';
import { AppBuilderCodeBlock } from './codeBlock';
import { AppBuilderTerminalBlock } from './terminalBlock';
import { Card, CardContent } from '@/components/ui/card';
import { useSupabaseCrud } from '@/hooks/use-supabase-crud';

interface AppBuilderContainerProps {
  initialCode?: string;
  onSave?: (newCode: string) => Promise<void>;
}

export function AppBuilderContainer({
  initialCode = '',
  onSave,
}: AppBuilderContainerProps) {
  // Combined code editor and canvas view
  const [canvasContent, setCanvasContent] = useState(initialCode);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [terminalContent, setTerminalContent] = useState(
    'Welcome to the AI SDK Terminal!'
  );
  const [fileTreeKey, setFileTreeKey] = useState(0);

  // FileTree refresh
  const refreshTree = () => setFileTreeKey((k) => k + 1);

  const handleCanvasChange = (val: string) => setCanvasContent(val);

  // Initialize useSupabaseCrud
  const { update } = useSupabaseCrud({ table: 'files' });

  // Save file handler
  const handleSaveFile = async () => {
    try {
      if (activeFile) {
        // If a file is selected, update it using the file CRUD route
        await update(activeFile, { content: canvasContent });
        setTerminalContent(`Saved: ${activeFile}`);
      } else if (onSave) {
        // If no file is selected, use the onSave handler to update the app code via the apps route
        await onSave(canvasContent);
        setTerminalContent('Saved app code');
      } else {
        setTerminalContent('No file selected and no onSave handler provided.');
      }
    } catch (err) {
      setTerminalContent(
        'Error saving file: ' +
          (err instanceof Error ? err.message : String(err))
      );
    }
  };

  // Toolbar: current file & actions
  const Toolbar = () => (
    <div className="flex items-center justify-between p-2 border-b bg-background">
      <div>
        {activeFile ? (
          <span className="font-mono">Editing: {activeFile}</span>
        ) : (
          <span>No file selected</span>
        )}
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setCanvasContent('');
          }}
        >
          Clear
        </Button>
        <Button size="sm" onClick={handleSaveFile} disabled={!activeFile}>
          Save
        </Button>
        <Button size="sm" variant="ghost" onClick={refreshTree}>
          Refresh Files
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-full w-full">
      {/* Sidebar with FileTree wrapped in a Card */}
      <Card className="w-60 h-full border-r bg-background">
        <CardContent className="p-2">
          <FileTree
            key={fileTreeKey}
            onFileSelect={(file) => {
              setActiveFile(file.id);
            }}
            onRefresh={refreshTree}
          />
        </CardContent>
      </Card>
      <div className="flex-1 flex flex-col">
        <Toolbar />
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col p-2 overflow-auto gap-4">
            <AppBuilderCodeBlock
              code={canvasContent}
              editable
              onChange={handleCanvasChange}
              className="flex-1"
            />
            <CanvasDisplay
              content={canvasContent}
              editable
              onChange={handleCanvasChange}
              className="h-40"
            />
          </div>
          {/* Chat panel wrapped in a Card */}
          <Card className="w-80 h-full border-l bg-background">
            <CardContent className="p-2 flex-1">
              <ChatBar
                onMessageSend={(msg) => {
                  setTerminalContent((prev) => prev + '\n' + msg);
                }}
                className="flex-1"
              />
            </CardContent>
          </Card>
        </div>
        {/* Terminal bottom */}
        <div className="h-48 border-t bg-black">
          <AppBuilderTerminalBlock
            content={terminalContent}
            interactive
            onCommand={(cmd) => {
              fetch('/api/ai-sdk/terminal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command: cmd }),
              })
                .then((r) => r.json())
                .then((data) => {
                  setTerminalContent(data.output || data.error || '');
                });
            }}
            className="h-full"
          />
        </div>
      </div>
    </div>
  );
}
