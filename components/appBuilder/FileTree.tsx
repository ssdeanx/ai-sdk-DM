'use client';
import React, { useState, useCallback } from 'react';
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
import {
  File as SupabaseFile,
  FileSchema as SupabaseFileSchema,
} from '@/types/supabase';
import {
  File as LibsqlFile,
  FileSchema as LibsqlFileSchema,
} from '@/types/libsql';
import { useMemoryProvider } from '@/hooks/use-memory-provider';
import { useSupabaseCrud } from '@/hooks/use-supabase-crud';
import { useSupabaseRealtime } from '@/hooks/use-supabase-realtime';

/**
 * FileNode is a UI-only type for tree rendering, derived from canonical File.
 */
export type CanonicalFile = SupabaseFile | LibsqlFile;
export type CanonicalFileSchema =
  | typeof SupabaseFileSchema
  | typeof LibsqlFileSchema;
export interface FileNode {
  isDir: boolean;
  children?: FileNode[];
  id: string;
  name: string;
  path: string;
  content?: string;
  created_at?: string;
  updated_at?: string;
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
          else if (onFileSelect)
            onFileSelect({
              id: node.id,
              app_id: '',
              name: node.name,
              type: 'file',
              created_at: node.created_at || new Date().toISOString(),
              updated_at: node.updated_at || new Date().toISOString(),
              parent_id: null,
              content: node.content,
            });
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
 * @property onFileSelect - Callback when a file is selected.
 * @property className - Optional className for styling.
 * @property onRefresh - Optional callback to trigger refresh.
 * @property dbType - Backend selection for CRUD operations.
 */
export interface FileTreeProps {
  onFileSelect?: (file: CanonicalFile) => void;
  className?: string;
  onRefresh?: () => void;
  dbType?: 'supabase' | 'libsql';
}

const getFileSchema = (dbType: 'supabase' | 'libsql') =>
  dbType === 'libsql' ? LibsqlFileSchema : SupabaseFileSchema;

export const FileTree: React.FC<FileTreeProps> = ({
  onFileSelect,
  className,
  onRefresh,
  dbType,
}) => {
  const memoryProviderConfig = useMemoryProvider();
  const effectiveDbType: 'supabase' | 'libsql' =
    dbType ||
    (memoryProviderConfig.provider === 'libsql' ? 'libsql' : 'supabase');
  const FileSchema = getFileSchema(effectiveDbType);

  const {
    items: files,
    loading,
    error,
    fetchAll,
    create,
    update,
    remove,
  } = useSupabaseCrud({ table: 'files' });

  useSupabaseRealtime({
    table: 'files',
    zodSchema: FileSchema,
    event: '*',
    onInsert: fetchAll,
    onUpdate: fetchAll,
    onDelete: fetchAll,
  });

  const internalRefresh = useCallback(() => fetchAll(), [fetchAll]);
  const handleRefresh = onRefresh ? onRefresh : internalRefresh;

  // Type guards for CanonicalFile
  function isSupabaseFile(file: CanonicalFile): file is SupabaseFile {
    return Object.prototype.hasOwnProperty.call(file, 'type');
  }
  function isLibsqlFile(file: CanonicalFile): file is LibsqlFile {
    return !Object.prototype.hasOwnProperty.call(file, 'type');
  }

  // Build tree from flat CanonicalFile[]
  const buildTree = (files: CanonicalFile[]): FileNode[] => {
    const map = new Map<string, FileNode>();
    files.forEach((file) => {
      let isDir = false;
      let path = '';
      if (isSupabaseFile(file)) {
        isDir = file.type === 'folder';
        path = 'path' in file && typeof file.path === 'string' ? file.path : '';
        // parent_id only used in second pass
      } else if (isLibsqlFile(file)) {
        isDir = false;
        path = '';
      }
      map.set(file.id, {
        isDir,
        id: file.id,
        name: file.name,
        path,
        content: file.content ?? undefined,
        created_at: file.created_at,
        updated_at: file.updated_at,
        children: [],
      });
    });
    files.forEach((file) => {
      let parent_id: string | null | undefined = undefined;
      if (isSupabaseFile(file)) {
        parent_id = file.parent_id;
      } else if (isLibsqlFile(file)) {
        parent_id = undefined;
      }
      if (parent_id && map.has(parent_id)) {
        map.get(parent_id)!.children!.push(map.get(file.id)!);
      }
    });
    return Array.from(map.values()).filter((node) => {
      let parent_id: string | null | undefined = undefined;
      const file = files.find((f) => f.id === node.id);
      if (file && isSupabaseFile(file)) {
        parent_id = file.parent_id;
      }
      return !parent_id;
    });
  };

  const tree = buildTree(files);

  return (
    <div className={cn('file-tree', className)}>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error.message}</p>}
      <Button variant="ghost" size="sm" onClick={handleRefresh}>
        <RefreshCw className="w-4 h-4 mr-1" /> Refresh
      </Button>
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
  );
};
