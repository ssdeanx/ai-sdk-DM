import { NextResponse } from 'next/server';
import { getData } from '@/lib/memory/supabase';

export async function GET() {
  try {
    // Fetch footer content from Supabase (assumes a 'content' table with type/category 'footer')
    const footerContent = await getData<any>('content', {
      filters: { type: 'footer' },
      orderBy: { column: 'created_at', ascending: false },
      limit: 1,
    });
    if (!footerContent || footerContent.length === 0) {
      return NextResponse.json(
        { error: 'No footer content found' },
        { status: 404 }
      );
    }
    return NextResponse.json(footerContent[0]);
  } catch (error) {
    console.error('Error fetching footer content:', error);
    return NextResponse.json(
      { error: 'Failed to fetch footer content' },
      { status: 500 }
    );
  }
}
