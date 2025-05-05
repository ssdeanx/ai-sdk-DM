import { NextResponse } from "next/server"
import { getMemory, deleteThread } from "@/lib/memory/libsql"
import { handleApiError } from "@/lib/api-error-handler"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const memories = await getMemory(id)

    return NextResponse.json({
      threadId: id,
      messages: memories,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const success = await deleteThread(id)

    return NextResponse.json({
      success,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
