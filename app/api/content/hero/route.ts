import { NextResponse } from 'next/server';
import { getData } from '@/lib/memory/supabase';

export async function GET() {
  try {
    // Fetch hero content from Supabase (assumes a 'content' table with type/category 'hero')
    const heroContent = await getData<any>('content', {
      filters: { type: 'hero' },
      orderBy: { column: 'created_at', ascending: false },
      limit: 1,
    });
    if (!heroContent || heroContent.length === 0) {
      return NextResponse.json(
        { error: 'No hero content found' },
        { status: 404 }
      );
    }
    return NextResponse.json(heroContent[0]);
  } catch (error) {
    console.error('Error fetching hero content:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hero content' },
      { status: 500 }
    );
  }
}
