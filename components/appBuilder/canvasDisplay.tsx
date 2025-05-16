import React from 'react';

export interface CanvasDisplayProps {
  mode?: 'terminal' | 'canvas' | 'code';
  content?: string;
  className?: string;
}

export function CanvasDisplay({ mode = 'terminal', content = '', className }: CanvasDisplayProps) {
  return (
    <div className={`border rounded-md bg-black text-white p-2 font-mono min-h-[200px] ${className || ''}`}>
      <div className="text-xs mb-1 opacity-60">{mode.toUpperCase()} DISPLAY</div>
      <pre className="whitespace-pre-wrap break-words">{content}</pre>
    </div>
  );
}

export default CanvasDisplay;
