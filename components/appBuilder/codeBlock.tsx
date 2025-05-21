'use client';

import React, { useState, useCallback, useEffect } from 'react';
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
import { useMemoryProvider } from '@/hooks/use-memory-provider';
import { useSupabaseCrud } from '@/hooks/use-supabase-crud';
import { useSupabaseRealtime } from '@/hooks/use-supabase-realtime';
import { AppCodeBlockSchema as SupabaseAppCodeBlockSchema } from '@/types/supabase';
import { AppCodeBlockSchema as LibsqlAppCodeBlockSchema } from '@/types/libsql';

export interface AppBuilderCodeBlockProps {
  code?: string;
  language?: 'typescript' | 'javascript' | 'json';
  editable?: boolean;
  onChange?: (val: string) => void;
  className?: string;
  appId?: string;
  codeBlockId?: string;
}

export const AppBuilderCodeBlock: React.FC<AppBuilderCodeBlockProps> = ({
  code: codeProp,
  language = 'typescript',
  editable = false,
  onChange,
  className = '',
  appId,
  codeBlockId,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const memoryProviderConfig = useMemoryProvider();
  const dbType: 'supabase' | 'libsql' =
    memoryProviderConfig.provider === 'libsql' ? 'libsql' : 'supabase';
  const AppCodeBlockSchema =
    dbType === 'libsql' ? LibsqlAppCodeBlockSchema : SupabaseAppCodeBlockSchema;

  // Use canonical CRUD hook for app_code_blocks
  const {
    items: codeBlocks,
    loading,
    error,
    fetchAll,
    create,
    update,
  } = useSupabaseCrud({ table: 'app_code_blocks' });

  // Realtime updates for app_code_blocks
  useSupabaseRealtime({
    table: 'app_code_blocks',
    zodSchema: AppCodeBlockSchema,
    event: '*',
    onInsert: fetchAll,
    onUpdate: fetchAll,
    onDelete: fetchAll,
  });

  // Find the code block to display
  const codeBlock = codeBlockId
    ? codeBlocks.find((cb) => cb.id === codeBlockId)
    : appId
      ? codeBlocks.find((cb) => cb.app_id === appId)
      : undefined;

  const [localCode, setLocalCode] = useState<string>(
    codeProp ?? codeBlock?.code ?? ''
  );
  useEffect(() => {
    setLocalCode(codeProp ?? codeBlock?.code ?? '');
  }, [codeProp, codeBlock?.code]);

  const handleFormat = useCallback(async () => {
    try {
      const formatted = await prettier.format(localCode, {
        parser: language === 'json' ? 'json' : 'typescript',
        plugins: language === 'json' ? [] : [parserTypescript],
        singleQuote: true,
        semi: true,
        trailingComma: 'es5',
      });
      setLocalCode(formatted);
      if (onChange) onChange(formatted);
    } catch {
      // TODO: 2025-05-21 - Formatting error occurred. Consider using project logger.
    }
  }, [localCode, language, onChange]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(localCode);
  }, [localCode]);

  const handleSave = useCallback(async () => {
    if (!editable) return;
    if (codeBlock) {
      await update(codeBlock.id, { ...codeBlock, code: localCode });
    } else if (appId) {
      await create({ app_id: appId, code: localCode, language });
    }
    if (onChange) onChange(localCode);
  }, [
    editable,
    codeBlock,
    localCode,
    update,
    create,
    appId,
    language,
    onChange,
  ]);

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
          {editable && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              className="ml-2"
              disabled={loading}
            >
              Save
            </Button>
          )}
        </div>
      </div>
      {/* CodeMirror Editor */}
      <CodeMirror
        value={localCode}
        height={isFullscreen ? 'calc(100vh - 3rem)' : '300px'}
        theme={vscodeDark}
        editable={editable}
        extensions={ext}
        onChange={(val) => {
          setLocalCode(val);
          if (onChange) onChange(val);
        }}
      />
      {error && <div className="text-red-500 text-xs p-2">{error.message}</div>}
    </div>
  );
};
