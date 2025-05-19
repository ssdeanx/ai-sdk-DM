// filepath: app/api/ai-sdk/terminal/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { z } from 'zod';
import { upstashLogger } from '@/lib/memory/upstash/upstash-logger';
import * as tracing from '@/lib/tracing';
import { SpanStatusCode } from '@/lib/otel-tracing';
import { TerminalSessionSchema } from '@/db/libsql/validation';

// Canonical Zod schema for terminal command input (from validation.ts)
const TerminalCommandSchema = z.object({
  command: z.string().min(1, 'Command is required'),
});

// Canonical Zod schema for terminal session output (from validation.ts)
const TerminalSessionOutputSchema = TerminalSessionSchema.pick({
  id: true,
  app_id: true,
  user_id: true,
  command: true,
  output: true,
  status: true,
  created_at: true,
  updated_at: true,
});

/**
 * POST /api/ai-sdk/terminal
 *
 * Execute a shell command and return the output, with full tracing via Langfuse and OpenTelemetry.
 * @param req - Next.js request object
 * @returns JSON response with command output or error
 * @throws 400 for invalid input, 500 for execution errors
 */
export async function POST(req: NextRequest) {
  let trace: Awaited<ReturnType<typeof tracing.trace>> | undefined;
  try {
    const body = await req.json();
    const parsed = TerminalCommandSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { command } = parsed.data;
    // Start combined trace (Langfuse + OTel)
    trace = await tracing.trace({
      name: 'terminal_command',
      metadata: { command },
    });
    return await new Promise((resolve) => {
      exec(command, { timeout: 10000 }, async (err, stdout, stderr) => {
        if (err) {
          await upstashLogger.error('terminal', 'Command error', err);
          if (trace && trace.id) {
            await tracing.event({
              traceId: trace.id,
              name: 'terminal_command_error',
              metadata: { error: err.message, stderr, command },
            });
          }
          if (trace && trace.end)
            trace.end({
              status: SpanStatusCode.ERROR,
              error: err instanceof Error ? err : new Error(String(err)),
            });
          resolve(
            NextResponse.json({ error: stderr || err.message }, { status: 500 })
          );
        } else {
          await upstashLogger.info('terminal', 'Command executed', {
            command,
            output: stdout,
          });
          if (trace && trace.id) {
            await tracing.event({
              traceId: trace.id,
              name: 'terminal_command_success',
              metadata: { command, output: stdout },
            });
          }
          if (trace && trace.end) trace.end({ status: SpanStatusCode.OK });
          // Validate output with canonical schema (simulate a session object)
          const now = new Date().toISOString();
          const session = {
            id: '', // Not persisted, so empty
            app_id: '',
            user_id: '',
            command,
            output: stdout,
            status: 'success',
            created_at: now,
            updated_at: now,
          };

          const outputValidation =
            TerminalSessionOutputSchema.safeParse(session);

          if (!outputValidation.success) {
            resolve(
              NextResponse.json(
                { error: outputValidation.error.flatten().fieldErrors },
                { status: 500 }
              )
            );
            return;
          }
          resolve(NextResponse.json(outputValidation.data, { status: 200 }));
        }
      });
    });
  } catch (err) {
    await upstashLogger.error(
      'terminal',
      'POST error',
      err instanceof Error ? err : { error: String(err) }
    );
    if (trace && trace.id) {
      await tracing.event({
        traceId: trace.id,
        name: 'terminal_post_error',
        metadata: { error: err instanceof Error ? err.message : String(err) },
      });
    }
    if (trace && trace.end)
      trace.end({
        status: SpanStatusCode.ERROR,
        error: err instanceof Error ? err : new Error(String(err)),
      });
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
// Generated on 2025-05-19 - All terminal commands allowed, full Langfuse+OTel tracing, robust error handling, and logging.
