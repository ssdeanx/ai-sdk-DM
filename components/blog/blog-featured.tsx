"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Calendar, User, ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface BlogPost {
  id: string
  title: string
  excerpt: string
  author: string
  imageUrl: string
  tags: string
  publishedAt: string
}

interface BlogFeaturedProps {
  post: BlogPost
}

export function BlogFeatured({ post }: BlogFeaturedProps) {
  const tagArray = post.tags ? post.tags.split(",").map((tag) => tag.trim()) : []
  const publishedDate = new Date(post.publishedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-xl"
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/30 z-10" />
      <img
        src={post.imageUrl || "/placeholder.svg?height=600&width=1200"}
        alt={post.title}
        className="w-full h-[400px] object-cover"
      />
      <div className="absolute inset-0 z-20 flex flex-col justify-end p-6 text-white">
        <Badge className="w-fit mb-4 bg-primary hover:bg-primary/90">Featured</Badge>
        <h2 className="text-3xl font-bold mb-2">{post.title}</h2>
        <p className="text-white/80 mb-4 max-w-2xl">{post.excerpt}</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {tagArray.slice(0, 4).map((tag, index) => (
            <Badge key={index} variant="secondary" className="font-normal">
              {tag}
            </Badge>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-white/70">
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span>{post.author}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{publishedDate}</span>
            </div>
          </div>
          <Button asChild className="bg-white text-black hover:bg-white/90">
            <Link href={`/blog/${post.id}`}>
              Read Article
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
