'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Calendar, User } from 'lucide-react';

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  author: string;
  imageUrl: string;
  tags: string;
  publishedAt: string;
}

interface BlogCardProps {
  post: BlogPost;
}

export function BlogCard({ post }: BlogCardProps) {
  const tagArray = post.tags
    ? post.tags.split(',').map((tag) => tag.trim())
    : [];
  const publishedDate = new Date(post.publishedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Link href={`/blog/${post.id}`}>
        <Card className="overflow-hidden h-full flex flex-col hover:shadow-md transition-shadow">
          <div className="aspect-video overflow-hidden">
            <img
              src={post.imageUrl || '/placeholder.svg?height=400&width=600'}
              alt={post.title}
              className="w-full h-full object-cover transition-transform hover:scale-105"
            />
          </div>
          <CardHeader className="p-4 pb-2">
            <h3 className="text-xl font-semibold line-clamp-2">{post.title}</h3>
          </CardHeader>
          <CardContent className="p-4 pt-2 flex-grow">
            <p className="text-muted-foreground line-clamp-3">{post.excerpt}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {tagArray.slice(0, 3).map((tag, index) => (
                <Badge key={index} variant="secondary" className="font-normal">
                  {tag}
                </Badge>
              ))}
              {tagArray.length > 3 && (
                <Badge variant="outline" className="font-normal">
                  +{tagArray.length - 3}
                </Badge>
              )}
            </div>
          </CardContent>
          <CardFooter className="p-4 pt-0 text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span>{post.author}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{publishedDate}</span>
              </div>
            </div>
          </CardFooter>
        </Card>
      </Link>
    </motion.div>
  );
}
