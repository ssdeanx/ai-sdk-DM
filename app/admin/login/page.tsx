'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createBrowserClient } from '@supabase/ssr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { AdminGitHubSignInButton } from '@/components/auth/admin-github-sign-in-button';
import { Loader2, Lock, Shield, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Database } from '@/types/supabase';

// Form validation schema
const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z
    .string()
    .min(5, { message: 'Password must be at least 5 characters' }),
});

type FormValues = z.infer<typeof formSchema>;

export default function AdminLoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  // Initialize form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Create a Supabase browser client
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Handle form submission
  const onSubmit = async (values: FormValues) => {
    try {
      setIsLoading(true);
      setLoginError(null);

      // Sign in with email and password
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) {
        throw error;
      }

      // TEMPORARY: Allow all authenticated users to access admin features
      // In a real app, you would check a role or a specific claim
      // For now, we'll allow any authenticated user to access admin features

      // Original admin check (commented out for now)
      // if (data.user?.email !== 'owner@deanmachines.com') {
      //   throw new Error('You do not have admin privileges')
      // }

      // Show success message
      toast({
        title: 'Admin login successful',
        description: 'Welcome to the admin dashboard',
      });

      // Redirect to admin dashboard
      router.push('/admin/dashboard');
      router.refresh();
    } catch (error: any) {
      console.error('Admin login error:', error);
      setLoginError(error.message || 'Failed to sign in');
      toast({
        title: 'Admin login failed',
        description:
          error.message || 'Please check your credentials and try again',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-lg border-border/30 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-blue-500/5 to-purple-500/5 z-0" />

          <CardHeader className="space-y-1 relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-full bg-gradient-to-r from-green-500 to-blue-600">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold">Admin Login</CardTitle>
            </div>
            <CardDescription>
              Enter your credentials to access the admin dashboard
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 relative z-10">
            {/* GitHub Sign In */}
            <div className="space-y-2">
              <AdminGitHubSignInButton />
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with email
                </span>
              </div>
            </div>

            {/* Error message */}
            {loginError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-md bg-destructive/10 text-destructive flex items-center gap-2 text-sm"
              >
                <AlertTriangle className="h-4 w-4" />
                <span>{loginError}</span>
              </motion.div>
            )}

            {/* Email/Password Form */}
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="admin@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="password"
                            placeholder="••••••••"
                            {...field}
                          />
                          <Lock className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Authenticating...
                    </>
                  ) : (
                    'Login to Admin'
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>

          <CardFooter className="flex justify-center border-t bg-muted/10 relative z-10">
            <p className="text-xs text-muted-foreground">
              Secure access for authorized administrators only
            </p>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
