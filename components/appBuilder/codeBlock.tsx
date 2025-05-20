'use client';

import React, { useState, useCallback } from 'react';
import { foldGutter } from '@codemirror/language';
import { indentOnInput } from '@codemirror/language';
import { highlightSelectionMatches } from '@codemirror/search';
import { autocompletion } from '@codemirror/autocomplete';
import { history } from '@codemirror/commands';
import { lintGutter } from '@codemirror/lint';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import CodeMirror from '@uiw/react-codemirror';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { Copy, Maximize, Minimize, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import prettier from 'prettier/standalone';
import parserTypescript from 'prettier/parser-typescript';

export interface AppBuilderCodeBlockProps {
  code: string;
  language?: 'typescript' | 'javascript' | 'json';
  editable?: boolean;
  onChange?: (val: string) => void;
  className?: string;
}

export const AppBuilderCodeBlock: React.FC<AppBuilderCodeBlockProps> = ({
  code,
  language = 'typescript',
  editable = false,
  onChange,
  className = '',
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleFormat = useCallback(async () => {
    try {
      const formatted = await prettier.format(code, {
        parser: language === 'json' ? 'json' : 'typescript',
        plugins: language === 'json' ? [] : [parserTypescript],
        singleQuote: true,
        semi: true,
        trailingComma: 'es5',
      });
      if (onChange) {
        onChange(formatted);
      }
    } catch (error) {
      console.error('Formatting error: ', error);
    }
  }, [code, language, onChange]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
  }, [code]);

  const ext = [
    foldGutter(),
    indentOnInput(),
    highlightSelectionMatches(),
    autocompletion(),
    history(),
    lintGutter(),
    javascript(),
  ];
  if (language === 'json') ext.push(json());

  return (
    <div
      className={`relative flex flex-col bg-zinc-900 border border-zinc-700 rounded overflow-hidden shadow ${className} ${
        isFullscreen ? 'fixed inset-0 z-50' : ''
      }`}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-zinc-800 px-4 py-2">
        <span className="text-xs font-semibold text-zinc-200 uppercase">
          {language}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopy}
            className="text-zinc-300 hover:text-white"
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleFormat}
            className="text-zinc-300 hover:text-white"
          >
            <Code className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsFullscreen((f) => !f)}
            className="text-zinc-300 hover:text-white"
          >
            {isFullscreen ? (
              <Minimize className="h-4 w-4" />
            ) : (
              <Maximize className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* CodeMirror Editor */}
      <CodeMirror
        value={code}
        height={isFullscreen ? 'calc(100vh - 3rem)' : '300px'}
        theme={vscodeDark}
        editable={editable}
        extensions={ext}
        onChange={onChange}
      />
    </div>
  );
};
