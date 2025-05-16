import { NextRequest, NextResponse } from 'next/server';
import { getData, createItem, updateItem, deleteItem } from '@/lib/memory/supabase';

export async function GET(_req: NextRequest) {
  try {
    const apps = await getData('apps');
    return NextResponse.json({ apps });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const now = new Date().toISOString();
    const app = await createItem('apps', {
      ...data,
      created_at: now,
      updated_at: now,
    });
    return NextResponse.json(app, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.pathname.split('/').pop();
    if (!id) return NextResponse.json({ error: 'Missing app id' }, { status: 400 });
    const data = await req.json();
    const updated = await updateItem('apps', id, {
      ...data,
      updated_at: new Date().toISOString(),
    });
    if (!updated) return NextResponse.json({ error: 'App not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.pathname.split('/').pop();
    if (!id) return NextResponse.json({ error: 'Missing app id' }, { status: 400 });
    const result = await deleteItem('apps', id);
    if (!result.success) return NextResponse.json({ error: 'App not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
// Uses persistent DB via supabase.ts CRUD helpers for all operations.
