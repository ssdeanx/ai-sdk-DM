/**
 * @file Worker-thread entry point for sandboxing JavaScript execution.
 *
 * @remarks
 *   The worker receives `{ code: string }` via `workerData`, executes it,
 *   captures `console` output locally, and finally posts a message back to the
 *   parent thread in the shape:
 *
 *   • `{ result: unknown; output: string[] }`  – success
 *   • `{ error: string;  output: string[] }`  – failure
 *
 *   Although safer than `eval` in the main thread, this is **NOT** a fully
 *   hardened sandbox.  For production, consider `vm2`, Docker, Firecracker,
 *   etc.
 */

import { parentPort, workerData } from 'node:worker_threads';
import { Console as NodeConsole } from 'node:console';

/* -------------------------  capture console.log  -------------------------- */

const output: string[] = [];

const localConsole = new NodeConsole({
  stdout: {
    write: (chunk: string) => {
      output.push(chunk.toString().replace(/\n$/, ''));
      return true;
    },
  } as unknown as NodeJS.WritableStream,
  stderr: process.stderr,
});

/* Make `console` inside the user script point to our local collector. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).console = localConsole;

/* ---------------------------  run user script  ---------------------------- */

(async () => {
  try {
    // eslint-disable-next-line no-new-func
    const AsyncFn = Object.getPrototypeOf(async () => {}).constructor as (
      ...args: string[]
    ) => (...fnArgs: unknown[]) => Promise<unknown>;

    const result = await AsyncFn(workerData.code)();
    parentPort!.postMessage({ result, output });
  } catch (err) {
    parentPort!.postMessage({
      error: err instanceof Error ? err.message : String(err),
      output,
    });
  }
})();