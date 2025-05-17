import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/memory/supabase';
import { handleApiError } from '@/lib/api-error-handler';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('apps')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'App not found' }, { status: 404 });
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
    if (!body.name || !body.description || !body.type || !body.code) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Format the data to match Supabase schema
    const appData = {
      name: body.name,
      description: body.description,
      type: body.type,
      code: body.code,
      parameters_schema: body.parametersSchema || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('apps')
      .update(appData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating app:', error);
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

    const { error } = await supabase.from('apps').delete().eq('id', id);

    if (error) {
      console.error('Error deleting app:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
