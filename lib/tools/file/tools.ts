/**
 * @file Vercel AI SDK “file” tools (read, write, list, info).
 * @remarks
 *   • Every path is resolved *within* `FILE_ROOT` to block path-traversal.
 *   • Returns discriminated-union results for exhaustive type-checking.
 *   • Fully compatible with `generateText` / `streamText`.
 */

import { tool } from 'ai';
import { z } from 'zod';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { ENCODINGS, FILE_ROOT } from './constants';
import {
  FileReadResult,
  FileWriteResult,
  FileListResult,
  FileInfoResult,
  ToolFailure,
} from './types';

/* ─────────────────────────────  helpers  ────────────────────────────── */

/**
 * Resolve a user-supplied path **inside** `FILE_ROOT`.
 * @throws if the resolved path escapes the root.
 */
function resolveWithinRoot(userPath: string): string {
  const resolved = path.resolve(FILE_ROOT, userPath);
  if (!resolved.startsWith(FILE_ROOT)) {
    throw new Error('Access outside permitted FILE_ROOT');
  }
  return resolved;
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/* ─────────────────────────────  schemas  ────────────────────────────── */

export const fileReadSchema = z.object({
  filePath: z.string().describe('Relative path of the file to read'),
  encoding: z.enum(ENCODINGS).default('utf8').describe('File encoding'),
});

export const fileWriteSchema = z.object({
  filePath: z.string().describe('Relative path of the file to write'),
  content: z.string().describe('Content to write'),
  encoding: z.enum(ENCODINGS).default('utf8'),
  append: z.boolean().default(false).describe('Append instead of overwrite'),
});

export const fileListSchema = z.object({
  directoryPath: z.string().describe('Relative directory path'),
  recursive: z.boolean().default(false),
  pattern: z.string().optional().describe('Optional regex filter'),
});

export const fileInfoSchema = z.object({
  filePath: z.string().describe('Relative path of the file to inspect'),
});

/* ─────────────────────────  implementations  ────────────────────────── */

/**
 * Read a file.
 */
async function fileRead(
  params: z.infer<typeof fileReadSchema>
): Promise<FileReadResult> {
  const { filePath, encoding } = params;
  try {
    const p = resolveWithinRoot(filePath);
    await fs.access(p);
    const content = await fs.readFile(p, {
      encoding: encoding as BufferEncoding,
    });
    return { success: true, filePath: p, content, encoding };
  } catch (err) {
    return {
      success: false,
      error: (err as Error).message,
    } satisfies ToolFailure;
  }
}

/**
 * Write or append to a file.
 */
async function fileWrite(
  params: z.infer<typeof fileWriteSchema>
): Promise<FileWriteResult> {
  const { filePath, content, encoding, append } = params;
  try {
    const p = resolveWithinRoot(filePath);
    await fs.mkdir(path.dirname(p), { recursive: true });
    if (append) {
      await fs.appendFile(p, content, { encoding: encoding as BufferEncoding });
    } else {
      await fs.writeFile(p, content, { encoding: encoding as BufferEncoding });
    }
    return {
      success: true,
      filePath: p,
      operation: append ? 'append' : 'write',
    };
  } catch (err) {
    return {
      success: false,
      error: (err as Error).message,
    } satisfies ToolFailure;
  }
}

/**
 * List files in a directory.
 */
async function fileList(
  params: z.infer<typeof fileListSchema>
): Promise<FileListResult> {
  const { directoryPath, recursive, pattern } = params;
  try {
    const dir = resolveWithinRoot(directoryPath);
    if (!(await exists(dir))) throw new Error('Directory does not exist');

    const walk = async (d: string): Promise<string[]> => {
      const entries = await fs.readdir(d, { withFileTypes: true });
      const out: string[] = [];
      for (const e of entries) {
        const full = path.join(d, e.name);
        if (e.isDirectory() && recursive) out.push(...(await walk(full)));
        else if (e.isFile()) out.push(full);
      }
      return out;
    };

    const files = await walk(dir);
    const filtered = pattern
      ? files.filter((f) => new RegExp(pattern).test(f))
      : files;

    return {
      success: true,
      directoryPath: dir,
      files: filtered.map((f) => ({
        path: f,
        name: path.basename(f),
        extension: path.extname(f),
      })),
      count: filtered.length,
    };
  } catch (err) {
    return {
      success: false,
      error: (err as Error).message,
    } satisfies ToolFailure;
  }
}

/**
 * Get detailed information about a single file.
 */
async function fileInfo(
  params: z.infer<typeof fileInfoSchema>
): Promise<FileInfoResult> {
  const { filePath } = params;
  try {
    const p = resolveWithinRoot(filePath);
    const stats = await fs.stat(p);
    return {
      success: true,
      filePath: p,
      name: path.basename(p),
      directory: path.dirname(p),
      extension: path.extname(p),
      size: stats.size,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
      created: stats.birthtime,
      modified: stats.mtime,
      accessed: stats.atime,
    };
  } catch (err) {
    return {
      success: false,
      error: (err as Error).message,
    } satisfies ToolFailure;
  }
}

/* ─────────────────────────────  exports  ────────────────────────────── */

/**
 * Public “file” tools object, ready for `generateText` / `streamText`.
 */
export const tools = {
  FileRead: tool({
    description: 'Read file content',
    parameters: fileReadSchema,
    execute: fileRead,
  }),
  FileWrite: tool({
    description: 'Write or append to a file',
    parameters: fileWriteSchema,
    execute: fileWrite,
  }),
  FileList: tool({
    description: 'List files in a directory',
    parameters: fileListSchema,
    execute: fileList,
  }),
  FileInfo: tool({
    description: 'Get detailed file information',
    parameters: fileInfoSchema,
    execute: fileInfo,
  }),
};
