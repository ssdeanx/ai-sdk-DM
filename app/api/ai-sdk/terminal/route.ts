// filepath: app/api/ai-sdk/terminal/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { upstashLogger } from '@/lib/memory/upstash/upstash-logger';

export async function POST(req: NextRequest) {
  try {
    const { command } = await req.json();
    if (!command || typeof command !== 'string') {
      return NextResponse.json({ error: 'No command provided' }, { status: 400 });
    }
    return new Promise((resolve) => {
      exec(command, { timeout: 10000 }, async (err, stdout, stderr) => {
        if (err) {
          await upstashLogger.error('terminal', 'Command error', err);
          resolve(NextResponse.json({ error: stderr || err.message }, { status: 200 }));
        } else {
          resolve(NextResponse.json({ output: stdout }));
        }
      });
    });
  } catch (err) {
    await upstashLogger.error('terminal', 'POST error', err instanceof Error ? err : { error: String(err) });
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
