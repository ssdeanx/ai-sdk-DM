import { NextResponse } from "next/server"
import { getSupabaseClient } from "@/lib/memory/supabase"

// POST /api/auth/signin - Sign in a user
export async function POST(request: Request) {
  try {
    const supabase = getSupabaseClient()
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    // Authenticate via Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      return NextResponse.json({ error: error.message || "Invalid email or password" }, { status: 401 })
    }
    // Return user and session info
    return NextResponse.json({ user: data.user, session: data.session })
  } catch (error) {
    console.error("Error signing in user:", error)
    return NextResponse.json({ error: "Failed to sign in" }, { status: 500 })
  }
}
