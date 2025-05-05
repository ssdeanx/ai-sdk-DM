import { NextResponse } from "next/server"
import { getItemById, updateItem, deleteItem } from "@/lib/memory/supabase"
import type { BlogPost } from "@/types/blog"
import { handleApiError } from "@/lib/api-error-handler"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const post = await getItemById<BlogPost>("blog_posts", id)

    if (!post) {
      return NextResponse.json({ error: "Blog post not found" }, { status: 404 })
    }

    return NextResponse.json(post)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const body = await request.json()

    // Format the data to match Supabase schema
    const updates: Partial<BlogPost> = {}
    if (body.title !== undefined) updates.title = body.title
    if (body.content !== undefined) updates.content = body.content
    if (body.excerpt !== undefined) updates.excerpt = body.excerpt
    if (body.author !== undefined) updates.author = body.author
    if (body.imageUrl !== undefined) updates.image_url = body.imageUrl
    if (body.tags !== undefined) updates.tags = body.tags
    if (body.featured !== undefined) updates.featured = body.featured

    const post = await updateItem<BlogPost>("blog_posts", id, updates)

    return NextResponse.json(post)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const success = await deleteItem("blog_posts", id)

    return NextResponse.json({
      success,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
