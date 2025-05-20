'use client';
import React, { useEffect, useState, useRef, useCallback, use } from 'react';
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

export interface FileNode {
  name: string;
  path: string;
  isDir: boolean;
  children?: FileNode[];
}

interface FileTreeProps {
  rootPath?: string;
  onFileSelect?: (file: FileNode) => void;
  onRefresh?: () => void;
  className?: string;
}

// Helper to fetch file tree from API
async function fetchFileTree(path = ''): Promise<FileNode[]> {
  try {
    const res = await fetch(
      `/api/ai-sdk/files?path=${encodeURIComponent(path)}`
    );
    if (!res.ok) throw new Error('Failed to fetch file tree');
    const data = await res.json();
    // API returns { files: [...] }
    if (Array.isArray(data.files)) return data.files;
    return [];
  } catch {
    return [];
  }
}

// File/folder CRUD helpers
async function createFileOrFolder(path: string, isDir: boolean) {
  await fetch('/api/ai-sdk/files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, isDir }),
  });
}
async function renameFileOrFolder(oldPath: string, newPath: string) {
  await fetch('/api/ai-sdk/files', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: oldPath, newPath }),
  });
}
async function deleteFileOrFolder(path: string) {
  await fetch('/api/ai-sdk/files', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  });
}

const getIndentClass = (level: number) => `pl-${level * 4}`;

const FileTreeNode: React.FC<{
  node: FileNode;
  level: number;
  onFileSelect?: (file: FileNode) => void;
  onRefresh?: () => void;
}> = ({ node, level, onFileSelect, onRefresh }) => {
  const [expanded, setExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(node.name);
  const [creating, setCreating] = useState<null | 'file' | 'folder'>(null);
  const [newChildName, setNewChildName] = useState('');
  const hasChildren = node.isDir && node.children && node.children.length > 0;
  const nodeRef = useRef<HTMLDivElement>(null);

  // Keyboard navigation (basic)
  useEffect(() => {
    if (!nodeRef.current) return;
    const currentRef = nodeRef.current;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && renaming) {
        renameFileOrFolder(
          node.path,
          `${node.path.substring(0, node.path.lastIndexOf('/'))}/${newName}`
        ).then(() => {
          setRenaming(false);
          if (onRefresh) onRefresh();
        });
      }
      if (e.key === 'Escape' && renaming) {
        setRenaming(false);
        setNewName(node.name);
      }
    };
    currentRef.addEventListener('keydown', handleKeyDown);
    return () => currentRef.removeEventListener('keydown', handleKeyDown);
  }, [renaming, node.name, node.path, newName, onRefresh]);

  // Context menu close on click outside
  useEffect(() => {
    if (!showMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (nodeRef.current && !nodeRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showMenu]);

  return (
    <div className="relative">
      <div
        ref={nodeRef}
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
            <label className="sr-only" htmlFor={`rename-input-${node.path}`}>
              Rename file or folder
            </label>
            <input
              id={`rename-input-${node.path}`}
              className="bg-transparent border-b border-border text-xs font-mono px-1 w-24 outline-none"
              value={newName}
              autoFocus
              placeholder="Rename..."
              onChange={(e) => setNewName(e.target.value)}
              onBlur={() => setRenaming(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  renameFileOrFolder(
                    node.path,
                    `${node.path.substring(0, node.path.lastIndexOf('/'))}/${newName}`
                  ).then(() => {
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
              deleteFileOrFolder(node.path).then(() => {
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
              deleteFileOrFolder(node.path).then(() => {
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
                createFileOrFolder(
                  `${node.path}/${newChildName}`,
                  creating === 'folder'
                ).then(() => {
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
            key={child.path}
            node={child}
            level={level + 1}
            onFileSelect={onFileSelect}
            onRefresh={onRefresh}
          />
        ))}
    </div>
  );
};

export const FileTree: React.FC<FileTreeProps> = ({
  rootPath = '',
  onFileSelect,
  className,
  onRefresh,
}) => {
  const [tree, setTree] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Internal refresh function
  const internalRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // Use the provided onRefresh prop if available, else use the internal refresh
  const handleRefresh = onRefresh ? onRefresh : internalRefresh;

  useEffect(() => {
    setLoading(true);
    fetchFileTree(rootPath)
      .then(setTree)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [rootPath, refreshKey]);

  return (
    <div className={cn('overflow-auto h-full', className)}>
      <div className="flex items-center justify-between px-2 py-1 border-b border-border bg-muted">
        <span className="font-bold text-xs">Files</span>
        <Button variant="ghost" size="icon-sm" onClick={handleRefresh}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>
      {loading && (
        <div className="text-xs text-muted-foreground p-2">Loading...</div>
      )}
      {error && <div className="text-xs text-red-500 p-2">{error}</div>}
      <div className="py-1">
        {tree.map((node) => (
          <FileTreeNode
            key={node.path}
            node={node}
            level={0}
            onFileSelect={onFileSelect}
            onRefresh={handleRefresh}
          />
        ))}
      </div>
    </div>
  );
};
