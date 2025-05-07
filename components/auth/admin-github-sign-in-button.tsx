'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Github, Shield } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'
import { useToast } from '@/components/ui/use-toast'
import type { Database } from '@/types/supabase'

interface AdminGitHubSignInButtonProps {
  className?: string
  children?: React.ReactNode
}

/**
 * Admin GitHub Sign In Button
 * Initiates the GitHub OAuth flow using Supabase Auth specifically for admin login
 */
export function AdminGitHubSignInButton({
  className,
  children,
}: AdminGitHubSignInButtonProps) {
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
          redirectTo: `${window.location.origin}/api/auth/callback/admin-github`,
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
  
  return (
    <Button
      variant="outline"
      onClick={handleSignIn}
      disabled={isLoading}
      className={`flex items-center gap-2 w-full relative overflow-hidden group ${className}`}
    >
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 via-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="flex items-center gap-2 relative z-10">
        <div className="flex gap-1">
          <Github className="h-4 w-4" />
          <Shield className="h-3 w-3 absolute -right-1 -top-1" />
        </div>
        {isLoading ? 'Connecting...' : children || 'Sign in with GitHub (Admin)'}
      </div>
    </Button>
  )
}
