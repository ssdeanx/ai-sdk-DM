'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { z } from 'zod';
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { File as SupabaseFile, FileSchema as SupabaseFileSchema } from '@/types/supabase';
import { File as LibsqlFile, FileSchema as LibsqlFileSchema } from '@/types/libsql';

/**
 * FileNode is a UI-only type for tree rendering, derived from canonical File.
 */
export type CanonicalFile = SupabaseFile | LibsqlFile;
export type CanonicalFileSchema = typeof SupabaseFileSchema | typeof LibsqlFileSchema;
export interface FileNode extends CanonicalFile {
  isDir: boolean;
  children?: FileNode[];
}

const getIndentClass = (level: number) => `pl-${level * 4}`;

const FileTreeNode: React.FC<{
  node: FileNode;
  level: number;
  onFileSelect?: (file: CanonicalFile) => void;
  onRefresh?: () => void;
  create: (data: Partial<CanonicalFile>) => Promise<CanonicalFile>;
  update: (id: string, data: Partial<CanonicalFile>) => Promise<CanonicalFile>;
  remove: (id: string) => Promise<CanonicalFile | void>;
}> = ({ node, level, onFileSelect, onRefresh, create, update, remove }) => {
  const [expanded, setExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(node.name);
  const [creating, setCreating] = useState<null | 'file' | 'folder'>(null);
  const [newChildName, setNewChildName] = useState('');
  const hasChildren = node.isDir && node.children && node.children.length > 0;

  return (
    <div className="relative">
      <div
        className={cn(
          'flex items-center cursor-pointer select-none py-0.5 px-2 rounded hover:bg-accent group',
          getIndentClass(level)
        )}
        tabIndex={0}
        onClick={() => {
          if (node.isDir) setExpanded((e) => !e);
          else if (onFileSelect) onFileSelect(node);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          setShowMenu(true);
        }}
      >
        {node.isDir ? (
          expanded ? (
            <ChevronDown className="w-4 h-4 mr-1" />
          ) : (
            <ChevronRight className="w-4 h-4 mr-1" />
          )
        ) : (
          <FileText className="w-4 h-4 mr-1 opacity-60" />
        )}
        {node.isDir ? <Folder className="w-4 h-4 mr-1 text-blue-500" /> : null}
        {renaming ? (
          <>
            <label className="sr-only" htmlFor={`rename-input-${node.id}`}>
              Rename file or folder
            </label>
            <input
              id={`rename-input-${node.id}`}
              className="bg-transparent border-b border-border text-xs font-mono px-1 w-24 outline-none"
              value={newName}
              autoFocus
              placeholder="Rename..."
              onChange={(e) => setNewName(e.target.value)}
              onBlur={() => setRenaming(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  update(node.id, { name: newName }).then(() => {
                    setRenaming(false);
                    if (onRefresh) onRefresh();
                  });
                }
                if (e.key === 'Escape') {
                  setRenaming(false);
                  setNewName(node.name);
                }
              }}
            />
          </>
        ) : (
          <span className={node.isDir ? 'font-semibold' : ''}>{node.name}</span>
        )}
        <span className="ml-auto flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e) => {
              e.stopPropagation();
              setRenaming(true);
            }}
          >
            <Edit2 className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e) => {
              e.stopPropagation();
              setCreating('file');
            }}
          >
            <Plus className="w-3 h-3" />
          </Button>
          {node.isDir && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={(e) => {
                e.stopPropagation();
                setCreating('folder');
              }}
            >
              <Folder className="w-3 h-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e) => {
              e.stopPropagation();
              remove(node.id).then(() => {
                if (onRefresh) onRefresh();
              });
            }}
          >
            <Trash2 className="w-3 h-3 text-red-500" />
          </Button>
        </span>
      </div>
      {showMenu && (
        <div className="absolute z-10 bg-popover border border-border rounded shadow p-1 mt-1 right-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setRenaming(true);
              setShowMenu(false);
            }}
          >
            Rename
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setCreating('file');
              setShowMenu(false);
            }}
          >
            New File
          </Button>
          {node.isDir && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCreating('folder');
                setShowMenu(false);
              }}
            >
              New Folder
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              remove(node.id).then(() => {
                if (onRefresh) onRefresh();
              });
              setShowMenu(false);
            }}
          >
            Delete
          </Button>
        </div>
      )}
      {creating && (
        <div className="flex items-center gap-1 mt-1 ml-6">
          <input
            className="bg-transparent border-b border-border text-xs font-mono px-1 w-24 outline-none"
            value={newChildName}
            autoFocus
            placeholder={creating === 'file' ? 'New file...' : 'New folder...'}
            onChange={(e) => setNewChildName(e.target.value)}
            onBlur={() => setCreating(null)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                create({
                  name: newChildName,
                  parent_id: node.id,
                  type: creating === 'folder' ? 'folder' : 'file',
                }).then(() => {
                  setCreating(null);
                  setNewChildName('');
                  if (onRefresh) onRefresh();
                });
              }
              if (e.key === 'Escape') {
                setCreating(null);
                setNewChildName('');
              }
            }}
          />
        </div>
      )}
      {hasChildren &&
        expanded &&
        node.children &&
        node.children.map((child) => (
          <FileTreeNode
            key={child.id}
            node={child}
            level={level + 1}
            onFileSelect={onFileSelect}
            onRefresh={onRefresh}
            create={create}
            update={update}
            remove={remove}
          />
        ))}
    </div>
  );
};

