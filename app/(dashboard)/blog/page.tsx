"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Search, Filter } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BlogCard } from "@/components/blog/blog-card"
import { BlogFeatured } from "@/components/blog/blog-featured"
import { useToast } from "@/hooks/use-toast"

interface BlogPost {
  id: string
  title: string
  excerpt: string
  author: string
  imageUrl: string
  tags: string
  featured: boolean
  publishedAt: string
  createdAt: string
  updatedAt: string
}

export default function BlogPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [featuredPost, setFeaturedPost] = useState<BlogPost | null>(null)
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    async function fetchPosts() {
      try {
        // Fetch featured post
        const featuredResponse = await fetch("/api/blog?featured=true&limit=1")
        const featuredData = await featuredResponse.json()

        if (featuredData.posts && featuredData.posts.length > 0) {
          setFeaturedPost(formatPost(featuredData.posts[0]))
        }

        // Fetch regular posts
        const postsResponse = await fetch("/api/blog?limit=10")
        const postsData = await postsResponse.json()

        if (postsData.posts) {
          setPosts(postsData.posts.map(formatPost))
        }
      } catch (error) {
        console.error("Error fetching blog posts:", error)
        toast({
          title: "Error",
          description: "Failed to load blog posts",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchPosts()
  }, [toast])

  // Helper function to format post data
  function formatPost(post: any): BlogPost {
    return {
      id: post.id,
      title: post.title,
      excerpt: post.excerpt,
      author: post.author,
      imageUrl: post.image_url,
      tags: post.tags,
      featured: Boolean(post.featured),
      publishedAt: post.published_at,
      createdAt: post.created_at,
      updatedAt: post.updated_at,
    }
  }

  // Filter posts based on search query
  const filteredPosts = posts.filter(
    (post) =>
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.tags.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="container py-6 space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col gap-2"
      >
        <h1 className="text-3xl font-bold tracking-tight">Blog</h1>
        <p className="text-muted-foreground">Latest news, updates, and insights</p>
      </motion.div>

      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search posts..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="outline" className="sm:w-auto w-full">
          <Filter className="mr-2 h-4 w-4" />
          Filter
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-6">
          <div className="h-[300px] rounded-lg bg-muted animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-[350px] rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        </div>
      ) : (
        <>
          {featuredPost && <BlogFeatured post={featuredPost} />}

          {filteredPosts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPosts.map((post) => (
                <BlogCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium">No posts found</h3>
              <p className="text-muted-foreground mt-1">Try adjusting your search or filter criteria</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
