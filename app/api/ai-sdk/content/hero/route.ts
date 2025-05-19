import { NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/memory/upstash/supabase-adapter-factory';
import { upstashLogger } from '@/lib/memory/upstash/upstash-logger';

export async function GET() {
  try {
    // Use the Supabase-like client to fetch hero content
    const supabase = createSupabaseClient();
    // The canonical schema for 'content' is in tableSchemas, so we can pass an empty object as schema
    interface ContentItem {
      type: string;
      created_at: string;
      content: string;
      title: string;
      description: string;
      image_url?: string;
    }
    const contentClient = supabase.from<ContentItem>('content', {});
    const allContent = await contentClient.getAll();
    // Filter for type 'hero', order by created_at desc, limit 1
    const heroContent = allContent
      .filter((item: { type: string }) => item.type === 'hero')
      .sort(
        (a: { created_at: string }, b: { created_at: string }) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, 1);

    if (!heroContent || heroContent.length === 0) {
      return NextResponse.json(
        { error: 'No hero content found' },
        { status: 404 }
      );
    }
    return NextResponse.json(heroContent[0]);
  } catch (error) {
    await upstashLogger.error(
      'content-hero-route',
      'Error fetching hero content',
      error instanceof Error ? error : { error: String(error) }
    );
    return NextResponse.json(
      { error: 'Failed to fetch hero content' },
      { status: 500 }
    );
  }
}
