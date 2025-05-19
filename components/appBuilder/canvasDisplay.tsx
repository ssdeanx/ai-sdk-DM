'use client';

import React, { useRef, useEffect, useState } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { autocompletion } from '@codemirror/autocomplete';
import { linter, lintGutter } from '@codemirror/lint';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';

/**
 * Props for the CanvasDisplay component.
 * @remarks
 * - `mode`: Determines the display mode (code, terminal, or canvas placeholder).
 * - `content`: The code or text content to display.
 * - `editable`: If true, enables editing in code mode.
 * - `language`: The language for syntax highlighting in code mode.
 * - `onChange`: Callback for content changes in code mode.
 */
export interface CanvasDisplayProps {
  mode?: 'terminal' | 'canvas' | 'code';
  content?: string;
  className?: string;
  editable?: boolean;
  language?: 'javascript' | 'json' | 'typescript' | 'markdown';
  onChange?: (value: string) => void;
}

const languageExtensions = {
  javascript: javascript(),
  typescript: javascript({ typescript: true }),
  json: json(),
  markdown: markdown(),
};

const fakeLinter = linter(() => []); // Placeholder for future lint integration

/**
 * Terminal-like display for output or logs.
 */
const TerminalDisplay: React.FC<{ content: string; className?: string }> = ({
  content,
  className,
}) => (
  <pre
    className={
      'whitespace-pre-wrap break-words text-xs bg-black text-green-400 p-2 rounded h-full overflow-auto ' +
      (className || '')
    }
  >
    {content}
  </pre>
);

/**
 * Editable code block using CodeMirror, with language switching and copy.
 */
const EditableCodeBlock: React.FC<{
  value: string;
  editable?: boolean;
  language?: 'javascript' | 'json' | 'typescript' | 'markdown';
  onChange?: (value: string) => void;
  className?: string;
  onLanguageChange?: (
    lang: 'javascript' | 'json' | 'typescript' | 'markdown'
  ) => void;
}> = ({
  value,
  editable = false,
  language = 'javascript',
  onChange,
  className,
  onLanguageChange,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [copied, setCopied] = useState(false);
  const [currentLang, setCurrentLang] = useState<
    'javascript' | 'json' | 'typescript' | 'markdown'
  >(language);

  useEffect(() => {
    setCurrentLang(language);
  }, [language]);

  useEffect(() => {
    if (!editorRef.current) return;
    if (viewRef.current) {
      // If already initialized, just update value
      if (viewRef.current.state.doc.toString() !== value) {
        viewRef.current.dispatch({
          changes: {
            from: 0,
            to: viewRef.current.state.doc.length,
            insert: value,
          },
        });
      }
      return;
    }
    const extensions = [
      basicSetup,
      languageExtensions[currentLang],
      oneDark,
      EditorView.lineWrapping,
      EditorView.editable.of(editable),
      autocompletion(),
      lintGutter(),
      fakeLinter,
      EditorView.updateListener.of((v) => {
        if (v.docChanged && onChange) {
          onChange(v.state.doc.toString());
        }
      }),
    ];
    viewRef.current = new EditorView({
      doc: value,
      extensions,
      parent: editorRef.current,
    });
    return () => {
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
    };
  }, [value, editable, onChange, currentLang]);

  const handleCopy = async () => {
    if (viewRef.current) {
      await navigator.clipboard.writeText(viewRef.current.state.doc.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const handleLangChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lang = e.target.value as
      | 'javascript'
      | 'json'
      | 'typescript'
      | 'markdown';
    setCurrentLang(lang);
    if (onLanguageChange) onLanguageChange(lang);
  };

  return (
    <div
      className={
        'rounded border border-border bg-zinc-950 text-xs font-mono min-h-[200px] max-h-[400px] overflow-auto relative ' +
        (className || '')
      }
    >
      <div className="flex items-center justify-between px-2 py-1 bg-zinc-900 border-b border-border">
        <div className="flex gap-2 items-center">
          <span className="text-xs text-muted-foreground">{currentLang}</span>
          <select
            aria-label="Select language"
            className="bg-zinc-900 text-xs text-white border border-border rounded px-1 py-0.5"
            value={currentLang}
            onChange={handleLangChange}
          >
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="json">JSON</option>
            <option value="markdown">Markdown</option>
          </select>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={handleCopy}>
          <Copy className={copied ? 'text-green-500' : ''} />
        </Button>
      </div>
      <div ref={editorRef} className="w-full h-[180px]" />
    </div>
  );
};

/**
 * Placeholder for canvas mode (future extensibility).
 */
const CanvasPlaceholder: React.FC<{ className?: string }> = ({ className }) => (
  <div
    className={
      'flex items-center justify-center h-full text-muted-foreground ' +
      (className || '')
    }
  >
    Canvas mode coming soon
  </div>
);

const displayModeMap = {
  terminal: TerminalDisplay,
  code: EditableCodeBlock,
  canvas: CanvasPlaceholder,
};

/**
 * Main CanvasDisplay component for AppBuilder.
 * Renders code editor, terminal, or canvas placeholder based on mode.
 * @param props - CanvasDisplayProps
 * @returns React element
 */
export function CanvasDisplay({
  mode = 'terminal',
  content = '',
  className,
  editable = false,
  language = 'javascript',
  onChange,
}: CanvasDisplayProps) {
  if (mode === 'code') {
    return (
      <EditableCodeBlock
        value={content}
        editable={editable}
        language={language}
        onChange={onChange}
        className={className}
      />
    );
  }
  // For terminal/canvas, pass content/className only
  const DisplayComponent = displayModeMap[mode] || TerminalDisplay;
  return <DisplayComponent content={content} className={className} />;
}

export { EditableCodeBlock };
