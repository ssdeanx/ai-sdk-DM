import { NextResponse } from "next/server"
import { getData } from "@/lib/memory/supabase"

export async function GET() {
  try {
    // Fetch code examples from Supabase (assumes a 'content' table with type/category 'code-examples')
    const codeExamples = await getData<any>("content", {
      filters: { type: "code-examples" },
      orderBy: { column: "created_at", ascending: false },
    })
    if (!codeExamples || codeExamples.length === 0) {
      return NextResponse.json({ error: "No code examples found" }, { status: 404 })
    }
    return NextResponse.json(codeExamples)
  } catch (error) {
    console.error("Error fetching code examples:", error)
    return NextResponse.json({ error: "Failed to fetch code examples" }, { status: 500 })
  }
}
