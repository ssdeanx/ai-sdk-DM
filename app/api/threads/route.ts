import { NextResponse } from 'next/server';
import { getThreads } from '@/lib/memory/libsql';
import { handleApiError } from '@/lib/api-error-handler';

export async function GET() {
  try {
    const threads = await getThreads();

    return NextResponse.json({
      threads,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    // Create a new thread ID
    const threadId = crypto.randomUUID();

    return NextResponse.json({
      threadId,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
