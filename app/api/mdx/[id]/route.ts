import { NextResponse } from 'next/server';
import { getItemById, updateItem, deleteItem } from '@/lib/memory/supabase';
import type { MdxDocument } from '@/types/mdx';
import { handleApiError } from '@/lib/api-error-handler';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const document = await getItemById<MdxDocument>('mdx_documents', id);

    if (!document) {
      return NextResponse.json(
        { error: 'MDX document not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(document);
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

    // Format the data to match Supabase schema
    const updates: Partial<MdxDocument> = {};
    if (body.title !== undefined) updates.title = body.title;
    if (body.content !== undefined) updates.content = body.content;
    if (body.excerpt !== undefined) updates.excerpt = body.excerpt;

    const document = await updateItem<MdxDocument>(
      'mdx_documents',
      id,
      updates
    );

    return NextResponse.json(document);
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
    const success = await deleteItem('mdx_documents', id);

    return NextResponse.json({
      success,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
