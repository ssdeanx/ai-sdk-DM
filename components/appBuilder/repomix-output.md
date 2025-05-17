# File Summary

## Purpose
This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
4. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Only files matching these patterns are included: components/appBuilder
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Empty lines have been removed from all files
- Line numbers have been added to the beginning of each line
- Content has been formatted for parsing in markdown style
- Content has been compressed - code blocks are separated by ⋮---- delimiter
- Files are sorted by Git change count (files with more changes are at the bottom)

## Additional Info

# Directory Structure
```
components/appBuilder/appBuilderContainer.tsx
components/appBuilder/canvasDisplay.tsx
components/appBuilder/chatBar.tsx
components/appBuilder/chatinputMessage.tsx
components/appBuilder/codeBlock.module.css
components/appBuilder/codeBlock.tsx
components/appBuilder/FileTree.tsx
components/appBuilder/terminalBlock.module.css
components/appBuilder/terminalBlock.tsx
```

# Files

## File: components/appBuilder/chatinputMessage.tsx
```typescript
import React, { useState, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
interface ChatInputMessageProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}
⋮----
const handleSend = (e: React.FormEvent) =>
⋮----
onChange=
```

## File: components/appBuilder/codeBlock.module.css
```css
.appbuilder-codeblock {
```

## File: components/appBuilder/FileTree.tsx
```typescript
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { ChevronDown, ChevronRight, FileText, Folder, Plus, Trash2, Edit2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
export interface FileNode {
  name: string;
  path: string;
  isDir: boolean;
  children?: FileNode[];
}
interface FileTreeProps {
  rootPath?: string;
  onFileSelect?: (file: FileNode) => void;
  className?: string;
}
// Helper to fetch file tree from API
async function fetchFileTree(path = ''): Promise<FileNode[]>
⋮----
// API returns { files: [...] }
⋮----
// File/folder CRUD helpers
async function createFileOrFolder(path: string, isDir: boolean)
async function renameFileOrFolder(oldPath: string, newPath: string)
async function deleteFileOrFolder(path: string)
const getIndentClass = (level: number) => `pl-$
⋮----
// Keyboard navigation (basic)
⋮----
const handleKeyDown = (e: KeyboardEvent) =>
⋮----
// Context menu close on click outside
⋮----
const handleClick = (e: MouseEvent) =>
⋮----
className=
⋮----
<Button variant="ghost" size="sm" onClick=
```

## File: components/appBuilder/terminalBlock.module.css
```css
.appbuilder-terminalblock {
```

## File: components/appBuilder/appBuilderContainer.tsx
```typescript
// components/appBuilder/appBuilderContainer.tsx
import React, { useState } from 'react'
import { ChatBar } from './chatBar'
import { CanvasDisplay } from './canvasDisplay'
import { Button } from '@/components/ui/button'
import { FileTree } from './FileTree'
import { AppBuilderCodeBlock } from './codeBlock'
import { AppBuilderTerminalBlock } from './terminalBlock'
⋮----
// Combined code editor and canvas view
⋮----
// FileTree refresh
const refreshTree = ()
const handleCanvasChange = (val: string)
// Save file handler
const handleSaveFile = async () =>
// Toolbar: current file & actions
⋮----
setActiveFile(path)
⋮----
{/* Main area: Code editor and Canvas display */}
⋮----
{/* Chat panel */}
⋮----
// Append message to terminal content
setTerminalContent(prev
⋮----
{/* Terminal bottom */}
```

## File: components/appBuilder/codeBlock.tsx
```typescript
import React, { useState, useCallback } from 'react'
import { foldGutter } from '@codemirror/language'
import { indentOnInput } from '@codemirror/language'
import { highlightSelectionMatches } from '@codemirror/search'
import { autocompletion } from '@codemirror/autocomplete'
import { history } from '@codemirror/commands'
import { lintGutter } from '@codemirror/lint'
import { javascript } from '@codemirror/lang-javascript'
import { json } from '@codemirror/lang-json'
import CodeMirror from '@uiw/react-codemirror'
import { vscodeDark } from '@uiw/codemirror-theme-vscode'
import { Copy, Maximize, Minimize } from 'lucide-react'
import { Button } from '@/components/ui/button'
export interface AppBuilderCodeBlockProps {
  code: string
  language?: 'typescript' | 'javascript' | 'json'
  editable?: boolean
  onChange?: (val: string) => void
  className?: string
}
export const AppBuilderCodeBlock: React.FC<AppBuilderCodeBlockProps> = ({
  code,
  language = 'typescript',
  editable = false,
  onChange,
  className = '',
}) =>
⋮----
{/* Toolbar */}
⋮----
{/* CodeMirror Editor */}
```

## File: components/appBuilder/terminalBlock.tsx
```typescript
import React, { useRef, useEffect } from 'react'
import { Terminal } from '@xterm/xterm'
⋮----
import { CanvasAddon } from '@xterm/addon-canvas'
interface AppBuilderTerminalBlockProps {
  /** Initial content to display in the terminal (static mode) */
  content?: string
  className?: string
  /** Callback for command handling in non-interactive mode */
  onCommand?: (cmd: string) => void
  /** Enable interactive terminal mode: user input is sent to backend */
  interactive?: boolean
}
⋮----
/** Initial content to display in the terminal (static mode) */
⋮----
/** Callback for command handling in non-interactive mode */
⋮----
/** Enable interactive terminal mode: user input is sent to backend */
⋮----
export const AppBuilderTerminalBlock: React.FC<AppBuilderTerminalBlockProps> = (
⋮----
// Initialize terminal once
⋮----
// Write initial content
⋮----
// Show prompt in interactive mode
⋮----
// Key handling for interactive or delegated command execution
⋮----
// Execute command via backend
⋮----
// eslint-disable-next-line react-hooks/exhaustive-deps
⋮----
// Update static display when content changes (non-interactive)
```

## File: components/appBuilder/canvasDisplay.tsx
```typescript
import React, { useRef, useEffect, useState } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { autocompletion } from '@codemirror/autocomplete';
import { linter, lintGutter } from '@codemirror/lint';
import { languageId, languageServer, languageServerWithClient } from '@marimo-team/codemirror-languageserver';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
export interface CanvasDisplayProps {
  mode?: 'terminal' | 'canvas' | 'code';
  content?: string;
  className?: string;
  editable?: boolean;
  language?: 'javascript' | 'json' | 'typescript' | 'markdown';
  onChange?: (value: string) => void;
}
⋮----
// Example ESLint linter (stub, replace with real ESLint integration or WASM/worker)
const fakeLinter = linter(() => []); // No diagnostics, placeholder
⋮----
// If already initialized, just update value
⋮----
fakeLinter, // Replace with real ESLint linter for live diagnostics
// For future: lsp({ serverUri: 'ws://localhost:3001' })
⋮----
const handleCopy = async () =>
const handleLangChange = (e: React.ChangeEvent<HTMLSelectElement>) =>
⋮----
if (mode === 'code')
⋮----
// For terminal/canvas, pass content/className only
```

## File: components/appBuilder/chatBar.tsx
```typescript
import React, { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';
import { useChat, Message as AIChatMessage } from '@ai-sdk/react'; // Import useChat and Message type
import { upstashLogger } from '@/lib/memory/upstash/upstash-logger';
// Re-export Message type for external use if needed, or align with AI SDK's type
export type Message = AIChatMessage
export interface ChatBarProps {
  apiEndpoint?: string;
  initialMessages?: Message[];
  modelId?: string; // Note: model, provider, systemPrompt, tools might be configured server-side with AI SDK
  provider?: string;
  systemPrompt?: string;
  tools?: string[];
  className?: string;
  onMessageSend?: (assistantMessage: string, fullResponse?: Message) => void;
}
⋮----
modelId?: string; // Note: model, provider, systemPrompt, tools might be configured server-side with AI SDK
⋮----
// Remove generateId as AI SDK handles IDs
⋮----
apiEndpoint = '/api/ai-sdk/chat', // Default API endpoint for AI SDK
⋮----
// modelId, provider, systemPrompt, tools are typically configured on the API route
// but we can pass them as parameters if the API route supports it.
// For simplicity with useChat, we'll rely on the API route configuration
// or pass them as query parameters/body if the backend is set up for it.
// The useChat hook primarily takes the API endpoint and initial messages.
⋮----
initialMessages: initialMessages as AIChatMessage[], // Cast to AI SDK's Message type
// Additional parameters like model, provider, etc. might need to be passed
// via the body or query parameters depending on your API route implementation.
// useChat's `append` function allows passing options, including body.
// For now, we'll keep it simple and assume the API route handles model/provider config.
⋮----
// onFinish is called when the assistant message is complete
⋮----
// useChat automatically adds error messages to the messages array
⋮----
}, [messages]); // messages state is now managed by useChat
// Modify handleSubmit to use append from useChat
const handleSend = async (e: React.FormEvent | React.KeyboardEvent) =>
⋮----
// useChat's append function sends the user message and handles the assistant response
⋮----
// useChat manages the input state internally, so no need to clear manually here
// setInput(''); // This line is removed
⋮----
{messages.map((m: AIChatMessage, idx: number) => ( // Use AIChatMessage type from useChat
⋮----
value={input} // input state is managed by useChat
onChange={handleInputChange} // handleInputChange is provided by useChat
⋮----
onKeyDown={(e) => { // Changed from onKeyPress to onKeyDown
```