/**
 * Props for FileTree component.
 * @property rootPath - Optional root path for the file tree.
 * @property onFileSelect - Callback when a file is selected.
 * @property className - Optional className for styling.
 * @property onRefresh - Optional callback to trigger refresh.
 * @property dbType - Backend selection for CRUD operations.
 */
export interface FileTreeProps {
  rootPath?: string;
  onFileSelect?: (file: CanonicalFile) => void;
  className?: string;
  onRefresh?: () => void;
  dbType?: 'supabase' | 'libsql';
}

const getFileSchema = (dbType: 'supabase' | 'libsql') =>
  dbType === 'libsql' ? LibsqlFileSchema : SupabaseFileSchema;

export const FileTree: React.FC<FileTreeProps> = ({
  rootPath = '',
  onFileSelect,
  className,
  onRefresh,
  dbType = 'supabase',
}) => {
  const [files, setFiles] = useState<CanonicalFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const internalRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);
  const handleRefresh = onRefresh ? onRefresh : internalRefresh;
  const FileSchema = getFileSchema(dbType);

  // Fetch all files from the correct API route
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ai-sdk/crud/files?dbType=${dbType}`);
      if (!res.ok) throw new Error('Failed to fetch files');
      const data = await res.json();
      // Validate array of files
      const parsed = z.array(FileSchema).safeParse(data);
      if (!parsed.success) throw new Error('Invalid file data');
      setFiles(parsed.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [dbType]);

  // CRUD operations
  const create = async (data: Partial<CanonicalFile>) => {
    const res = await fetch(`/api/ai-sdk/crud/files?dbType=${dbType}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create file');
    const file = await res.json();
    const parsed = FileSchema.safeParse(file);
    if (!parsed.success) throw new Error('Invalid file data');
    await fetchAll();
    return parsed.data;
  };
  const update = async (id: string, data: Partial<CanonicalFile>) => {
    const res = await fetch(`/api/ai-sdk/crud/files/${id}?dbType=${dbType}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update file');
        <Button variant="ghost" size="icon-sm" onClick={handleRefresh}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>
      {loading && (
        <div className="text-xs text-muted-foreground p-2">Loading...</div>
      )}
      {error && <div className="text-xs text-red-500 p-2">{String(error)}</div>}
      <div className="py-1">
        {tree.map((node) => (
          <FileTreeNode
            key={node.id}
            node={node}
            level={0}
            onFileSelect={onFileSelect}
            onRefresh={handleRefresh}
            create={create}
            update={update}
            remove={remove}
          />
        ))}
      </div>
    </div>
  );
};
