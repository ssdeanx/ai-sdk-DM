import { NextResponse } from "next/server"
import { isSupabaseAvailable } from "@/lib/memory/supabase"
import { isLibSQLAvailable } from "@/lib/memory/libsql"
import { handleApiError } from "@/lib/api-error-handler"

export async function GET() {
  try {
    // Check Supabase connection
    const supabaseAvailable = await isSupabaseAvailable()

    // Check LibSQL connection
    const libsqlAvailable = await isLibSQLAvailable()

    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      supabase: supabaseAvailable,
      libsql: libsqlAvailable,
      environment: process.env.NODE_ENV,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
