// filepath: app/api/ai-sdk/files/route.ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { upstashLogger } from '@/lib/memory/upstash/upstash-logger';

const ROOT_DIR = process.cwd();

function safeJoin(base: string, target: string) {
  const targetPath = path.resolve(base, target);
  if (!targetPath.startsWith(base)) {
    throw new Error('Invalid path');
  }
  return targetPath;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const relPath = searchParams.get('path') || '';
    const absPath = safeJoin(ROOT_DIR, relPath);
    const stat = await fs.stat(absPath);
    if (stat.isDirectory()) {
      const files = await fs.readdir(absPath, { withFileTypes: true });
      return NextResponse.json({
        files: files.map(f => ({
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
    await upstashLogger.error('file-get', 'GET error', err instanceof Error ? err : { error: String(err) });
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { path: relPath, content, isDir } = await req.json();
    const absPath = safeJoin(ROOT_DIR, relPath);
    if (isDir) {
      await fs.mkdir(absPath, { recursive: true });
    } else {
      await fs.writeFile(absPath, content || '', 'utf8');
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    await upstashLogger.error('file-post', 'POST error', err instanceof Error ? err : { error: String(err) });
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { path: relPath, newPath, content } = await req.json();
    const absPath = safeJoin(ROOT_DIR, relPath);
    if (newPath) {
      const absNewPath = safeJoin(ROOT_DIR, newPath);
      await fs.rename(absPath, absNewPath);
      return NextResponse.json({ ok: true });
    } else if (content !== undefined) {
      await fs.writeFile(absPath, content, 'utf8');
      return NextResponse.json({ ok: true });
    }
    throw new Error('No operation specified');
  } catch (err) {
    await upstashLogger.error('file-put', 'PUT error', err instanceof Error ? err : { error: String(err) });
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { path: relPath } = await req.json();
    const absPath = safeJoin(ROOT_DIR, relPath);
    await fs.rm(absPath, { recursive: true, force: true });
    return NextResponse.json({ ok: true });
  } catch (err) {
    await upstashLogger.error('file-delete', 'DELETE error', err instanceof Error ? err : { error: String(err) });
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
