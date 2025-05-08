/**
 * @file Tool definitions (`CodeExecute`, `CodeAnalyze`) that are exposed to
 *       the AI SDK.  Each tool ships its Zod schema, a description, and an
 *       `execute` implementation.
 */

import { tool } from 'ai';
import { z } from 'zod';
import { Worker } from 'node:worker_threads';

import {
  LANG_EXECUTE,
  LANG_ANALYZE,
  ANALYSES,
  DANGEROUS_PATTERNS,
} from './code/constants';
import {
  ExecuteResult,
  AnalyzeResult,
  ExecuteFailure,
  ExecuteSuccess,
} from './code/types';

/* -------------------------------------------------------------------------- */
/*                             Zod schema definitions                         */
/* -------------------------------------------------------------------------- */

/**
 * Parameters accepted by the `CodeExecute` tool.
 */
export const codeExecuteSchema = z.object({
  code: z.string().describe('The code to execute'),
  language: z.enum(LANG_EXECUTE).describe('The programming language'),
  timeout: z.number().int().min(1).max(30).default(10).describe('Timeout (s)'),
});

/**
 * Parameters accepted by the `CodeAnalyze` tool.
 */
export const codeAnalyzeSchema = z.object({
  code: z.string().describe('The code to analyse'),
  language: z.enum(LANG_ANALYZE).describe('The programming language'),
  analysis: z.array(z.enum(ANALYSES)).default(['complexity']),
});

/* -------------------------------------------------------------------------- */
/*                                Code execute                                */
/* -------------------------------------------------------------------------- */

/**
 * Execute a code snippet in a worker thread with a hard timeout.
 *
 * @internal The sandbox currently supports JavaScript only.
 */
async function codeExecute(
  params: z.infer<typeof codeExecuteSchema>,
): Promise<ExecuteResult> {
  const { code, language, timeout } = params;

  /* -----------------------------  non-JS languages  ---------------------------- */
  if (language !== 'javascript') {
    return <ExecuteFailure>{
      success: false,
      error: `Execution of ${language} is not implemented`,
    };
  }

  /* ---------------------------  JS via worker thread  --------------------------- */
  return new Promise<ExecuteResult>((resolve) => {
    /* eslint-disable @typescript-eslint/no-var-requires */
    const worker = new Worker(require.resolve('./code/execute-worker'), {
      workerData: { code },
    });
    /* eslint-enable @typescript-eslint/no-var-requires */

    /* Force-terminate after `timeout` seconds. */
    const timer = setTimeout(() => {
      worker.terminate();
      resolve({ success: false, error: `Timed out after ${timeout}s` });
    }, timeout * 1_000);

    worker.once('message', (msg: any) => {
      clearTimeout(timer);
      if (msg.error) {
        resolve(<ExecuteFailure>{ success: false, error: msg.error });
        return;
      }
      const success: ExecuteSuccess = {
        success: true,
        output: msg.output.join('\n'),
        result: msg.result !== undefined ? String(msg.result) : undefined,
      };
      resolve(success);
    });

    worker.once('error', (err) => {
      clearTimeout(timer);
      resolve(<ExecuteFailure>{ success: false, error: err.message });
    });
  });
}

/* -------------------------------------------------------------------------- */
/*                                Code analyse                                */
/* -------------------------------------------------------------------------- */

/**
 * Perform static analysis on the supplied code.
 */
async function codeAnalyze(
  params: z.infer<typeof codeAnalyzeSchema>,
): Promise<AnalyzeResult> {
  const { code, language, analysis } = params;

  try {
    const results: Record<string, unknown> = {};

    /* --------------------------  complexity analysis  -------------------------- */
    if (analysis.includes('complexity')) {
      const lines = code.split('\n').length;
      const nestingLevel = Math.max(
        ...code.split('\n').map((line) => {
          const indentation = line.search(/\S/);
          return indentation > 0 ? indentation / 2 : 0;
        }),
        0,
      );

      results.complexity = {
        lines,
        nestingLevel,
        assessment: nestingLevel > 5 ? 'High complexity' : 'Acceptable',
      };
    }

    /* ---------------------------  security analysis  --------------------------- */
    if (analysis.includes('security')) {
      const regexes =
        DANGEROUS_PATTERNS.get(language as (typeof LANG_ANALYZE)[number]) ?? [];

      const issues =
        regexes
          .map((re) => {
            const matches = code.match(re) ?? [];
            return matches.length > 0
              ? { pattern: re.source, count: matches.length }
              : null;
          })
          .filter(Boolean) ?? [];

      results.security = {
        issues,
        assessment: issues.length
          ? 'Potential issues found'
          : 'No obvious issues',
      };
    }

    return {
      language,
      analysisTypes: analysis,
      results,
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/* -------------------------------------------------------------------------- */
/*                                  Exports                                   */
/* -------------------------------------------------------------------------- */

/**
 * Bundles the two tools in the format expected by `generateText` / `streamText`.
 *
 * @example
 * 
 * const result = await generateText({
 *   model,
 *   tools,
 *   prompt: '…',
 * });
 * 
 */
export const tools = {
  CodeExecute: tool({
    description: 'Execute JavaScript in a sandboxed worker thread',
    parameters: codeExecuteSchema,
    execute: codeExecute,
  }),

  CodeAnalyze: tool({
    description: 'Analyse code for complexity & security',
    parameters: codeAnalyzeSchema,
    execute: codeAnalyze,
  }),
};
