import { NextResponse } from "next/server"
import { generateThreadSummary } from "@/lib/memory/memory"

// POST /api/threads/[id]/summary - Generate a summary for a thread
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const thread_id = params.id
    const summary = await generateThreadSummary(thread_id)

    return NextResponse.json({ summary })
  } catch (error) {
    console.error(`Error generating summary for thread ${params.id}:`, error)
    return NextResponse.json({ error: "Failed to generate summary" }, { status: 500 })
  }
}
