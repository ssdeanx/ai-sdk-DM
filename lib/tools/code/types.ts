/**
 * @file Strongly-typed result shapes returned from the tools.
 *       Consumers can rely on discriminated unions for exhaustive
 *       switch/case handling.
 */

/* ------------------------------------------------------------------ */
/*                               Execute                              */
/* ------------------------------------------------------------------ */

/** Successful execution result. */
export interface ExecuteSuccess {
  success: true;
  /** Concatenated `stdout` captured from `console.log` calls. */
  output: string;
  /** Optional explicit return value from the executed snippet. */
  result?: string;
}

/** Failed execution result. */
export interface ExecuteFailure {
  success: false;
  /** Human-readable error message. */
  error: string;
}

/** Union returned by `CodeExecute`. */
export type ExecuteResult = ExecuteSuccess | ExecuteFailure;

/* ------------------------------------------------------------------ */
/*                               Analyse                              */
/* ------------------------------------------------------------------ */

export interface AnalyzeSuccess {
  language: string;
  analysisTypes: string[];
  /** Arbitrary analysis artefacts keyed by analysis type. */
  results: Record<string, unknown>;
}

export interface AnalyzeFailure {
  /** Human-readable error message. */
  error: string;
}

export type AnalyzeResult = AnalyzeSuccess | AnalyzeFailure;