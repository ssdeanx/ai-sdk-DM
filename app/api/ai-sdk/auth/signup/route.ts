import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/memory/supabase';
import { v4 as uuidv4 } from 'uuid';

// POST /api/auth/signup - Register a new user
export async function POST(request: Request) {
  try {
    const supabase = getSupabaseClient();
    const { email, password, name } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Attempt to sign up the user with Supabase Auth
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp(
      {
        email,
        password,
        options: {
          data: {
            name: name || email.split('@')[0], // Optional: pass additional user metadata
          },
        },
      }
    );

    if (signUpError) {
      // Check if the error is due to the user already existing
      if (signUpError.message.includes('User already registered')) {
        return NextResponse.json(
          { error: 'User with this email already exists' },
          { status: 409 }
        );
      }
      console.error('Supabase sign up error:', signUpError);
      return NextResponse.json(
        { error: signUpError.message || 'Failed to sign up user' },
        { status: signUpError.status || 500 }
      );
    }

    // Handle cases where sign up might require confirmation (email verification)
    // or if user is successfully created but session is null initially.
    if (!signUpData.user) {
      // This might happen if email confirmation is required.
      // Adjust response as needed for your application flow.
      return NextResponse.json({
        message:
          'Sign up successful, please check your email for verification.',
      });
    }

    // Return user information upon successful sign up
    return NextResponse.json({
      id: signUpData.user.id,
      email: signUpData.user.email,
      name: signUpData.user.user_metadata.name || email.split('@')[0],
      createdAt: signUpData.user.created_at,
    });
  } catch (error: any) {
    console.error('Error creating user:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { error: 'Failed to create user', details: errorMessage },
      { status: 500 }
    );
  }
}
