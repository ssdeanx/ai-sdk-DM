'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BlogCard } from '@/components/blog/blog-card';
import { BlogFeatured } from '@/components/blog/blog-featured';
import { useToast } from '@/lib/shared/hooks/use-toast';
import { useSupabaseFetch } from '@/lib/shared/hooks/use-supabase-fetch';

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  author: string;
  imageUrl: string;
  tags: string;
  featured: boolean;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
}

export default function BlogPage() {
  const { toast } = useToast();
  const [featuredPost, setFeaturedPost] = useState<BlogPost | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch featured post
  const { data: featuredPosts, isLoading: isLoadingFeatured } =
    useSupabaseFetch<any>({
      endpoint: '/api/blog',
      resourceName: 'Featured Posts',
      dataKey: 'posts',
      queryParams: { featured: 'true', limit: '1' },
    });

  // Fetch regular posts
  const { data: regularPosts, isLoading: isLoadingPosts } =
    useSupabaseFetch<any>({
      endpoint: '/api/blog',
      resourceName: 'Blog Posts',
      dataKey: 'posts',
      queryParams: { limit: '10' },
    });

  // Format posts when data is loaded
  useEffect(() => {
    if (featuredPosts && featuredPosts.length > 0) {
      setFeaturedPost(formatPost(featuredPosts[0]));
    }
  }, [featuredPosts]);

  // Determine if we're still loading
  const isLoading = isLoadingFeatured || isLoadingPosts;

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
    };
  }

  // Format and filter posts based on search query
  const formattedPosts = regularPosts ? regularPosts.map(formatPost) : [];
  const filteredPosts = formattedPosts.filter(
    (post) =>
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.tags.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container py-6 space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col gap-2"
      >
        <h1 className="text-3xl font-bold tracking-tight">Blog</h1>
        <p className="text-muted-foreground">
          Latest news, updates, and insights
        </p>
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
              <div
                key={i}
                className="h-[350px] rounded-lg bg-muted animate-pulse"
              />
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
              <p className="text-muted-foreground mt-1">
                Try adjusting your search or filter criteria
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
