import React from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';

export interface CanvasDisplayProps {
  mode?: 'terminal' | 'canvas' | 'code';
  content?: string;
  className?: string;
}

// Define components or rendering logic for each mode
const TerminalDisplay: React.FC<{ content: string }> = ({ content }) => (
  <pre className="whitespace-pre-wrap break-words">{content}</pre>
);

const CodeDisplay: React.FC<{ content: string }> = ({ content }) => (
  <CodeMirror
    value={content}
    extensions={[javascript(), json()]} // Add relevant language extensions
    theme={vscodeDark} // Use a theme
    editable={false} // Make it read-only for display
    basicSetup={{
      lineNumbers: true,
      foldGutter: true,
      drawSelection: false,
      dropCursor: false,
      allowMultipleSelections: false,
      indentOnInput: false,
      syntaxHighlighting: true,
      bracketMatching: true,
      closeBrackets: true,
      autocompletion: false,
      rectangularSelection: false,
      crosshairCursor: false,
      highlightActiveLine: false,
      highlightActiveLineGutter: false,
    }}
    style={{
      fontSize: '0.875rem', // text-sm
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', // font-mono
    }}
  />
);

const CanvasPlaceholder: React.FC = () => (
  <div className="flex items-center justify-center h-full text-gray-500">Canvas content goes here</div>
);

// Map modes to their respective display components/logic
const displayModeMap: Record<string, React.FC<any>> = {
  terminal: TerminalDisplay,
  code: CodeDisplay,
  canvas: CanvasPlaceholder, // Use a placeholder for now
};

export function CanvasDisplay({ mode = 'terminal', content = '', className }: CanvasDisplayProps) {
  const DisplayComponent = displayModeMap[mode] || TerminalDisplay; // Default to TerminalDisplay

  return (
    <div className={`border rounded-md bg-black text-white p-2 font-mono min-h-[200px] ${className || ''}`}>
      <div className="text-xs mb-1 opacity-60">{mode.toUpperCase()} DISPLAY</div>
      {/* CodeMirror handles its own padding/styling, so we might adjust the container padding */}
      <div className={mode === 'code' ? '' : 'flex-1 overflow-y-auto'}>
         <DisplayComponent content={content} />
      </div>
    </div>
  );
}

export default CanvasDisplay;
