import { NextResponse } from 'next/server';
import { getUpstashClient as getSupabaseClient } from '@/lib/memory/supabase'; // Consistent aliasing
import { upstashLogger } from '@/lib/memory/upstash/upstash-logger';
import { createTrace } from '@/lib/langfuse-integration';
import type { SupabaseClient as StandardSupabaseClient } from '@supabase/supabase-js';
/**
 * Admin GitHub OAuth callback handler.
 * This route is called by Supabase after an admin authenticates with GitHub.
 * It exchanges the OAuth code for a Supabase session and redirects the admin.
 * @param request - The Next.js request object.
 * @returns {Promise<NextResponse>} A redirect response.
 */
export async function GET(request: Request): Promise<NextResponse> {
  // Generated on 2025-05-18
  const trace = await createTrace({
    name: 'auth-callback-admin-github',
    metadata: {
      type: 'auth',
      operation: 'admin-github-callback',
      input: { url: request.url, method: request.method },
    },
  });

  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const adminRedirectPath = '/admin/dashboard'; // Default redirect for admin

  try {
    if (!code) {
      await upstashLogger.warn(
        'auth-callback-admin-github',
        'No code provided in admin GitHub callback',
        { url: request.url }
      );
      trace?.update({
        // Safe call
        output: { error: 'No code provided' },
        metadata: { status: 400, success: false },
      });
      return NextResponse.redirect(`${origin}/admin/login?error=no_code`);
    }

    if (typeof getSupabaseClient !== 'function') {
      await upstashLogger.error(
        'auth-callback-admin-github',
        'Supabase client factory function not available'
      );
      trace?.update({
        // Safe call
        output: { error: 'Supabase client not available' },
        metadata: { status: 500, success: false },
      });
      return NextResponse.redirect(`${origin}/admin/login?error=config_error`);
    }
    const supabase = getSupabaseClient() as unknown as StandardSupabaseClient;

    const { data, error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      await upstashLogger.error(
        'auth-callback-admin-github',
        'Error exchanging code for admin session',
        {
          error: exchangeError.message,
          status: exchangeError.status,
          codeReceived: !!code,
        }
      );
      trace?.update({
        // Safe call
        output: {
          error: 'Failed to exchange code for admin session',
          details: exchangeError.message,
        },
        metadata: { status: exchangeError.status || 500, success: false },
      });
      return NextResponse.redirect(`${origin}/admin/login?error=auth_error`);
    }

    if (!data.session || !data.user) {
      await upstashLogger.error(
        'auth-callback-admin-github',
        'Admin session or user data missing after code exchange',
        {
          userId: data.user?.id,
          sessionId: data.session?.access_token ? 'exists' : 'missing',
        }
      );
      trace?.update({
        // Safe call
        output: {
          error: 'Admin session or user data missing after code exchange',
        },
        metadata: { status: 500, success: false },
      });
      return NextResponse.redirect(
        `${origin}/admin/login?error=session_missing`
      );
    }

    // TODO: 2025-05-18 - Implement proper admin role check here.
    // This currently allows any authenticated user to access admin features.
    // const isAdmin = data.user.email === process.env.USER || data.user.user_metadata?.role === 'admin';
    // if (!isAdmin) {
    //   await upstashLogger.warn(
    //     'auth-callback-admin-github',
    //     'Non-admin user attempted to access admin callback',
    //     { userId: data.user.id, email: data.user.email }
    //   );
    //   trace?.update({ // Safe call
    //     output: { error: 'User is not an admin' },
    //     metadata: { status: 403, success: false, userId: data.user.id },
    //   });
    //   await supabase.auth.signOut(); // Sign out the non-admin user
    //   return NextResponse.redirect(`${origin}/admin/login?error=not_admin`);
    // }

    await upstashLogger.info(
      'auth-callback-admin-github',
      'Successfully exchanged code for admin session',
      { userId: data.user.id, email: data.user.email }
    );
    trace?.update({
      // Safe call
      output: { message: 'Admin session successfully created' },
      metadata: { status: 200, success: true, userId: data.user.id },
    });

    const forwardedHost = request.headers.get('x-forwarded-host');
    const isLocalEnv = process.env.NODE_ENV === 'development';
    let redirectUrl: URL;

    if (isLocalEnv) {
      redirectUrl = new URL(adminRedirectPath, origin);
    } else if (forwardedHost) {
      redirectUrl = new URL(adminRedirectPath, `https://${forwardedHost}`);
    } else {
      redirectUrl = new URL(adminRedirectPath, origin);
    }

    return NextResponse.redirect(redirectUrl.toString());
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Unknown error in admin GitHub callback';
    await upstashLogger.error(
      'auth-callback-admin-github',
      'Unexpected error in admin GitHub callback handler',
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
    return NextResponse.redirect(`${origin}/admin/login?error=unknown`);
  }
}
