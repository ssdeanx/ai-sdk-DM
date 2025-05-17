import React, { useEffect, useRef } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { oneDark } from '@codemirror/theme-one-dark';
import './codeBlock.module.css';

interface AppBuilderCodeBlockProps {
  code: string;
  language?: 'typescript' | 'json';
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
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;
    if (viewRef.current) {
      viewRef.current.destroy();
      viewRef.current = null;
    }
    const extensions = [
      basicSetup,
      oneDark,
      language === 'json' ? json() : javascript(),
      EditorView.editable.of(editable),
    ];
    viewRef.current = new EditorView({
      doc: code,
      extensions: [
        ...extensions,
        EditorView.updateListener.of((v) => {
          if (v.docChanged && editable && onChange) {
            onChange(v.state.doc.toString());
          }
        }),
      ],
      parent: editorRef.current,
    });
    return () => {
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
    };
    // eslint-disable-next-line
  }, [code, language, editable]);

  return (
    <div
      ref={editorRef}
      className={
        'appbuilder-codeblock rounded border border-border bg-zinc-950 text-xs font-mono min-h-[200px] max-h-[400px] overflow-auto ' +
        (className || '')
      }
    />
  );
};
