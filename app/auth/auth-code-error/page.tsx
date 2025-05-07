'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'
import Link from 'next/link'

/**
 * Error page displayed when there's an issue with the authentication code exchange
 */
export default function AuthCodeErrorPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-6 w-6" />
            <CardTitle className="text-2xl">Authentication Error</CardTitle>
          </div>
          <CardDescription>
            There was a problem processing your authentication request.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>This could be due to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>An expired or invalid authentication link</li>
              <li>A previously used one-time link</li>
              <li>A technical issue with the authentication service</li>
            </ul>
          </div>
          <div className="text-sm">
            <p>Please try signing in again or contact support if the problem persists.</p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" asChild>
            <Link href="/">Back to Home</Link>
          </Button>
          <Button asChild>
            <Link href="/auth/signin">Try Again</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
