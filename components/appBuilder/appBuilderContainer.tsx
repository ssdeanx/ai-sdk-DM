'use client';

// components/appBuilder/appBuilderContainer.tsx
import React, { useState } from 'react'
import { ChatBar } from './chatBar'
import { CanvasDisplay } from './canvasDisplay'
import { Button } from '@/components/ui/button'
import { FileTree } from './FileTree'
import { AppBuilderCodeBlock } from './codeBlock'
import { AppBuilderTerminalBlock } from './terminalBlock'

export function AppBuilderContainer() {
  // Combined code editor and canvas view
  const [canvasContent, setCanvasContent] = useState('')
  const [activeFile, setActiveFile] = useState<string | null>(null)
  const [terminalContent, setTerminalContent] = useState('Welcome to the AI SDK Terminal!')
  const [fileTreeKey, setFileTreeKey] = useState(0)

  // FileTree refresh
  const refreshTree = () => setFileTreeKey((k) => k + 1)

  const handleCanvasChange = (val: string) => setCanvasContent(val)

  // Save file handler
  const handleSaveFile = async () => {
    if (!activeFile) return
    try {
      const res = await fetch('/api/ai-sdk/files', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: activeFile, content: canvasContent }),
      })
      if (!res.ok) throw new Error('Save failed')
      setTerminalContent(`Saved: ${activeFile}`)
    } catch (err) {
      setTerminalContent('Error saving file: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  // Toolbar: current file & actions
  const Toolbar = () => (
    <div className="flex items-center justify-between p-2 border-b bg-background">
      <div>{activeFile ? <span className="font-mono">Editing: {activeFile}</span> : <span>No file selected</span>}</div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => { setCanvasContent(''); /* TODO: clear image canvas if implemented */ }}>Clear</Button>
        <Button size="sm" onClick={handleSaveFile} disabled={!activeFile}>Save</Button>
        <Button size="sm" variant="ghost" onClick={refreshTree}>Refresh Files</Button>
      </div>
    </div>
  )

  return (
    <div className="flex h-full w-full">
      <div className="w-60 border-r bg-background">
        <FileTree key={fileTreeKey} onFileSelect={({ path }) => {
          setActiveFile(path)
        }}
        />
      </div>
      <div className="flex-1 flex flex-col">
        <Toolbar />
        {/* Main area: Code editor and Canvas display */}
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col p-2 overflow-auto gap-4">
            <AppBuilderCodeBlock code={canvasContent} editable onChange={handleCanvasChange} className="flex-1" />
            <CanvasDisplay content={canvasContent} editable onChange={handleCanvasChange} className="h-40" />
          </div>
          {/* Chat panel */}
          <div className="w-80 border-l bg-background flex flex-col">
            <ChatBar onMessageSend={(msg) => {
              // Append message to terminal content
              setTerminalContent(prev => prev + '\n' + msg)
            }} className="flex-1" />
          </div>
        </div>
        {/* Terminal bottom */}
        <div className="h-48 border-t bg-black">
          <AppBuilderTerminalBlock content={terminalContent} interactive onCommand={(cmd) => {
            fetch('/api/ai-sdk/terminal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ command: cmd }) })
              .then(r => r.json())
              .then(data => setTerminalContent(data.output || data.error || ''))
          }} className="h-full" />
        </div>
      </div>
    </div>
  )
}
