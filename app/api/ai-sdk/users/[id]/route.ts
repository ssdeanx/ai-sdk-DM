import { NextResponse } from 'next/server';
import { UserSchema } from '@/db/supabase/validation';
import { upstashLogger } from '@/lib/memory/upstash/upstash-logger';
import { handleApiError } from '@/lib/api-error-handler';
import { createSupabaseClient } from '@/lib/memory/upstash/supabase-adapter-factory';

/**
 * GET /api/ai-sdk/users/[id]
 * Returns a user by id, validated with canonical UserSchema
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const db = createSupabaseClient();
    const user = await db.from('users', UserSchema).getById(params.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const validated = UserSchema.parse(user);
    return NextResponse.json(validated);
  } catch (error) {
    await upstashLogger.error(
      'users-api',
      'Error fetching user by id',
      error instanceof Error ? error : { error: String(error) }
    );
    return handleApiError(error);
  }
}
// Generated on 2025-05-19 - GET /api/ai-sdk/users/[id] route using Upstash/Supabase adapter, robust error handling, and canonical Zod validation.
