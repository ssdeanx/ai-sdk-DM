/**
 * API route for file system operations (list, read, write, update, delete)
 * @module api/ai-sdk/files
 */
import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';
import { z } from 'zod';
import { upstashLogger } from '@/lib/memory/upstash/upstash-logger';

const ROOT_DIR = process.cwd();

const FilePathSchema = z.object({
  path: z.string().min(1, { message: 'Path is required' }),
});

const FileWriteSchema = FilePathSchema.extend({
  content: z.string().optional(),
  isDir: z.boolean().optional(),
});

const FileUpdateSchema = FilePathSchema.extend({
  newPath: z.string().optional(),
  content: z.string().optional(),
});

/**
 * Safely join base and target paths, preventing path traversal.
 * @param base - The base directory
 * @param target - The target path
 * @returns The resolved absolute path
 * @throws Error if the resolved path is outside the base
 */
function safeJoin(base: string, target: string) {
  const targetPath = path.resolve(base, target);
  if (!targetPath.startsWith(base)) {
    throw new Error('Invalid path');
  }
  return targetPath;
}

/**
 * GET /api/ai-sdk/files
 * List directory contents or read file content
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const relPath = searchParams.get('path') || '';
    const absPath = safeJoin(ROOT_DIR, relPath);
    try {
      const stat = await fs.stat(absPath);
      if (stat.isDirectory()) {
        const files = await fs.readdir(absPath, { withFileTypes: true });
        return NextResponse.json({
          files: files.map((f) => ({
            name: f.name,
            isDir: f.isDirectory(),
            path: path.join(relPath, f.name),
          })),
        });
      } else {
        const content = await fs.readFile(absPath, 'utf8');
        return NextResponse.json({ content });
      }
    } catch (err) {
      await upstashLogger.error(
        'file-get',
        'GET error',
        err instanceof Error ? err : { error: String(err) }
      );
      return NextResponse.json(
        { error: 'File or directory not found' },
        { status: 404 }
      );
    }
  } catch (err) {
    await upstashLogger.error(
      'file-get',
      'GET error',
      err instanceof Error ? err : { error: String(err) }
    );
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

/**
 * POST /api/ai-sdk/files
 * Create a file or directory
 */
export async function POST(req: NextRequest) {
  try {
    const raw = await req.json();
    const { path: relPath, content, isDir } = FileWriteSchema.parse(raw);
    const absPath = safeJoin(ROOT_DIR, relPath);
    if (isDir) {
      await fs.mkdir(absPath, { recursive: true });
    } else {
      await fs.mkdir(path.dirname(absPath), { recursive: true });
      await fs.writeFile(absPath, content ?? '', 'utf8');
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    await upstashLogger.error(
      'file-post',
      'POST error',
      err instanceof Error ? err : { error: String(err) }
    );
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

/**
 * PUT /api/ai-sdk/files
 * Update file content or rename file/directory
 */
export async function PUT(req: NextRequest) {
  try {
    const raw = await req.json();
    const { path: relPath, newPath, content } = FileUpdateSchema.parse(raw);
    const absPath = safeJoin(ROOT_DIR, relPath);
    if (newPath) {
      const absNewPath = safeJoin(ROOT_DIR, newPath);
      await fs.rename(absPath, absNewPath);
      return NextResponse.json({ ok: true, renamed: true });
    } else if (content !== undefined) {
      await fs.writeFile(absPath, content, 'utf8');
      return NextResponse.json({ ok: true, updated: true });
    }
    throw new Error('No operation specified');
  } catch (err) {
    await upstashLogger.error(
      'file-put',
      'PUT error',
      err instanceof Error ? err : { error: String(err) }
    );
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

/**
 * DELETE /api/ai-sdk/files
 * Delete a file or directory
 */
export async function DELETE(req: NextRequest) {
  try {
    const raw = await req.json();
    const { path: relPath } = FilePathSchema.parse(raw);
    const absPath = safeJoin(ROOT_DIR, relPath);
    await fs.rm(absPath, { recursive: true, force: true });
    return NextResponse.json({ ok: true });
  } catch (err) {
    await upstashLogger.error(
      'file-delete',
      'DELETE error',
      err instanceof Error ? err : { error: String(err) }
    );
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
// End of file
