/**
 * NextAuth.js API Route for Cloudflare D1 Authentication
 *
 * Configures NextAuth.js with:
 * - Drizzle adapter for Cloudflare D1 persistence
 * - GitHub OAuth provider
 * - Custom JWT and session callbacks for role management
 * - Cloudflare Pages compatibility
 *
 * Generated on 2025-01-24
 */

import NextAuth, {
  type NextAuthOptions,
  type User as NextAuthUser,
} from 'next-auth';
import GithubProvider from 'next-auth/providers/github';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { type JWT } from 'next-auth/jwt';
import { type Session } from 'next-auth';

import { getD1Orm } from '@/lib/database/cloudflare/d1/client';
import * as d1Schema from '@/lib/database/cloudflare/d1/schema';

/**
 * Extended user type with role information
 */
interface ExtendedUser extends NextAuthUser {
  role?: string;
}

/**
 * Extended JWT type with user role
 */
interface ExtendedJWT extends JWT {
  role?: string;
}

/**
 * Extended session type with user role
 */
interface ExtendedSession extends Session {
  user: {
    id: string;
    role?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

/**
 * Get NextAuth.js configuration
 * Supports both Cloudflare Pages and local development
 */
function getAuthConfig(): NextAuthOptions {
  // Access D1 binding from Cloudflare environment
  // In Cloudflare Pages, this is available via globalThis.env
  // In local development, you might need to set up a local SQLite fallback
  const env = (globalThis as any).env;

  if (!env?.DB_D1) {
    console.warn(
      'D1 binding not found. NextAuth.js may not work properly. ' +
        'Ensure you are running with `wrangler pages dev` or have configured D1 bindings.'
    );
  }

  try {
    const db = getD1Orm(env);

    const config: NextAuthOptions = {
      // Use Drizzle adapter with D1
      adapter: DrizzleAdapter(db, {
        usersTable: d1Schema.users,
        accountsTable: d1Schema.accounts,
        sessionsTable: d1Schema.sessions,
        verificationTokensTable: d1Schema.verificationTokens,
      }),

      // Authentication providers
      providers: [
        GithubProvider({
          clientId: process.env.GITHUB_CLIENT_ID!,
          clientSecret: process.env.GITHUB_CLIENT_SECRET!,
          authorization: {
            params: {
              scope: 'read:user user:email',
            },
          },
        }),
        // TODO: Add more providers as needed (Google, Discord, etc.)
      ],

      // Session configuration
      session: {
        strategy: 'database', // Use database sessions with D1
        maxAge: 30 * 24 * 60 * 60, // 30 days
        updateAge: 24 * 60 * 60, // 24 hours
      },

      // JWT configuration (fallback for when database sessions aren't available)
      jwt: {
        maxAge: 30 * 24 * 60 * 60, // 30 days
      },

      // Custom pages
      pages: {
        signIn: '/auth/signin',
        error: '/auth/auth-code-error',
      },

      // Callbacks for extending session data
      callbacks: {
        /**
         * JWT callback - adds user role to JWT token
         */
        async jwt({
          token,
          user,
        }: {
          token: ExtendedJWT;
          user?: ExtendedUser;
        }) {
          if (user) {
            token.role = user.role || 'user';
          }
          return token;
        },

        /**
         * Session callback - adds user role to session object
         */
        async session({
          session,
          token,
          user,
        }: {
          session: ExtendedSession;
          token?: ExtendedJWT;
          user?: any;
        }) {
          // For database sessions, user contains the role
          // For JWT sessions, token contains the role
          if (user?.id) {
            session.user.id = user.id;
            session.user.role = user.role || 'user';
          } else if (token?.sub) {
            session.user.id = token.sub;
            session.user.role = token.role || 'user';
          }

          return session;
        },

        /**
         * Sign-in callback - can be used for access control
         */
        async signIn({ user, account, profile }) {
          // Allow all sign-ins for now
          // TODO: Add any custom sign-in logic here
          return true;
        },
      },

      // Event handlers
      events: {
        async signIn({ user, account, profile, isNewUser }) {
          console.log('User signed in:', {
            userId: user.id,
            email: user.email,
            isNewUser,
          });
        },
        async signOut({ session, token }) {
          console.log('User signed out:', {
            userId: session?.user?.id || token?.sub,
          });
        },
      },

      // Enable debug logging in development
      debug: process.env.NODE_ENV === 'development',

      // Security settings
      secret: process.env.NEXTAUTH_SECRET,
    };

    return config;
  } catch (error) {
    console.error('Failed to initialize NextAuth with D1:', error);

    // Fallback configuration without database adapter
    // This allows the app to start even if D1 isn't available
    return {
      providers: [
        GithubProvider({
          clientId: process.env.GITHUB_CLIENT_ID!,
          clientSecret: process.env.GITHUB_CLIENT_SECRET!,
        }),
      ],
      session: {
        strategy: 'jwt', // Fallback to JWT sessions
      },
      pages: {
        signIn: '/auth/signin',
        error: '/auth/auth-code-error',
      },
      secret: process.env.NEXTAUTH_SECRET,
    };
  }
}

// Create NextAuth handler with configuration
const handler = NextAuth(getAuthConfig());

// Export for App Router
export { handler as GET, handler as POST };
