import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/memory/supabase';

/**
 * Admin GitHub OAuth callback handler
 * This route is called by Supabase after an admin authenticates with GitHub
 */
export async function GET(request: Request) {
  try {
    // Get the code and state from the URL
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      console.error('No code provided in GitHub callback');
      return NextResponse.redirect(`${origin}/admin/login?error=no_code`);
    }

    // Create a Supabase client
    const supabase = getSupabaseClient();

    // Exchange the code for a session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Error exchanging code for session:', error);
      return NextResponse.redirect(`${origin}/admin/login?error=auth_error`);
    }

    // TEMPORARY: Allow all authenticated users to access admin features
    // In a real app, you would check a role or a specific claim
    // For now, we'll allow any authenticated user to access admin features

    // Original admin check (commented out for now)
    // if (data.user.email !== 'owner@deanmachines.com') {
    //   console.error('User is not an admin:', data.user.email)
    //   return NextResponse.redirect(`${origin}/admin/login?error=not_admin`)
    // }

    // Handle successful authentication
    const forwardedHost = request.headers.get('x-forwarded-host'); // original origin before load balancer
    const isLocalEnv = process.env.NODE_ENV === 'development';

    if (isLocalEnv) {
      // Local development environment
      return NextResponse.redirect(`${origin}/admin/dashboard`);
    } else if (forwardedHost) {
      // Production with load balancer
      return NextResponse.redirect(`https://${forwardedHost}/admin/dashboard`);
    } else {
      // Production without load balancer
      return NextResponse.redirect(`${origin}/admin/dashboard`);
    }
  } catch (error) {
    console.error('Unexpected error in GitHub callback:', error);
    return NextResponse.redirect(`${origin}/admin/login?error=unknown`);
  }
}
