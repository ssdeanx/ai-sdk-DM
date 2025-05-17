import { NextResponse } from 'next/server';
import { getData } from '@/lib/memory/supabase';

export async function GET() {
  try {
    // Fetch features from Supabase (assumes a 'content' table with type/category 'features')
    const features = await getData<any>('content', {
      filters: { type: 'features' },
      orderBy: { column: 'created_at', ascending: false },
    });
    if (!features || features.length === 0) {
      return NextResponse.json({ error: 'No features found' }, { status: 404 });
    }
    return NextResponse.json(features);
  } catch (error) {
    console.error('Error fetching features:', error);
    return NextResponse.json(
      { error: 'Failed to fetch features' },
      { status: 500 }
    );
  }
}
