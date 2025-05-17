import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/memory/supabase';

/**
 * GitHub OAuth callback handler
 * This route is called by Supabase after a user authenticates with GitHub
 */
export async function GET(request: Request) {
  try {
    // Get the code and state from the URL
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const next = searchParams.get('next') ?? '/';

    if (!code) {
      console.error('No code provided in GitHub callback');
      return NextResponse.redirect(`${origin}/auth/auth-code-error`);
    }

    // Create a Supabase client
    const supabase = getSupabaseClient();

    // Exchange the code for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Error exchanging code for session:', error);
      return NextResponse.redirect(`${origin}/auth/auth-code-error`);
    }

    // Handle successful authentication
    const forwardedHost = request.headers.get('x-forwarded-host'); // original origin before load balancer
    const isLocalEnv = process.env.NODE_ENV === 'development';

    if (isLocalEnv) {
      // Local development environment
      return NextResponse.redirect(`${origin}${next}`);
    } else if (forwardedHost) {
      // Production with load balancer
      return NextResponse.redirect(`https://${forwardedHost}${next}`);
    } else {
      // Production without load balancer
      return NextResponse.redirect(`${origin}${next}`);
    }
  } catch (error) {
    console.error('Unexpected error in GitHub callback:', error);
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
  }
}
