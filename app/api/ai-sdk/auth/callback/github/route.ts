import { NextResponse } from 'next/server';
import { getUpstashClient as getSupabaseClient } from '@/lib/memory/supabase'; // Consistent aliasing
import { upstashLogger } from '@/lib/memory/upstash/upstash-logger';
import { createTrace } from '@/lib/langfuse-integration';
import type { SupabaseClient as StandardSupabaseClient } from '@supabase/supabase-js';
/**
 * GitHub OAuth callback handler
 * This route is called by Supabase after a user authenticates with GitHub.
 * It exchanges the OAuth code for a Supabase session and redirects the user.
 * @param request - The Next.js request object.
 * @returns {Promise<NextResponse>} A redirect response.
 */
export async function GET(request: Request) {
  // Generated on 2025-05-18
  const trace = await createTrace({
    name: 'auth-callback-github',
    metadata: {
      type: 'auth',
      operation: 'github-callback',
      input: { url: request.url, method: request.method },
    },
  });

  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/'; // Default redirect path after successful login

  try {
    if (!code) {
      await upstashLogger.warn(
        'auth-callback-github',
        'No code provided in GitHub callback',
        { url: request.url }
      );
      trace?.update({
        // Safe call
        output: { error: 'No code provided' },
        metadata: { status: 400, success: false },
      });
      return NextResponse.redirect(
        `${origin}/auth/auth-code-error?error=no_code`
      );
    }

    if (typeof getSupabaseClient !== 'function') {
      await upstashLogger.error(
        'auth-callback-github',
        'Supabase client factory function not available'
      );
      trace?.update({
        // Safe call
        output: { error: 'Supabase client not available' },
        metadata: { status: 500, success: false },
      });
      return NextResponse.redirect(
        `${origin}/auth/auth-code-error?error=config_error`
      );
    }
    const supabase = getSupabaseClient() as unknown as StandardSupabaseClient;

    const { data, error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      await upstashLogger.error(
        'auth-callback-github',
        'Error exchanging code for session',
        {
          error: exchangeError.message,
          status: exchangeError.status,
          codeReceived: !!code,
        }
      );
      trace?.update({
        // Safe call
        output: {
          error: 'Failed to exchange code for session',
          details: exchangeError.message,
        },
        metadata: { status: exchangeError.status || 500, success: false },
      });
      return NextResponse.redirect(
        `${origin}/auth/auth-code-error?error=exchange_failed`
      );
    }

    if (!data.session || !data.user) {
      await upstashLogger.error(
        'auth-callback-github',
        'Session or user data missing after code exchange',
        {
          userId: data.user?.id,
          sessionId: data.session?.access_token ? 'exists' : 'missing',
        }
      );
      trace?.update({
        // Safe call
        output: { error: 'Session or user data missing after code exchange' },
        metadata: { status: 500, success: false },
      });
      return NextResponse.redirect(
        `${origin}/auth/auth-code-error?error=session_missing`
      );
    }

    await upstashLogger.info(
      'auth-callback-github',
      'Successfully exchanged code for session',
      { userId: data.user.id, email: data.user.email }
    );
    trace?.update({
      // Safe call
      output: { message: 'Session successfully created' },
      metadata: { status: 200, success: true, userId: data.user.id },
    });

    const forwardedHost = request.headers.get('x-forwarded-host');
    const isLocalEnv = process.env.NODE_ENV === 'development';
    let redirectUrl: URL;

    if (isLocalEnv) {
      redirectUrl = new URL(next, origin);
    } else if (forwardedHost) {
      redirectUrl = new URL(next, `https://${forwardedHost}`);
    } else {
      redirectUrl = new URL(next, origin);
    }

    return NextResponse.redirect(redirectUrl.toString());
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Unknown error in GitHub callback';
    await upstashLogger.error(
      'auth-callback-github',
      'Unexpected error in GitHub callback handler',
      {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        codeReceived: !!code,
      }
    );
    // Ensure trace is updated even in the outermost catch
    trace?.update({
      // Safe call
      output: { error: 'Unexpected error', details: errorMessage },
      metadata: { status: 500, success: false },
    });
    return NextResponse.redirect(
      `${origin}/auth/auth-code-error?error=unknown`
    );
  }
}
