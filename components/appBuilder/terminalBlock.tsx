import React, { useEffect, useRef } from 'react';
import './terminalBlock.module.css';

interface AppBuilderTerminalBlockProps {
  content: string;
  className?: string;
}

export const AppBuilderTerminalBlock: React.FC<AppBuilderTerminalBlockProps> = ({ content, className = '' }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [content]);

  return (
    <div
      ref={scrollRef}
      className={
        'appbuilder-terminalblock whitespace-pre-wrap break-words flex-1 overflow-auto bg-black text-green-400 text-xs font-mono rounded ' +
        (className || '')
      }
    >
      {content}
    </div>
  );
};
