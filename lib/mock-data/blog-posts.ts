export interface BlogPost {
  id: string
  title: string
  content: string
  excerpt: string
  author: string
  image_url: string
  tags: string
  featured: boolean
  published_at: string
  created_at: string
  updated_at: string
}

export const mockBlogPosts: BlogPost[] = [
  {
    id: "1",
    title: "Getting Started with AI SDK",
    content: "# Getting Started with AI SDK\n\nThis guide will help you get started with the AI SDK...",
    excerpt: "Learn how to use the AI SDK to build powerful AI applications.",
    author: "John Doe",
    image_url: "/placeholder.svg?height=400&width=600",
    tags: "ai,sdk,tutorial",
    featured: true,
    published_at: "2023-12-01T00:00:00.000Z",
    created_at: "2023-12-01T00:00:00.000Z",
    updated_at: "2023-12-01T00:00:00.000Z",
  },
  {
    id: "2",
    title: "Advanced AI Techniques",
    content: "# Advanced AI Techniques\n\nIn this article, we explore advanced AI techniques...",
    excerpt: "Discover advanced techniques for building sophisticated AI applications.",
    author: "Jane Smith",
    image_url: "/placeholder.svg?height=400&width=600",
    tags: "ai,advanced,techniques",
    featured: false,
    published_at: "2023-12-02T00:00:00.000Z",
    created_at: "2023-12-02T00:00:00.000Z",
    updated_at: "2023-12-02T00:00:00.000Z",
  },
  {
    id: "3",
    title: "Building Multi-Agent Systems",
    content: "# Building Multi-Agent Systems\n\nLearn how to build systems with multiple AI agents...",
    excerpt: "Create powerful applications using multiple AI agents working together.",
    author: "Alex Johnson",
    image_url: "/placeholder.svg?height=400&width=600",
    tags: "ai,agents,multi-agent",
    featured: false,
    published_at: "2023-12-03T00:00:00.000Z",
    created_at: "2023-12-03T00:00:00.000Z",
    updated_at: "2023-12-03T00:00:00.000Z",
  },
]
