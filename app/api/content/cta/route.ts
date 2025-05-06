import { NextResponse } from "next/server"
import { getData } from "@/lib/memory/supabase"

export async function GET() {
  try {
    // Fetch CTA content from Supabase (assumes a 'content' table with type/category 'cta')
    const ctaContent = await getData<any>("content", {
      filters: { type: "cta" },
      orderBy: { column: "created_at", ascending: false },
      limit: 1,
    })
    if (!ctaContent || ctaContent.length === 0) {
      return NextResponse.json({ error: "No CTA content found" }, { status: 404 })
    }
    return NextResponse.json(ctaContent[0])
  } catch (error) {
    console.error("Error fetching CTA content:", error)
    return NextResponse.json({ error: "Failed to fetch CTA content" }, { status: 500 })
  }
}
