import { NextResponse } from "next/server"
import { getData } from "@/lib/memory/supabase"

export async function GET() {
  try {
    // Fetch architecture content from Supabase (assumes a 'content' table with type/category 'architecture')
    const content = await getData<any>("content", {
      filters: { type: "architecture" },
      orderBy: { column: "created_at", ascending: false },
      limit: 1,
    })
    if (!content || content.length === 0) {
      return NextResponse.json({ error: "No architecture content found" }, { status: 404 })
    }
    return NextResponse.json(content[0])
  } catch (error) {
    console.error("Error fetching architecture content:", error)
    return NextResponse.json({ error: "Failed to fetch architecture content" }, { status: 500 })
  }
}
