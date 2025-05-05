import { NextResponse } from "next/server"
import { getLibSQLClient } from "@/lib/memory/db"

// POST /api/auth/signin - Sign in a user
export async function POST(request: Request) {
  try {
    const db = getLibSQLClient()
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    // Check if user exists and password matches
    const result = await db.execute({
      sql: `SELECT id, email, name FROM users WHERE email = ? AND password = ?`,
      args: [email, password], // In a real app, you would compare hashed passwords
    })

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    // In a real implementation, you would generate a JWT token
    // For now, we'll just return the user data
    return NextResponse.json({
      user: result.rows[0],
      token: "demo-token-" + Date.now(), // Placeholder token
    })
  } catch (error) {
    console.error("Error signing in user:", error)
    return NextResponse.json({ error: "Failed to sign in" }, { status: 500 })
  }
}
