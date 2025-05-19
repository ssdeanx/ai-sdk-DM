// filepath: app/api/ai-sdk/terminal/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { z } from 'zod';
import { upstashLogger } from '@/lib/memory/upstash/upstash-logger';
// import { createTrace } from '@/lib/observability/otel'; // Uncomment if tracing is available

/**
 * Zod schema for terminal command input
 */
const TerminalCommandSchema = z.object({
  command: z.string().min(1, 'Command is required'),
});

// For demo: restrict to a safe list of allowed commands (customize as needed)
const ALLOWED_COMMANDS = ['ls', 'pwd', 'whoami', 'echo'];

/**
 * POST /api/ai-sdk/terminal
 *
 * Execute a safe shell command and return the output.
 * @param req - Next.js request object
 * @returns JSON response with command output or error
 * @throws 400 for invalid input, 403 for disallowed command, 500 for execution errors
 */
export async function POST(req: NextRequest) {
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
    // Security: Only allow whitelisted commands
    const baseCmd = command.split(' ')[0];
    if (!ALLOWED_COMMANDS.includes(baseCmd)) {
      await upstashLogger.warn('terminal', 'Disallowed command attempted', {
        command,
      });
      return NextResponse.json(
        { error: 'Command not allowed for security reasons.' },
        { status: 403 }
      );
    }
    // Optionally: create a trace for this terminal execution
    // const trace = await createTrace({ name: 'terminal_command', metadata: { command } });
    return await new Promise((resolve) => {
      exec(command, { timeout: 10000 }, async (err, stdout, stderr) => {
        if (err) {
          await upstashLogger.error('terminal', 'Command error', err);
          resolve(
            NextResponse.json({ error: stderr || err.message }, { status: 500 })
          );
        } else {
          await upstashLogger.info('terminal', 'Command executed', {
            command,
            output: stdout,
          });
          resolve(NextResponse.json({ output: stdout }, { status: 200 }));
        }
      });
    });
  } catch (err) {
    await upstashLogger.error(
      'terminal',
      'POST error',
      err instanceof Error ? err : { error: String(err) }
    );
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
// Generated on 2025-05-18 - Refactored for security, validation, and production readiness.
