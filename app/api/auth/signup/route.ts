import { NextResponse } from "next/server"
import { getLibSQLClient } from "@/lib/memory/db"
import { v4 as uuidv4 } from "uuid"

// POST /api/auth/signup - Register a new user
export async function POST(request: Request) {
  try {
    const db = getLibSQLClient()
    const body = await request.json()
    const { email, password, name } = body

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    // Check if user already exists
    const checkResult = await db.execute({
      sql: `SELECT id FROM users WHERE email = ?`,
      args: [email],
    })

    if (checkResult.rows.length > 0) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 409 })
    }

    // In a real implementation, you would hash the password
    // For now, we'll just store it as is (NOT SECURE - just for demo)
    const id = uuidv4()
    const now = new Date().toISOString()

    await db.execute({
      sql: `
        INSERT INTO users (id, email, password, name, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      args: [id, email, password, name || email.split("@")[0], now, now],
    })

    return NextResponse.json({
      id,
      email,
      name: name || email.split("@")[0],
      createdAt: now,
    })
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
  }
}
