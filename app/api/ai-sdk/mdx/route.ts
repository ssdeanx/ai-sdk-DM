import { MdxDocumentSchema } from '@/lib/shared/types/supabase';
import { createSupabaseClient } from '@/lib/memory/upstash/supabase-adapter-factory';
import { upstashLogger } from '@/lib/memory/upstash/upstash-logger';
import { NextResponse } from 'next/server';

/**
 * GET /api/ai-sdk/mdx
 * Returns all MDX documents.
 */
export async function GET() {
  try {
    const supabase = createSupabaseClient();
    const table = supabase.from('mdx_documents', undefined); // schema is ignored
    const docs = await table.getAll();
    return NextResponse.json(
      docs.map((d: unknown) => MdxDocumentSchema.parse(d))
    );
  } catch (error) {
    upstashLogger.error(
      'GET /api/ai-sdk/mdx failed',
      JSON.stringify({
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        route: 'GET /api/ai-sdk/mdx',
      })
    );
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
/**
 * POST /api/ai-sdk/mdx
 * Creates a new MDX document.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = MdxDocumentSchema.omit({
      id: true,
      created_at: true,
      updated_at: true,
    }).parse(body);
    const supabase = createSupabaseClient();
    const table = supabase.from('mdx_documents', undefined); // schema is ignored
    const now = new Date().toISOString();
    const newDoc = {
      ...parsed,
      id: `mdx-${Date.now()}`,
      created_at: now,
      updated_at: now,
    };
    const created = await table.create(newDoc);
    return NextResponse.json(MdxDocumentSchema.parse(created));
  } catch (error) {
    upstashLogger.error(
      'POST /api/ai-sdk/mdx failed',
      JSON.stringify({
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        route: 'POST /api/ai-sdk/mdx',
      })
    );
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
