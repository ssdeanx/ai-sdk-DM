import { NextResponse } from 'next/server';
import {
  getItemById,
  updateItem,
  deleteItem,
  getDrizzleClient,
} from '@/lib/memory/supabase';
import type { Model } from '@/types/models';
import { handleApiError } from '@/lib/api-error-handler';
import { models } from '@/db/supabase/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Try using Drizzle first
    if (process.env.USE_DRIZZLE === 'true') {
      try {
        const db = getDrizzleClient();
        const result = await db
          .select()
          .from(models)
          .where(eq(models.id, id))
          .limit(1);

        if (result.length === 0) {
          return NextResponse.json(
            { error: 'Model not found' },
            { status: 404 }
          );
        }

        return NextResponse.json(result[0]);
      } catch (drizzleError) {
        console.error(
          'Error using Drizzle, falling back to Supabase:',
          drizzleError
        );
        // Continue to Supabase fallback
      }
    }

    // Fall back to Supabase client
    const model = await getItemById<Model>('models', id);

    if (!model) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }

    return NextResponse.json(model);
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

    // Format the data to match schema
    const updates: Partial<Model> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.provider !== undefined) updates.provider = body.provider;
    if (body.modelId !== undefined) updates.model_id = body.modelId;
    if (body.baseUrl !== undefined) updates.base_url = body.baseUrl;
    if (body.apiKey !== undefined && body.apiKey !== '••••••••••••••••')
      updates.api_key = body.apiKey;
    if (body.status !== undefined)
      updates.status = body.status as 'active' | 'inactive';

    // Try using Drizzle first
    if (process.env.USE_DRIZZLE === 'true') {
      try {
        const db = getDrizzleClient();

        // Update the model
        await db.update(models).set(updates).where(eq(models.id, id));

        // Get the updated model
        const result = await db
          .select()
          .from(models)
          .where(eq(models.id, id))
          .limit(1);

        if (result.length === 0) {
          return NextResponse.json(
            { error: 'Model not found' },
            { status: 404 }
          );
        }

        return NextResponse.json(result[0]);
      } catch (drizzleError) {
        console.error(
          'Error using Drizzle, falling back to Supabase:',
          drizzleError
        );
        // Continue to Supabase fallback
      }
    }

    // Fall back to Supabase client
    const model = await updateItem<Model>('models', id, updates);

    return NextResponse.json(model);
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

    // Try using Drizzle first
    if (process.env.USE_DRIZZLE === 'true') {
      try {
        const db = getDrizzleClient();

        // Delete the model
        await db.delete(models).where(eq(models.id, id));

        return NextResponse.json({
          success: true,
        });
      } catch (drizzleError) {
        console.error(
          'Error using Drizzle, falling back to Supabase:',
          drizzleError
        );
        // Continue to Supabase fallback
      }
    }

    // Fall back to Supabase client
    const success = await deleteItem('models', id);

    return NextResponse.json({
      success,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
