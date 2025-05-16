import { NextRequest, NextResponse } from 'next/server';
import { getData, createItem, updateItem, deleteItem, TableName } from '@/lib/memory/supabase';

// Allowed tables for CRUD
const ALLOWED_TABLES = [
  'apps', 'models', 'settings', 'agents', 'tools', 'workflows', 'networks'
];

function getTableName(param: string): TableName {
  if (!ALLOWED_TABLES.includes(param)) {
    throw new Error('Table not allowed');
  }
  return param as TableName;
}

export async function GET(req: NextRequest, { params }: { params: { table: string } }) {
  try {
    const table = getTableName(params.table);
    const data = await getData(table);
    return NextResponse.json({ [table]: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { table: string } }) {
  try {
    const table = getTableName(params.table);
    const body = await req.json();
    const now = new Date().toISOString();
    const item = await createItem(table, { ...body, created_at: now, updated_at: now });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { table: string } }) {
  try {
    const table = getTableName(params.table);
    const url = new URL(req.url);
    const id = url.pathname.split('/').pop();
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const body = await req.json();
    const updated = await updateItem(table, id, { ...body, updated_at: new Date().toISOString() });
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { table: string } }) {
  try {
    const table = getTableName(params.table);
    const url = new URL(req.url);
    const id = url.pathname.split('/').pop();
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const result = await deleteItem(table, id);
    if (!result.success) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
}
