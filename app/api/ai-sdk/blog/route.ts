import { BlogPostSchema } from 'types/supabase';
import { createSupabaseClient } from '@/lib/memory/upstash/supabase-adapter-factory';
import { upstashLogger } from '@/lib/memory/upstash/upstash-logger';
import { NextResponse } from 'next/server';

const NewBlogPostSchema = BlogPostSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

/**
 * GET /api/ai-sdk/blog
 * Returns all blog posts.
 */
export async function GET() {
  try {
    const supabase = createSupabaseClient();
    const posts = await supabase.from('blog_posts', BlogPostSchema).getAll();
    return NextResponse.json(
      posts.map((p: unknown) => BlogPostSchema.parse(p))
    );
  } catch (error) {
    upstashLogger.error(
      'GET /api/ai-sdk/blog failed',
      JSON.stringify({
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        route: 'GET /api/ai-sdk/blog',
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
 * POST /api/ai-sdk/blog
 * Creates a new blog post.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = NewBlogPostSchema.parse(body);
    const supabase = createSupabaseClient();
    const now = new Date().toISOString();
    const newPost = {
      ...parsed,
      id: `blog-${Date.now()}`,
      created_at: now,
      updated_at: now,
    };
    const created = await supabase
      .from('blog_posts', BlogPostSchema)
      .create(newPost);
    return NextResponse.json(BlogPostSchema.parse(created));
  } catch (error) {
    upstashLogger.error(
      'POST /api/ai-sdk/blog failed',
      JSON.stringify({
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        route: 'POST /api/ai-sdk/blog',
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
