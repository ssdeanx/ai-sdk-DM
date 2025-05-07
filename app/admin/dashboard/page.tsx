'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { motion } from 'framer-motion'
import { 
  BarChart3, 
  Users, 
  Settings, 
  LogOut, 
  Home, 
  MessageSquare, 
  Cpu, 
  Activity,
  ChevronRight,
  Wrench, // Replaced Tool with Wrench as Tool is not an exported member
  Database as DatabaseIcon // Renaming to avoid conflict with Database type
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import type { Database } from '@/types/supabase'

export default function AdminDashboardPage() {
  const [userName, setUserName] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()
  
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true)
        
        // Create a Supabase browser client
        const supabase = createBrowserClient<Database>(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        
        // Get the current user
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (error || !user) {
          throw error || new Error('User not found')
        }
        
        // Set user name (use email if name not available)
        setUserName(user.user_metadata?.name || user.email)
      } catch (error) {
        console.error('Error fetching user data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchUserData()
  }, [])
  
  const handleLogout = async () => {
    try {
      // Create a Supabase browser client
      const supabase = createBrowserClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      
      // Sign out
      await supabase.auth.signOut()
      
      // Show success message
      toast({
        title: 'Logged out successfully',
        description: 'You have been logged out of the admin dashboard',
      })
      
      // Redirect to login page
      router.push('/admin/login')
    } catch (error) {
      console.error('Error logging out:', error)
      toast({
        title: 'Logout failed',
        description: 'An error occurred while logging out',
        variant: 'destructive',
      })
    }
  }
  
  // Dashboard stats (mock data)
  const stats = [
    { title: 'Total Users', value: '1,234', icon: Users, color: 'from-blue-500 to-cyan-500' },
    { title: 'Active Chats', value: '56', icon: MessageSquare, color: 'from-green-500 to-emerald-500' },
    { title: 'AI Models', value: '8', icon: Cpu, color: 'from-purple-500 to-indigo-500' },
    { title: 'Tools', value: '24', icon: Wrench, color: 'from-orange-500 to-amber-500' },
  ]
  const adminSections = [
    { title: 'User Management', description: 'Manage users, roles, and permissions', icon: Users, href: '/admin/users' },
    { title: 'Model Configuration', description: 'Configure AI models and parameters', icon: Cpu, href: '/admin/models' },
    { title: 'Tools Management', description: 'Manage available tools and integrations', icon: Wrench, href: '/admin/tools' },
    { title: 'Analytics', description: 'View usage statistics and performance metrics', icon: BarChart3, href: '/admin/analytics' },
    { title: 'Database', description: 'Manage database settings and backups', icon: DatabaseIcon, href: '/admin/database' },
    { title: 'System Settings', description: 'Configure system-wide settings', icon: Settings, href: '/admin/settings' },
  ]
  
  return (
    <div className="min-h-screen bg-background">
      {/* Admin Header */}
      <header className="border-b bg-card">
        <div className="container flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-primary/10">
              <Settings className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-xl font-bold">Admin Dashboard</h1>
          </div>
          
          <div className="flex items-center gap-4">
            {userName && (
              <span className="text-sm text-muted-foreground">
                Welcome, <span className="font-medium text-foreground">{userName}</span>
              </span>
            )}
            
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>
      
      <main className="container px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Dashboard Overview</h2>
            <p className="text-muted-foreground mt-1">
              Welcome to the DeanmachinesAI admin dashboard
            </p>
          </div>
          
          <Button asChild variant="outline">
            <Link href="/">
              <Home className="h-4 w-4 mr-2" />
              Back to Site
            </Link>
          </Button>
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                      <p className="text-3xl font-bold">{stat.value}</p>
                    </div>
                    <div className={`p-2 rounded-full bg-gradient-to-br ${stat.color}`}>
                      <stat.icon className="h-5 w-5 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
        
        {/* Admin Sections */}
        <h3 className="text-xl font-semibold mb-4">Admin Controls</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {adminSections.map((section, index) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 + index * 0.1 }}
            >
              <Card className="h-full hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-md bg-primary/10`}>
                      <section.icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{section.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pb-2">
                  <CardDescription>{section.description}</CardDescription>
                </CardContent>
                <CardFooter>
                  <Button variant="ghost" size="sm" className="ml-auto" asChild>
                    <Link href={section.href}>
                      Manage
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
        
        {/* System Status */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>System Status</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  <span className="text-sm text-muted-foreground">All systems operational</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>API Response Time</span>
                    <span className="font-medium">45ms</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500 w-[15%]"></div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Database Load</span>
                    <span className="font-medium">28%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 w-[28%]"></div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Memory Usage</span>
                    <span className="font-medium">42%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 w-[42%]"></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
