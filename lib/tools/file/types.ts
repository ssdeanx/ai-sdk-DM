/**
 * @file Strongly-typed result shapes returned by the file tools.
 *       Provides discriminated unions **and** handy type-guards.
 */

/* ------------------------------------------------------------------ */
/*                          generic failure                           */
/* ------------------------------------------------------------------ */
export interface ToolFailure {
  success: false;
  error: string;
}

/* ------------------------------------------------------------------ */
/*                               READ                                 */
/* ------------------------------------------------------------------ */
export interface FileReadSuccess {
  success: true;
  filePath: string;
  content: string;
  encoding: BufferEncoding;
}
export type FileReadResult = FileReadSuccess | ToolFailure;
export const isFileReadSuccess = (r: FileReadResult): r is FileReadSuccess =>
  r.success;

/* ------------------------------------------------------------------ */
/*                               WRITE                                */
/* ------------------------------------------------------------------ */
export interface FileWriteSuccess {
  success: true;
  filePath: string;
  operation: 'write' | 'append';
}
export type FileWriteResult = FileWriteSuccess | ToolFailure;
export const isFileWriteSuccess = (r: FileWriteResult): r is FileWriteSuccess =>
  r.success;

/* ------------------------------------------------------------------ */
/*                               LIST                                 */
/* ------------------------------------------------------------------ */
export interface FileListSuccess {
  success: true;
  directoryPath: string;
  files: Array<{ path: string; name: string; extension: string }>;
  count: number;
}
export type FileListResult = FileListSuccess | ToolFailure;
export const isFileListSuccess = (r: FileListResult): r is FileListSuccess =>
  r.success;

/* ------------------------------------------------------------------ */
/*                               INFO                                 */
/* ------------------------------------------------------------------ */
export interface FileInfoSuccess {
  success: true;
  filePath: string;
  name: string;
  directory: string;
  extension: string;
  size: number;
  isFile: boolean;
  isDirectory: boolean;
  created: Date;
  modified: Date;
  accessed: Date;
}
export type FileInfoResult = FileInfoSuccess | ToolFailure;
export const isFileInfoSuccess = (r: FileInfoResult): r is FileInfoSuccess =>
  r.success;
