'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Github } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'
import { useToast } from '@/components/ui/use-toast'
import type { Database } from '@/types/supabase'

interface GitHubSignInButtonProps {
  redirectTo?: string
  mode?: 'button' | 'link'
  className?: string
  children?: React.ReactNode
}

/**
 * GitHub Sign In Button
 * Initiates the GitHub OAuth flow using Supabase Auth
 */
export function GitHubSignInButton({
  redirectTo = '/',
  mode = 'button',
  className,
  children,
}: GitHubSignInButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  
  // Create a Supabase browser client
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  const handleSignIn = async () => {
    try {
      setIsLoading(true)
      
      // Initiate GitHub OAuth flow
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback/github?next=${redirectTo}`,
          scopes: 'read:user user:email',
        },
      })
      
      if (error) {
        throw error
      }
      
      // The user will be redirected to GitHub for authentication
    } catch (error) {
      console.error('GitHub sign in error:', error)
      toast({
        title: 'Authentication Error',
        description: 'Failed to initiate GitHub sign in. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  if (mode === 'link') {
    return (
      <Button
        variant="link"
        onClick={handleSignIn}
        disabled={isLoading}
        className={className}
      >
        {isLoading ? 'Connecting...' : children || 'Sign in with GitHub'}
      </Button>
    )
  }
  
  return (
    <Button
      variant="outline"
      onClick={handleSignIn}
      disabled={isLoading}
      className={`flex items-center gap-2 ${className}`}
    >
      <Github className="h-4 w-4" />
      {isLoading ? 'Connecting...' : children || 'Sign in with GitHub'}
    </Button>
  )
}
