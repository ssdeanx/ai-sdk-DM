import { NextResponse } from 'next/server';
import type { SupabaseClient as ActualSupabaseClient } from '@supabase/supabase-js';
// Corrected import: Alias getUpstashClient to getSupabaseClient for consistency
import { getUpstashClient as getSupabaseClient } from '@/lib/memory/supabase';
import { UserSchema } from 'types/supabase'; // Canonical UserSchema for output
import { z } from 'zod';
import { upstashLogger } from '@/lib/memory/upstash/upstash-logger';
import { createTrace } from '@/lib/langfuse-integration';

/**
 * @typedef {import('@supabase/supabase-js').Session} SupabaseSession
 * @typedef {import('@supabase/supabase-js').User} SupabaseUser
 */

/**
 * POST /api/ai-sdk/auth/signin
 * Signs in an existing user using Supabase Auth.
 * Validates input and output against Zod schemas.
 * Implements logging and tracing.
 * @param {Request} request - The Next.js request object.
 * @returns {Promise<NextResponse>} A JSON response with the user and session data or an error message.
 * @throws Will return a 500 response for unhandled server errors.
 */
export async function POST(request: Request): Promise<NextResponse> {
  // Generated on 2025-05-18
  const trace = await createTrace({
    name: 'auth-signin-request',
    metadata: { type: 'auth', operation: 'signin' },
  });

  // Set initial input via update, if trace was successfully created
  trace?.update({
    input: { url: request.url, method: request.method },
  });

  try {
    if (typeof getSupabaseClient !== 'function') {
      await upstashLogger.error(
        'auth-signin',
        'Supabase client factory function not available'
      );
      trace?.update({
        output: { error: 'Supabase client not available' },
        metadata: { status: 500, success: false },
      });
      return NextResponse.json({ status: 500 });
    }
    const { auth } = getSupabaseClient() as unknown as ActualSupabaseClient; // Destructure auth, asserting the correct Supabase client type

    const InputSchema = z.object({
      email: z.string().email({ message: 'Invalid email address' }),
      password: z.string().min(1, { message: 'Password is required' }),
    });

    let requestBody;
    try {
      requestBody = await request.json();
    } catch (jsonError) {
      const errorMsg =
        jsonError instanceof Error ? jsonError.message : String(jsonError);
      await upstashLogger.error('auth-signin', 'Invalid JSON in request body', {
        error: errorMsg,
      });
      trace?.update({
        output: { error: 'Invalid JSON in request body' },
        metadata: { status: 400, success: false, errorDetail: errorMsg },
      });
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    trace?.update({ input: requestBody }); // Changed from metadata to input for consistency

    const parsedInput = InputSchema.safeParse(requestBody);
    if (!parsedInput.success) {
      await upstashLogger.warn('auth-signin', 'Invalid signin input', {
        details: parsedInput.error.format(),
        input: requestBody,
      });
      trace?.update({
        output: { error: 'Invalid input', details: parsedInput.error.format() },
        metadata: { status: 400, success: false },
      });
      return NextResponse.json(
        { error: 'Invalid input', details: parsedInput.error.format() },
        { status: 400 }
      );
    }
    const { email, password } = parsedInput.data;

    const { data, error: signInError } = await auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      const errorMessage = signInError.message || 'Invalid email or password';
      const errorStatus = signInError.status || 401;
      await upstashLogger.warn('auth-signin', 'Supabase signin error', {
        email,
        error: errorMessage,
        status: errorStatus,
      });
      trace?.update({
        output: { error: errorMessage },
        metadata: {
          status: errorStatus,
          success: false,
          supabaseError: errorMessage,
        },
      });
      return NextResponse.json(
        { error: errorMessage },
        { status: errorStatus }
      );
    }

    if (!data.user || !data.session) {
      await upstashLogger.error(
        'auth-signin',
        'User or session data missing after successful Supabase signin',
        { email, userId: data.user?.id }
      );
      trace?.update({
        output: { error: 'User or session data missing' },
        metadata: { status: 500, success: false },
      });
      return NextResponse.json(
        { error: 'User or session data missing after signin' },
        { status: 500 }
      );
    }

    // Prepare user object for validation against UserSchema
    const userToValidate = {
      id: data.user.id,
      email: data.user.email!,
      name: data.user.user_metadata?.name || null,
      avatar_url: data.user.user_metadata?.avatar_url || null,
      role: data.user.user_metadata?.role || 'user',
      created_at: data.user.created_at,
      updated_at: data.user.updated_at || data.user.created_at,
    };

    const validatedUserOutput = UserSchema.safeParse(userToValidate);

    if (!validatedUserOutput.success) {
      await upstashLogger.error(
        'auth-signin',
        'Failed to validate user data against UserSchema after signin',
        {
          userId: data.user.id,
          validationErrors: validatedUserOutput.error.format(),
          rawData: userToValidate,
        }
      );
      trace?.update({
        output: {
          error: 'User data invalid after signin',
          details: validatedUserOutput.error.format(),
        },
        metadata: { status: 500, success: false },
      });
      return NextResponse.json(
        {
          user: userToValidate,
          session: data.session,
          validationWarning: 'User data failed schema validation post-signin.',
        },
        { status: 200 }
      ); // Still a successful sign-in, but with a warning
    }

    await upstashLogger.info('auth-signin', 'User signed in successfully', {
      userId: validatedUserOutput.data.id,
      email: validatedUserOutput.data.email,
    });
    trace?.update({
      output: { user: validatedUserOutput.data, session: data.session },
      metadata: {
        status: 200,
        success: true,
        userId: validatedUserOutput.data.id,
      },
    });
    return NextResponse.json({
      user: validatedUserOutput.data,
      session: data.session,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'An unknown error occurred during signin';
    await upstashLogger.error(
      'auth-signin',
      'Unhandled error in signin route',
      {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      }
    );
    trace?.update({
      output: {
        error: 'Failed to sign in due to unhandled exception',
        details: errorMessage,
      },
      metadata: { status: 500, success: false },
    });
    return NextResponse.json(
      { error: 'Failed to sign in due to an unexpected error' },
      { status: 500 }
    );
  }
}
