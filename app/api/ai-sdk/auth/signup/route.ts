import { NextResponse } from 'next/server';
import { getUpstashClient as getSupabaseClient } from '@/lib/memory/supabase'; // Ensuring UserSchema is from db/supabase/validation.ts as Supabase is the auth provider
import type { SupabaseClient as StandardSupabaseClient } from '@supabase/supabase-js';
import { UserSchema } from '@/db/supabase/validation';
import { z } from 'zod';
import { upstashLogger } from '@/lib/memory/upstash/upstash-logger';
import { createTrace } from '@/lib/langfuse-integration';
// generateId is a standard import, kept for consistency though not directly used here.
import { generateId } from 'ai';

/**
 * POST /api/ai-sdk/auth/signup
 * Registers a new user using Supabase Auth.
 * Validates input and output against Zod schemas.
 * Implements logging and tracing.
 * @param request - The Next.js request object.
 * @returns {Promise<NextResponse>} A JSON response with the user data or an error message.
 */
export async function POST(request: Request): Promise<NextResponse> {
  // Generated on 2025-05-18
  const trace = await createTrace({
    name: 'auth-signup-request',

    metadata: {
      type: 'auth',
      operation: 'signup',
      url: request.url,
      method: request.method,
    },
  });

  try {
    if (typeof getSupabaseClient !== 'function') {
      await upstashLogger.error(
        'auth-signup',
        'Supabase client factory function not available'
      );
      trace?.update({
        output: { error: 'Supabase client not available' },
        metadata: { status: 500, success: false },
      });
      return NextResponse.json({ error: 'Supabase client not available' });
    }
    const auth = (getSupabaseClient() as unknown as StandardSupabaseClient)
      .auth;

    const InputSchema = z.object({
      email: z.string().email({ message: 'Invalid email address' }),
      password: z
        .string()
        .min(8, { message: 'Password must be at least 8 characters long' }),
      name: z.string().optional(),
    });

    let requestBody;
    try {
      requestBody = await request.json();
    } catch (jsonError) {
      const errorMsg =
        jsonError instanceof Error ? jsonError.message : String(jsonError);
      await upstashLogger.error('auth-signup', 'Invalid JSON in request body', {
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

    trace?.update({ metadata: { requestBody } });

    const parsedInput = InputSchema.safeParse(requestBody);
    if (!parsedInput.success) {
      await upstashLogger.warn('auth-signup', 'Invalid signup input', {
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
    const { email, password, name } = parsedInput.data;

    const { data: signUpData, error: signUpError } = await auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || email.split('@')[0],
          role: 'user', // Default role for new users
        },
      },
    });

    if (signUpError) {
      const errorMessage = signUpError.message || 'Failed to sign up user';
      const errorStatus = signUpError.status || 500;
      let logMessage = 'Supabase signup error';
      let responseMessage = errorMessage;
      let responseStatus = errorStatus;

      if (errorMessage.includes('User already registered')) {
        logMessage = 'User already registered attempt';
        responseMessage = 'User with this email already exists';
        responseStatus = 409;
      }

      await upstashLogger.error('auth-signup', logMessage, {
        email,
        error: errorMessage,
        status: errorStatus,
      });
      trace?.update({
        output: { error: responseMessage },
        metadata: {
          status: responseStatus,
          success: false,
          supabaseError: errorMessage,
        },
      });
      return NextResponse.json(
        { error: responseMessage },
        { status: responseStatus }
      );
    }

    if (!signUpData.user && !signUpData.session) {
      await upstashLogger.info(
        'auth-signup',
        'Signup successful, email verification likely required',
        { email }
      );
      trace?.update({
        output: {
          message:
            'Sign up successful, please check your email for verification.',
        },
        metadata: {
          status: 200,
          success: true,
          emailVerificationPending: true,
        },
      });
      return NextResponse.json({
        message:
          'Sign up successful, please check your email for verification.',
      });
    }

    if (!signUpData.user) {
      await upstashLogger.error(
        'auth-signup',
        'Supabase signup returned no user data unexpectedly',
        { email }
      );
      trace?.update({
        output: { error: 'User data not available after sign up' },
        metadata: { status: 500, success: false },
      });
      return NextResponse.json(
        { error: 'User data not available after sign up' },
        { status: 500 }
      );
    }

    const userObj = {
      id: signUpData.user.id,
      email: signUpData.user.email!, // email is guaranteed by Supabase if user object exists
      name: signUpData.user.user_metadata?.name || name || email.split('@')[0],
      avatar_url: signUpData.user.user_metadata?.avatar_url || null,
      role: signUpData.user.user_metadata?.role || 'user',
      // password_hash is optional in UserSchema and not returned
      created_at: signUpData.user.created_at,
      updated_at: signUpData.user.updated_at || signUpData.user.created_at,
    };

    const validatedUserOutput = UserSchema.safeParse(userObj);

    if (!validatedUserOutput.success) {
      await upstashLogger.error(
        'auth-signup',
        'Failed to validate user data against UserSchema after signup',
        {
          userId: signUpData.user.id,
          validationErrors: validatedUserOutput.error.format(),
          rawData: userObj,
        }
      );
      trace?.update({
        output: {
          error: 'User data invalid after signup',
          details: validatedUserOutput.error.format(),
        },
        metadata: { status: 500, success: false },
      });
      return NextResponse.json(
        {
          error: 'User data invalid after signup',
          details: validatedUserOutput.error.format(),
        },
        { status: 500 }
      );
    }

    await upstashLogger.info('auth-signup', 'User signed up successfully', {
      userId: validatedUserOutput.data.id,
      email: validatedUserOutput.data.email,
    });
    trace?.update({
      output: validatedUserOutput.data,
      metadata: {
        status: 200,
        success: true,
        userId: validatedUserOutput.data.id,
      },
    });
    return NextResponse.json(validatedUserOutput.data);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'An unknown error occurred during signup';
    await upstashLogger.error(
      'auth-signup',
      'Unhandled error in signup route',
      {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      }
    );
    trace?.update({
      output: {
        error: 'Failed to create user due to unhandled exception',
        details: errorMessage,
      },
      metadata: { status: 500, success: false },
    });
    return NextResponse.json(
      {
        error: 'Failed to create user due to an unexpected error',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
