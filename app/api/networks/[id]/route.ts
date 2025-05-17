import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/memory/supabase';
import { handleApiError } from '@/lib/api-error-handler';
import type { Network } from '../route';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('networks')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Network not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.description) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Format the data to match Supabase schema
    const networkData = {
      name: body.name,
      description: body.description,
      status: body.status || undefined,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('networks')
      .update(networkData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating network:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const supabase = getSupabaseClient();

    const { error } = await supabase.from('networks').delete().eq('id', id);

    if (error) {
      console.error('Error deleting network:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
