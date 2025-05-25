import { NextResponse } from 'next/server';
import { UserSchema } from '@/lib/shared/types/supabase';
import { upstashLogger } from '@/lib/memory/upstash/upstash-logger';
import { handleApiError } from '@/lib/api-error-handler';
import { z } from 'zod';
import { createSupabaseClient } from '@/lib/memory/upstash/supabase-adapter-factory';
import crypto from 'crypto';

/**
 * GET /api/ai-sdk/users
 * Returns all users, validated with canonical UserSchema
 */
export async function GET() {
  try {
    const db = createSupabaseClient();
    const users = await db.from('users', UserSchema).getAll();
    const validated = z.array(UserSchema).parse(users);
    return NextResponse.json(validated);
  } catch (error) {
    await upstashLogger.error(
      'users-api',
      'Error fetching users',
      error instanceof Error ? error : { error: String(error) }
    );
    return handleApiError(error);
  }
}

/**
 * POST /api/ai-sdk/users
 * Creates a new user, omitting id/created_at/updated_at from input, generates them, validates output
 */
const NewUserSchema = UserSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export async function POST(request: Request) {
  try {
    const db = createSupabaseClient();
    const body = await request.json();
    const newUserInput = NewUserSchema.parse(body);
    const now = new Date().toISOString();
    const user = {
      ...newUserInput,
      id: crypto.randomUUID(),
      created_at: now,
      updated_at: now,
    };
    const created = await db.from('users', UserSchema).create(user);
    const validated = UserSchema.parse(created);
    return NextResponse.json(validated, { status: 201 });
  } catch (error) {
    await upstashLogger.error(
      'users-api',
      'Error creating user',
      error instanceof Error ? error : { error: String(error) }
    );
    return handleApiError(error);
  }
}

/**
 * GET /api/ai-sdk/users/[id]
 * Returns a user by id, validated with canonical UserSchema
 */
export async function GET_BY_ID(
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
// Generated on 2025-05-19 - Updated to use Upstash/Supabase adapter, secure uuid, and added GET_BY_ID route. All output validated. LF endings enforced.
