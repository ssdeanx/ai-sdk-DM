import { NextResponse } from 'next/server';
import { getData, createItem } from '@/lib/memory/supabase';
import type { MdxDocument } from '@/types/mdx';
import { handleApiError } from '@/lib/api-error-handler';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limit = url.searchParams.get('limit')
      ? Number.parseInt(url.searchParams.get('limit')!)
      : 100;
    const offset = url.searchParams.get('offset')
      ? Number.parseInt(url.searchParams.get('offset')!)
      : 0;
    const userId = url.searchParams.get('userId') || null;

    let filters = {};
    if (userId) {
      filters = { user_id: userId };
    }

    const documents = await getData<MdxDocument>('mdx_documents', {
      filters,
      limit,
      offset,
      orderBy: { column: 'updated_at', ascending: false },
    });

    return NextResponse.json({
      documents,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, content, userId = 'anonymous', excerpt = '' } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    // Format the data to match Supabase schema
    const documentData = {
      title,
      content,
      excerpt: excerpt || title.substring(0, 100),
      user_id: userId,
    };

    const document = await createItem<MdxDocument>(
      'mdx_documents',
      documentData
    );

    return NextResponse.json(document);
  } catch (error) {
    return handleApiError(error);
  }
}
