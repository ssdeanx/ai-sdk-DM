import { NextResponse } from "next/server"

export function handleApiError(error: unknown) {
  console.error("API Error:", error)

  // Determine if this is a Supabase error with a specific structure
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as any).code

    // Handle specific error codes
    if (code === "PGRST116") {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 })
    }

    if (code === "23505") {
      return NextResponse.json({ error: "Duplicate resource" }, { status: 409 })
    }

    if (code === "42P01") {
      return NextResponse.json({ error: "Table does not exist" }, { status: 500 })
    }
  }

  // Default error response
  return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
}
