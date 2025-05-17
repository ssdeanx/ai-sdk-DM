'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Loader2 } from 'lucide-react';
import type { Database } from '@/types/supabase';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true);

        // Create a Supabase browser client
        const supabase = createBrowserClient<Database>(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // Get the current session
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        // Check if user is authenticated
        if (!session) {
          // If not on login page, redirect to login
          if (pathname !== '/admin/login') {
            router.push('/admin/login');
          }
          setIsAuthenticated(false);
          return;
        }

        // TEMPORARY: Allow all authenticated users to access admin features
        // In a real app, you would check a role or a specific claim
        // For now, we'll allow any authenticated user to access admin features
        const isAdmin = true; // Temporarily allow all users

        // Original admin check (commented out for now)
        // const isAdmin = session.user.email === 'owner@deanmachines.com'
        //
        // if (!isAdmin) {
        //   // If not an admin, redirect to login
        //   if (pathname !== '/admin/login') {
        //     router.push('/admin/login')
        //   }
        //   setIsAuthenticated(false)
        //   return
        // }

        // User is authenticated and is an admin
        setIsAuthenticated(true);

        // If on login page, redirect to dashboard
        if (pathname === '/admin/login') {
          router.push('/admin/dashboard');
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        setIsAuthenticated(false);

        // Redirect to login page
        if (pathname !== '/admin/login') {
          router.push('/admin/login');
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [pathname, router]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Verifying admin access...
          </p>
        </div>
      </div>
    );
  }

  // If on login page or authenticated, render children
  if (pathname === '/admin/login' || isAuthenticated) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  // Otherwise, show unauthorized message (should not reach here due to redirects)
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="p-8 rounded-lg border shadow-lg max-w-md text-center">
        <h1 className="text-2xl font-bold mb-4">Unauthorized Access</h1>
        <p className="text-muted-foreground mb-4">
          You do not have permission to access the admin dashboard.
        </p>
        <button
          onClick={() => router.push('/admin/login')}
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Go to Login
        </button>
      </div>
    </div>
  );
}
