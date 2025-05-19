import { NextResponse } from 'next/server';
import {
  getItemById,
  updateItem,
  deleteItem,
} from '@/lib/memory/upstash/supabase-adapter';
import { getDrizzleClient } from '@/lib/memory/supabase';
import type { Model } from '@/types/models';
import { handleApiError } from '@/lib/api-error-handler';
import { models } from '@/db/supabase/schema';
import { eq } from 'drizzle-orm';

const db = process.env.USE_DRIZZLE === 'true' ? getDrizzleClient() : null;

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Try using Drizzle first
    if (db) {
      try {
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
        // eslint-disable-next-line no-console
        console.error(
          'Error using Drizzle, falling back to Supabase:',
          drizzleError
        );
      }
    }

    // Fall back to Upstash/Supabase adapter
    const model = await getItemById('models', id);

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
    if (db) {
      try {
        // Remove created_at/updated_at and convert numeric fields to string for Drizzle
        const safeUpdates = { ...updates };
        delete safeUpdates.created_at;
        delete safeUpdates.updated_at;
        if (safeUpdates.input_cost_per_token !== undefined)
          safeUpdates.input_cost_per_token = String(
            safeUpdates.input_cost_per_token
          );
        if (safeUpdates.output_cost_per_token !== undefined)
          safeUpdates.output_cost_per_token = String(
            safeUpdates.output_cost_per_token
          );
        if (safeUpdates.default_temperature !== undefined)
          safeUpdates.default_temperature = String(
            safeUpdates.default_temperature
          );
        if (safeUpdates.default_top_p !== undefined)
          safeUpdates.default_top_p = String(safeUpdates.default_top_p);
        if (safeUpdates.default_frequency_penalty !== undefined)
          safeUpdates.default_frequency_penalty = String(
            safeUpdates.default_frequency_penalty
          );
        if (safeUpdates.default_presence_penalty !== undefined)
          safeUpdates.default_presence_penalty = String(
            safeUpdates.default_presence_penalty
          );
        await db.update(models).set(safeUpdates).where(eq(models.id, id));
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
        // eslint-disable-next-line no-console
        console.error(
          'Error using Drizzle, falling back to Supabase:',
          drizzleError
        );
      }
    }

    // Fall back to Upstash/Supabase adapter
    const model = await updateItem('models', id, updates);
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
    if (db) {
      try {
        await db.delete(models).where(eq(models.id, id));
        return NextResponse.json({ success: true });
      } catch (drizzleError) {
        // eslint-disable-next-line no-console
        console.error(
          'Error using Drizzle, falling back to Supabase:',
          drizzleError
        );
      }
    }
    // Fall back to Upstash/Supabase adapter
    const success = await deleteItem('models', id);
    return NextResponse.json({ success });
  } catch (error) {
    return handleApiError(error);
  }
}
