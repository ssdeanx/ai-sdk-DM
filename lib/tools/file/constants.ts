/**
 * @file Constants shared by the “file” tool-suite.
 */

export const ENCODINGS = ['utf8', 'base64', 'hex'] as const;

/**
 * Absolute folder inside which every file operation **must** remain.
 * You can override the default via `FILE_ROOT` environment variable.
 */
export const FILE_ROOT = process.env.FILE_ROOT
  ? require('node:path').resolve(process.env.FILE_ROOT)
  : process.cwd();