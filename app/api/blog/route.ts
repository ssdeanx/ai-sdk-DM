import { NextResponse } from "next/server"
import { getData, createItem } from "@/lib/memory/supabase"
import type { BlogPost } from "@/types/blog"
import { handleApiError } from "@/lib/api-error-handler"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const limit = url.searchParams.get("limit") ? Number.parseInt(url.searchParams.get("limit")!) : 10
    const offset = url.searchParams.get("offset") ? Number.parseInt(url.searchParams.get("offset")!) : 0
    const featured = url.searchParams.get("featured") === "true"
    const tag = url.searchParams.get("tag")

    let filters = {}
    if (featured) {
      filters = { featured: true }
    }
    if (tag) {
      filters = { ...filters, tag }
    }

    const posts = await getData<BlogPost>("blog_posts", {
      filters,
      limit,
      offset,
      orderBy: { column: "published_at", ascending: false },
    })

    return NextResponse.json({
      posts,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      title,
      content,
      excerpt,
      author = "Admin",
      imageUrl = "/placeholder.svg?height=400&width=600",
      tags = "",
      featured = false,
    } = body

    if (!title || !content) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 })
    }

    // Format the data to match Supabase schema
    const postData = {
      title,
      content,
      excerpt: excerpt || title.substring(0, 150),
      author,
      image_url: imageUrl,
      tags,
      featured,
      published_at: new Date().toISOString(),
    }

    const post = await createItem<BlogPost>("blog_posts", postData)

    return NextResponse.json(post)
  } catch (error) {
    return handleApiError(error)
  }
}
