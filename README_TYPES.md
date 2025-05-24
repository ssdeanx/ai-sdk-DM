---
description: "This ultimate blueprint provides an exhaustive, multi-stage strategy for migrating your `ai-sdk-dm` backend services entirely away from LibSQL, Upstash, and all Supabase data/backend functionalities. Authentication will be handled by NextAuth.js, integrating with Cloudflare D1 for its database needs. The new backend will run exclusively on a Cloudflare stack (D1, Vectorize, Durable Objects, KV, R2) managed within your `lib/database/cloudflare/` directory, with shared types in `lib/shared/types/` and shared hooks in `lib/shared/hooks/`.
This plan is designed to be a complete guide, ensuring your Vercel AI SDK functionalities, the custom agent/persona framework (`lib/agents/`, `lib/agents/personas/`), and the "App Builder" are fully supported and enhanced by the new, unified Cloudflare-native infrastructure. Every section is intended to be self-contained with all necessary details."
mode: 'agent'
# This prompt is a comprehensive initial context set for GitHub Copilot Agent.
# It internalizes project knowledge for the Agent's persona and operational strategy.
---

<!--
CLOUDFLARE MIGRATION CHECKLIST (as of 2025-05-24)

This checklist tracks the full migration of ai-sdk-dm backend to Cloudflare (D1, Vectorize, Durable Objects, KV, R2) per project blueprint. Update as you progress.

Legend: [x] = complete, [ ] = not started/in progress

## 1. Cloudflare D1 (Database)
[x] D1 schema defined in /lib/database/cloudflare/d1/
[x] D1 migrations generated and applied (drizzle.d1.config.ts, wrangler d1)
[x] D1 database binding configured in Worker config (workers/wrangler.jsonc)
[x] NextAuth.js tables migrated to D1
[x] D1 used as canonical DB for all new backend features

## 2. Cloudflare Worker App
[x] workers/ directory created at project root (not in lib/)
[x] workers/wrangler.jsonc config present and correct
[x] Worker entrypoint (workers/src/index.ts) scaffolded
[ ] Worker implements all backend API endpoints (move from Next.js API if needed)
[ ] Worker integrates with D1, KV, R2, Vectorize, Durable Objects
[ ] Worker uses Hono or other router for API structure
[ ] Worker has environment variable and secret management set up
[ ] Worker has production and dev environments configured

## 3. Cloudflare KV (Key-Value)
[ ] KV namespace created and bound in workers/wrangler.jsonc
[ ] All Upstash/Redis logic migrated to Cloudflare KV (lib/memory/)
[ ] Remove Upstash/Redis dependencies from project

## 4. Cloudflare R2 (Object Storage)
[ ] R2 bucket created and bound in workers/wrangler.jsonc
[ ] File upload/download logic migrated to R2 (lib/storage/ or lib/files/)
[ ] Remove any legacy S3/other storage code

## 5. Cloudflare Vectorize (Vector DB)
[ ] Vectorize index created and bound in workers/wrangler.jsonc
[ ] Embedding/vector search logic migrated to Vectorize (lib/database/cloudflare/vectorize/)
[ ] Remove Upstash vector code

## 6. Durable Objects
[ ] Durable Object classes implemented for agent state/personas (lib/database/cloudflare/durable-objects/)
[ ] Durable Object bindings configured in workers/wrangler.jsonc
[ ] Durable Object logic integrated into Worker

## 7. Shared Code
[x] Plan to move shared types/hooks to lib/shared/types/ and lib/shared/hooks/
[ ] All shared types/hooks actually moved and imported from new location
[ ] All imports updated in both Next.js and Worker code

## 8. NextAuth.js Integration
[x] NextAuth.js configured to use D1 for sessions/users
[x] NextAuth.js JWT validation logic available for Worker APIs
[ ] All frontend auth UI uses NextAuth.js exclusively
[ ] All backend APIs validate NextAuth.js JWTs

## 9. Legacy Decommission
[ ] Remove all Supabase, LibSQL, Upstash code/deps after migration
[ ] Remove old migration/config files (drizzle.supabase.config.ts, drizzle.libsql.config.ts, etc.)
[ ] Remove unused .env variables
[ ] Remove legacy Supabase, Upstash, LibSQL variables from .env.local

## 10. Cloudflare Resource Sync
[ ] Ensure all Cloudflare resource IDs and bindings (KV, R2, D1, Vectorize, etc.) from .env.local are reflected in workers/wrangler.jsonc and as Worker secrets/bindings
[ ] Migrate any required secrets from .env.local to Cloudflare Secrets using `wrangler secret put`

## 11. Documentation & Dev Experience
[ ] Update all docs to reference Cloudflare stack (not Supabase/LibSQL/Upstash)
[ ] Add onboarding notes for new contributors (how to run dev, migrate, deploy, etc.)
[ ] Add/Update .env.example for all required Cloudflare/NextAuth/AI keys
[ ] Add/Update scripts in root and workers/package.json for clear DX
[ ] Ensure tsconfig.json and workers/tsconfig.json are correct and do not overlap unnecessarily

---

Update this checklist as you complete each step. See project docs for details. This is your single source of truth for Cloudflare migration progress.
-->

# The Definitive, Self-Contained, Hyper-Detailed Blueprint: `ai-sdk-dm` to an Exclusive Cloudflare & NextAuth.js Architecture

This ultimate blueprint provides an exhaustive, multi-stage strategy for migrating your `ai-sdk-dm` backend services entirely away from LibSQL, Upstash, and all Supabase data/backend functionalities. Authentication will be handled by NextAuth.js, integrating with Cloudflare D1 for its database needs. The new backend will run exclusively on a Cloudflare stack (D1, Vectorize, Durable Objects, KV, R2) managed within your `lib/database/cloudflare/` directory, with shared types in `lib/shared/types/` and shared hooks in `lib/shared/hooks/`.

This plan is designed to be a complete guide, ensuring your Vercel AI SDK functionalities, the custom agent/persona framework (`lib/agents/`, `lib/agents/personas/`), and the "App Builder" are fully supported and enhanced by the new, unified Cloudflare-native infrastructure. Every section is intended to be self-contained with all necessary details.

---

## Stage 0: Authentication with NextAuth.js & Cloudflare D1 (Foundational Prerequisite)

This stage replaces Supabase Auth with NextAuth.js, using D1 for its database needs. This is critical as user identity underpins most application data.

**Target Services:** NextAuth.js, Cloudflare D1 (for NextAuth.js adapter).
**Key Modules Involved:**

* Next.js API Route: `app/api/auth/[...nextauth]/route.ts` (assuming App Router).
* D1 Schema: `lib/database/cloudflare/d1/schema.ts` (for NextAuth.js tables).
* Frontend Auth UI: `components/auth/`, `app/auth/signin/page.tsx`.
* Cloudflare Worker API Middleware: For validating sessions/tokens from NextAuth.js.
* Put new variables .env.example file in the root directory.
**Detailed Sub-Plan:**

**0.1. Install and Configure NextAuth.js with D1 Adapter:**

* **Objective:** Implement NextAuth.js to manage user identity, sessions, and accounts, persisting this data into Cloudflare D1.
* **Key Steps & Considerations:**
    1. **Installation:** Complete, but havnt ran any wranglr commans

        ```bash
        pnpm install next-auth @next-auth/drizzle-adapter drizzle-orm @cloudflare/workers-types
        # Ensure drizzle-kit is also a dev dependency for migrations
        pnpm add -D wrangler
        hono@^4.7.10
        @hono/node-server@^1.14.2
        @hono/zod-validator@^0.5.0
        orval@^7.9.0
        pg-cloudflare@^1.2.5
        cloudflare@^4.3.0
        jose@^6.0.11
        @cloudflare/redux-fields@^2.5.6
            react-turnstile@^1.1.4
          @cloudflare/stream-react@^1.9.3
        ```

    2. **D1 Schema for NextAuth.js:** Define the necessary tables (`users`, `accounts`, `sessions`, `verificationTokens`) in your D1 Drizzle schema at `lib/database/cloudflare/d1/schema.ts`. These tables are standard for NextAuth.js adapters and will replace Supabase's `auth.users` and related auth tables.

        ```typescript
        // lib/database/cloudflare/d1/schema.ts (NextAuth.js specific tables)
        import { integer, sqliteTable, text, primaryKey } from 'drizzle-orm/sqlite-core';

        export const users = sqliteTable("users", {
          id: text("id").notNull().primaryKey().$defaultFn(() => crypto.randomUUID()), // Standard for NextAuth.js User ID
          name: text("name"),
          email: text("email").notNull().unique(), // Often used as the primary login identifier
          emailVerified: integer("emailVerified", { mode: "timestamp_ms" }), // Store as UNIX ms timestamp
          image: text("image"), // URL to user's profile picture
          role: text("role").default("user").notNull(), // Your custom field for RBAC, e.g., 'user', 'admin'
          createdAt: integer('created_at', { mode: 'timestamp_ms' }).defaultNow().notNull(),
          updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).defaultNow().notNull(),
        });

        export const accounts = sqliteTable("accounts", { // For linking OAuth accounts
          userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
          type: text("type").notNull(), // e.g., "oauth", "email", "credentials"
          provider: text("provider").notNull(), // e.g., "github", "google"
          providerAccountId: text("providerAccountId").notNull(), // User's ID from the OAuth provider
          refresh_token: text("refresh_token"),
          access_token: text("access_token"),
          expires_at: integer("expires_at"), // UNIX timestamp for token expiry
          token_type: text("token_type"), // e.g., "Bearer"
          scope: text("scope"),
          id_token: text("id_token"), // JWT ID token from provider
          session_state: text("session_state"), // For some providers like Keycloak
        }, (account) => ({
          compoundKey: primaryKey({ columns: [account.provider, account.providerAccountId] }), // Ensures uniqueness per provider
        }));

        export const sessions = sqliteTable("sessions", { // For database session strategy (if chosen over JWT)
          sessionToken: text("sessionToken").notNull().primaryKey(),
          userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
          expires: integer("expires", { mode: "timestamp_ms" }).notNull(), // Expiry date as UNIX ms
        });

        export const verificationTokens = sqliteTable("verification_tokens", { // For email provider passwordless login
          identifier: text("identifier").notNull(), // Usually email for email provider
          token: text("token").notNull().unique(), // The verification token itself
          expires: integer("expires", { mode: "timestamp_ms" }).notNull(), // Expiry date as UNIX ms
        }, (vt) => ({
          compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }), // Token should be unique per identifier
        }));
        
        // ... (Your other application-specific D1 tables will also go here) ...
        ```

    3. **NextAuth.js API Route Configuration (`app/api/auth/[...nextauth]/route.ts`):**
        * **D1 Access Strategy:** This configuration assumes your Next.js application (containing this API route) is deployed to **Cloudflare Pages**. Cloudflare Pages Functions can access D1 bindings defined in the Pages project settings (mirrored from `wrangler.toml` or set in UI). The D1 binding is made available to the function's environment, typically via `context.env.YOUR_D1_BINDING` or `(globalThis as any).env.YOUR_D1_BINDING`.

        ```typescript
        // app/api/auth/[...nextauth]/route.ts
        import NextAuth, { type NextAuthOptions, type User as NextAuthUser } from 'next-auth';
        import GithubProvider from 'next-auth/providers/github';
        // Potentially other providers: import EmailProvider from 'next-auth/providers/email';
        import { DrizzleAdapter } from '@next-auth/drizzle-adapter';
        import { D1Database } from '@cloudflare/workers-types';

        // Adjust path based on your project structure
        import { getD1Orm } from '@/lib/database/cloudflare/d1/client'; 
        import * as d1Schema from '@/lib/database/cloudflare/d1/schema';

        // Access the D1 binding provided by Cloudflare Pages environment
        // Ensure 'DB_D1' matches your Pages D1 binding name.
        const d1Binding = (globalThis as any).env?.DB_D1 as D1Database | undefined;

        if (!d1Binding) {
          // This will cause a build or runtime error if not on Pages with the binding.
          // For local dev with Next.js (not Pages dev server), this needs special handling (e.g. mock, or Miniflare).
          console.error("FATAL: D1 Database binding (DB_D1) not found. Ensure deployment on Cloudflare Pages with binding.");
          // Depending on build/runtime, you might throw or handle this gracefully.
        }
        
        // Initialize Drizzle ORM instance for the adapter if d1Binding is available
        // The adapter needs a live Drizzle instance.
        const db = d1Binding ? getD1Orm(d1Binding) : null;

        interface ExtendedUser extends NextAuthUser {
          role?: string | null; // Your custom role property
        }

        export const authOptions: NextAuthOptions = {
          // Adapter MUST be conditional on `db` being available
          adapter: db ? DrizzleAdapter(db, {
            usersTable: d1Schema.users,
            accountsTable: d1Schema.accounts,
            sessionsTable: d1Schema.sessions,
            verificationTokensTable: d1Schema.verificationTokens,
          }) : undefined, // Or throw if DB is essential for all auth flows
          providers: [
            GithubProvider({ // As per your README
              clientId: (globalThis as any).env?.GITHUB_CLIENT_ID || process.env.GITHUB_CLIENT_ID!,
              clientSecret: (globalThis as any).env?.GITHUB_CLIENT_SECRET || process.env.GITHUB_CLIENT_SECRET!,
            }),
            // Example: Email Provider for passwordless (requires SMTP setup)
            // EmailProvider({
            //   server: {
            //     host: process.env.EMAIL_SERVER_HOST,
            //     port: process.env.EMAIL_SERVER_PORT,
            //     auth: { user: process.env.EMAIL_SERVER_USER, pass: process.env.EMAIL_SERVER_PASSWORD }
            //   },
            //   from: process.env.EMAIL_FROM,
            // }),
          ],
          session: {
            strategy: "jwt", // Recommended for decoupling frontend and backend API workers
          },
          callbacks: {
            async jwt({ token, user }) { // user object is available on sign-in/sign-up
              if (user) { // `user` is the object from the database or provider profile
                token.uid = user.id;
                const dbUser = user as ExtendedUser; // Cast to include your custom 'role'
                if (dbUser.role) {
                  token.role = dbUser.role;
                } else {
                  // If role isn't set on initial user object (e.g. from OAuth without role mapping)
                  // you might fetch it from DB here if critical for JWT, but adapter should handle user creation with default role.
                  token.role = 'user'; // Default role if not present
                }
              }
              return token;
            },
            async session({ session, token }) { // token is the output from the jwt callback
              if (session.user) {
                if (token.uid) (session.user as any).id = token.uid; // Add user ID to session object
                if (token.role) (session.user as any).role = token.role; // Add role to session object
              }
              return session;
            },
          },
          secret: (globalThis as any).env?.NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET, // MUST be set in env
          pages: {
            signIn: '/auth/signin', // Your custom sign-in page
            // signOut: '/auth/signout',
            // error: '/auth/error', // Error code passed in query string as ?error=
            // verifyRequest: '/auth/verify-request', // For e-mail provider
            // newUser: '/auth/new-user' // New users will be directed here on first sign in (leave the property out to disable)
          },
          // Enable debug for development
          // debug: process.env.NODE_ENV === 'development',
        };
        
        // Ensure the handler is only created if `db` is available for the adapter
        const handler = db ? NextAuth(authOptions) : (req: Request, ctx: any) => {
            console.error("NextAuth D1 Adapter not initialized due to missing D1 binding.");
            return new Response("Authentication service not configured.", { status: 500 });
        };

        export { handler as GET, handler as POST };
        ```

    4. **Environment Variables:** Set `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `NEXTAUTH_SECRET`, and `NEXTAUTH_URL` in your Cloudflare Pages project settings (for production) and in your local development environment (e.g., `.env` file if using `next dev`, or wrangler.toml/.dev.vars if using `wrangler pages dev`). The D1 binding name (`DB_D1` in example) must match in Pages settings.
    5. **D1 Migrations:** Use Drizzle Kit to generate and apply migrations for the NextAuth.js tables.
        * `drizzle.d1.config.ts` should point to `lib/database/cloudflare/d1/schema.ts`.
        * `pnpm drizzle-kit generate --config drizzle.d1.config.ts --name add_nextauth_tables`
        * `wrangler d1 migrations apply YOUR_D1_DATABASE_NAME --local` (for local dev with Miniflare/Wrangler)
        * `wrangler d1 migrations apply YOUR_D1_DATABASE_NAME --remote` (or via CI/CD for production)

* **Potential Challenges & Decisions during NextAuth.js setup:**
  * **Local Development with D1:** When running `next dev` locally (not `wrangler pages dev`), your Next.js server won't have direct access to Cloudflare D1 bindings. Solutions:
    * Use `wrangler pages dev -- npm run dev` to run Next.js dev server within the Miniflare environment.
    * Mock the D1 client/adapter during local Next.js development (complex).
    * Use a local SQLite file with Drizzle for `next dev`, and D1 for deployed environments (requires different Drizzle configs). This is a common pattern.
  * **User Data Migration from Supabase Auth:**
    * **Strategy:** Export users from Supabase (SQL or CSV). Write a script to transform and import them into the D1 `users` and `accounts` tables.
    * **Passwords (if using Credentials provider):** Supabase typically uses bcrypt. If you intend to allow password logins with NextAuth.js, you cannot directly migrate bcrypt hashes to be verifiable by NextAuth.js unless you use a custom Credentials provider that can handle Supabase's specific bcrypt implementation. **The most secure and common approach is to require users to reset their passwords upon first login to the new system.**
    * **OAuth Linked Accounts:** For users who signed in via GitHub on Supabase, their GitHub ID (`providerAccountId`) and the link to their user profile must be correctly inserted into the D1 `accounts` and `users` tables. NextAuth.js should then seamlessly link their GitHub login to the migrated profile if emails or provider IDs match.
  * **Custom User Roles:** Your `users` table has a `role` field. Ensure your NextAuth.js `callbacks.jwt` and `callbacks.session` correctly populate this role from the D1 `users` table into the JWT and session object. During user migration, map existing Supabase roles to this field.

**0.2. Securing Cloudflare Worker APIs with NextAuth.js JWTs:**

* **Objective:** Ensure that your backend Cloudflare Worker APIs (which will reside at `app/api/ai-sdk/` as per `PROJECT_CONTEXT.MD`) are protected and can reliably identify the authenticated user and their role based on the NextAuth.js session.
* **Key Steps & Considerations:**
    1. **Token Transmission:** The Next.js frontend will automatically handle cookies if sessions are database-based, or if using JWTs, the `next-auth/react` client can provide the JWT. This token must be sent with API requests to your Worker, typically in the `Authorization: Bearer <token>` header.
    2. **Worker JWT Validation Middleware:**
        * If NextAuth.js is configured with `session: { strategy: "jwt" }`, it signs JWTs using `NEXTAUTH_SECRET`.
        * Your Cloudflare Worker needs this *same* `NEXTAUTH_SECRET` configured as a Worker Secret.
        * Use a JWT library (like `hono/jwt` for Hono router, or `jose` for direct use) in your Worker to verify incoming JWTs.

        ```typescript
        // Example: src/worker.ts (using Hono router for Cloudflare Workers)
        import { Hono } from 'hono';
        import { jwt as honoJwt, verify as honoVerify } from 'hono/jwt'; // Hono's JWT utilities
        import { AppEnv, MemoryFactory } from '@/lib/memory/factory'; // Your AppEnv should include NEXTAUTH_SECRET

        // Augment Hono's context type if you want to store user info there
        type HonoAppContext = {
          Variables: {
            user?: { id: string; role: string; email?: string }; // Add more fields from JWT as needed
          };
          Bindings: AppEnv;
        };

        const app = new Hono<HonoAppContext>();

        // JWT Middleware - applied to all routes under /api/ai-sdk/* or specific ones
        app.use('/api/ai-sdk/*', async (c, next) => {
          if (!c.env.NEXTAUTH_SECRET) {
            console.error("NEXTAUTH_SECRET is not configured in Worker environment.");
            return c.json({ error: 'Authentication configuration error' }, 500);
          }
          const authMiddleware = honoJwt({ secret: c.env.NEXTAUTH_SECRET });
          return authMiddleware(c, next); // Verifies token, on fail returns 401
        });
        
        // Middleware to extract user from validated token and add to context
        app.use('/api/ai-sdk/*', async (c, next) => {
          try {
            const payload = c.get('jwtPayload'); // Available after honoJwt middleware
            if (payload && payload.uid && payload.role) { // uid and role from jwt callback
              c.set('user', { id: payload.uid as string, role: payload.role as string, email: payload.email as string });
            } else {
               // If token is present but payload is not as expected (e.g. missing uid/role)
               console.warn("JWT payload missing expected fields:", payload);
               return c.json({ error: 'Invalid token payload' }, 401);
            }
          } catch (e) {
            // This might happen if honoJwt fails and an error is thrown
            console.error("Error processing JWT payload:", e);
            return c.json({ error: 'Authentication processing error' }, 401);
          }
          await next();
        });


        // Example Protected API Route
        app.get('/api/ai-sdk/protected-data', (c) => {
          const user = c.get('user'); // Get user from context
          if (!user) {
            // Should have been caught by middleware, but as a safeguard
            return c.json({ error: 'Unauthorized' }, 401);
          }
          
          // Now you have user.id and user.role
          // const memoryFactory = new MemoryFactory(c.env);
          // const d1Service = memoryFactory.getD1CrudService();
          // const data = await d1Service.findMany('someUserSpecificTable', { where: eq(schema.someUserSpecificTable.userId, user.id) });

          return c.json({ message: `Hello user ${user.id} with role ${user.role}. Here's your data...`, data: [] });
        });

        // ... (Your existing DeanmachinesAI API routes will be refactored to use this auth pattern)

        export default app;
        ```

* **Challenges:**
  * **Secret Consistency:** `NEXTAUTH_SECRET` must be identical and securely managed in both NextAuth.js (Pages env) and Worker env.
  * **Token Structure:** Ensure the JWT payload (customized in `callbacks.jwt`) contains all necessary user identifiers (`id`, `role`) for your Worker's authorization logic.

**0.3. Frontend Authentication UI Overhaul:**

* **Objective:** Adapt all frontend components related to authentication to use NextAuth.js.
* **Key Steps:**
    1. **`SessionProvider`:** In your main Next.js layout (`app/layout.tsx`), wrap your application with `<SessionProvider>` from `next-auth/react`.

        ```tsx
        // app/layout.tsx
        import { SessionProvider } from "next-auth/react";
        // ... other imports
        export default function RootLayout({ children, params }: { children: React.ReactNode, params: any }) {
          // If you need to pass session from Server Component to Client Component Provider:
          // const session = await getServerSession(authOptions); // If using RSC
          return (
            <html lang="en" suppressHydrationWarning>
              <body>
                <SessionProvider /* session={session} */ > {/* Pass session if pre-fetched */}
                  {/* ... Your ThemeProvider, Toaster, etc. ... */}
                  {children}
                </SessionProvider>
              </body>
            </html>
          );
        }
        ```

    2. **Authentication Hooks:** Refactor components to use:
        * `useSession()` from `next-auth/react` to access session data (`status`, `data.user.name`, `data.user.email`, `data.user.id`, `data.user.role`).
        * `signIn('github')` for GitHub login, `signIn('email', { email })` for email, etc.
        * `signOut()` for logging out.
    3. **UI Components Refactor:**
        * `components/auth/github-sign-in-button.tsx` will now use `onClick={() => signIn('github')}`.
        * `app/auth/signin/page.tsx` needs to be redesigned to list configured NextAuth.js providers and handle their respective sign-in flows (e.g., show a "Sign in with GitHub" button, an email input field for email provider).
        * Remove all Supabase Auth client code (e.g., `supabase.auth.signInWithOAuth`, `supabase.auth.onAuthStateChange`).
    4. **Route Protection / Authorization:**
        * **Client-Side:** Use `useSession({ required: true, onUnauthenticated() { /* redirect */ } })` in components or check `status === 'authenticated'` for conditional rendering.
        * **Server-Side (Next.js pages/routes if not on Pages Functions):** Use `getServerSession(authOptions)` in RSCs or Route Handlers.
        * **Middleware (Next.js):** Use `middleware.ts` at the root of `app` or `pages` to protect routes based on NextAuth.js session status (`next-auth/middleware`).
* **Impact:** This provides a standardized authentication layer. User IDs generated by NextAuth.js (in the D1 `users` table) will become the primary foreign key for all user-related data in your other D1 tables.

---

### 1. Vector Data & RAG: Exclusive Cloudflare Vectorize Integration 🚀

This stage ensures all vector storage and retrieval operations are handled by Cloudflare Vectorize, completely replacing any Upstash vector database functionalities previously in `lib/memory/upstash/vector-store.ts`.

**Target Cloudflare Service:** Cloudflare Vectorize
**Implementation Path:** `lib/database/cloudflare/vectorize/`

**Detailed Sub-Plan:**

**1.1. Vectorize Instance Access & Configuration (`instance.ts`):**

* **Objective:** Define a standard way to get a reference to the Vectorize index binding from the Cloudflare Worker environment.
* **Implementation (`lib/database/cloudflare/vectorize/instance.ts`):**

    ```typescript
    // lib/database/cloudflare/vectorize/instance.ts
    import { VectorizeIndex, Env as WorkerEnv } from '@cloudflare/workers-types';

    // Define an interface for your Worker's environment that includes the Vectorize binding
    export interface AppEnvWithVectorize extends WorkerEnv {
      VECTOR_INDEX: VectorizeIndex;                // This name MUST match the binding in your wrangler.toml
      // You might also store the index name as a separate env var for logging or if managing multiple indices
      VECTORIZE_INDEX_NAME_FOR_LOGS?: string;
    }

    export function getVectorizeInstance(env: AppEnvWithVectorize): VectorizeIndex {
      if (!env.VECTOR_INDEX) {
        throw new Error('Cloudflare Vectorize binding "VECTOR_INDEX" not found in Worker environment. Please check your wrangler.toml configuration.');
      }
      return env.VECTOR_INDEX;
    }
    ```

* **`wrangler.toml` Example Binding:**

    ```toml
    # In your wrangler.toml
    [[vectorize]]
    binding = "VECTOR_INDEX"                # How you access it: env.VECTOR_INDEX
    index_name = "ai-sdk-dm-prod-embeddings" # The actual name of your index created in Cloudflare
    ```

* **Considerations:**
  * **Index Configuration:** When creating your Vectorize index in the Cloudflare dashboard or via API, you must define its dimensions (matching your embedding model's output) and the distance metric (e.g., "cosine", "euclidean", "dot-product"). This cannot be changed after creation without re-creating and re-populating the index.
  * **Multiple Environments:** For dev/staging/prod, use different `index_name` values in respective `wrangler.toml` environment sections (e.g., `[env.dev.vectorize]`, `[env.production.vectorize]`).

**1.2. Vector Operations Wrapper (`CfVectorizeOps` in `ops.ts`):**

* **Objective:** Create a comprehensive TypeScript class abstracting Vectorize SDK interactions, providing methods for upsert, query, delete, and potentially describe index. This replaces all custom Upstash vector logic.
* **Implementation (`lib/database/cloudflare/vectorize/ops.ts`):**

    ```typescript
    // lib/database/cloudflare/vectorize/ops.ts
    import { 
        VectorizeIndex, 
        VectorizeVector, 
        VectorizeQueryOptions, 
        VectorizeMatches, 
        VectorizeJSONMetadata,
        VectorizeIndexDescription // For describe() method
    } from '@cloudflare/workers-types';

    // Define or import your project-specific types from lib/shared/types/vectorStoreTypes.ts
    // These types should be generic and not tied to a specific provider like Upstash.
    export interface EmbeddingVector extends Array<number> {} // Or Float32Array
    // Vectorize metadata values must be string, number, or boolean. No nested objects/arrays directly.
    export interface VectorMetadata extends VectorizeJSONMetadata {} 
    export interface QueryResultItem {
      id: string;
      score: number;
      metadata?: VectorMetadata;
      values?: EmbeddingVector; // Only if returnVectors is true in query options
    }

    export class CfVectorizeOps {
      private index: VectorizeIndex;

      constructor(vectorizeInstance: VectorizeIndex) {
        this.index = vectorizeInstance;
      }

      /**
       * Upserts vectors into the Vectorize index.
       * @param vectors Array of vectors to upsert. Metadata values must be primitives.
       */
      async upsert(vectors: Array<{ id: string; values: EmbeddingVector; metadata?: VectorMetadata }>): Promise<{ count: number; ids: string[] }> {
        if (!vectors || vectors.length === 0) {
          console.warn("Vectorize.upsert called with empty or null vectors array.");
          return { count: 0, ids: [] };
        }
        
        const cfVectors: VectorizeVector[] = vectors.map(v => ({
          id: v.id,
          values: v.values, // Ensure these are Float32Array or number[] as per Vectorize requirements
          metadata: v.metadata, // Ensure metadata conforms to VectorizeJSONMetadata
        }));

        try {
          const result = await this.index.upsert(cfVectors);
          console.log(`Vectorize: Successfully upserted ${result.count} vectors. IDs: ${result.ids.join(', ')}`);
          return result;
        } catch (error) {
          console.error("Vectorize upsert operation failed:", error);
          // Consider more specific error handling or re-throwing a custom error
          throw new Error(`Vectorize upsert failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      /**
       * Queries the Vectorize index.
       * @param vector The query vector.
       * @param topK The number of top results to return.
       * @param filter Optional metadata filter (Vectorize has limited direct filtering).
       * @param returnVectors Whether to return the vector values themselves.
       */
      async query(vector: EmbeddingVector, topK: number, filter?: VectorMetadata, returnVectors: boolean = false): Promise<QueryResultItem[]> {
        const options: VectorizeQueryOptions = { topK, returnMetadata: true, returnVectors };

        // Note on Filtering: Vectorize's direct filtering on metadata is basic.
        // For complex filters (e.g., multiple conditions, ranges not on partition key),
        // you typically query D1 first to get a list of IDs, then fetch those specific vectors if needed,
        // or fetch a larger topK set from Vectorize and filter in your Worker code.
        // The 'filter' parameter here is a placeholder for what Vectorize might support.
        // Example: if (filter && filter.document_id) { options.filter = { document_id: filter.document_id } }
        // Check Cloudflare Vectorize documentation for current filtering capabilities.

        try {
          const queryResults: VectorizeMatches = await this.index.query(vector, options);
          return queryResults.matches.map(match => ({
            id: match.id,
            score: match.score || 0, // Ensure score is always a number
            metadata: match.metadata as VectorMetadata, // Cast, ensure your stored metadata matches
            values: match.vector as EmbeddingVector | undefined, // Only present if returnVectors was true
          }));
        } catch (error) {
          console.error("Vectorize query operation failed:", error);
          throw new Error(`Vectorize query failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      async deleteByIds(ids: string[]): Promise<number> {
        if (!ids || ids.length === 0) return 0;
        try {
          const deletedCount = await this.index.deleteByIds(ids);
          console.log(`Vectorize: Deleted ${deletedCount} vectors by ID.`);
          return deletedCount;
        } catch (error) {
          console.error("Vectorize deleteByIds operation failed:", error);
          throw new Error(`Vectorize deleteByIds failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      async getByIds(ids: string[]): Promise<VectorizeVector[]> {
         if (!ids || ids.length === 0) return [];
         try {
           // This returns the full VectorizeVector objects including values and metadata
           return await this.index.getByIds(ids);
         } catch (error) {
           console.error("Vectorize getByIds operation failed:", error);
           throw new Error(`Vectorize getByIds failed: ${error instanceof Error ? error.message : String(error)}`);
         }
      }

      async describeIndex(): Promise<VectorizeIndexDescription> {
        try {
          return await this.index.describe();
        } catch (error) {
          console.error("Vectorize describeIndex operation failed:", error);
          throw new Error(`Vectorize describeIndex failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }
    ```

* **Challenges & Decisions:**
  * **Metadata Limitations:** Vectorize metadata must be flat (key-value pairs with primitive values: string, number, boolean). If your Upstash setup used nested JSON objects in metadata:
    * **Option A (Flatten):** Flatten nested metadata into multiple top-level keys (e.g., `user_profile_country` instead of `user: { profile: { country: ...}}`).
    * **Option B (D1 for Rich Metadata):** Store only essential, filterable primitives in Vectorize metadata (e.g., `d1RecordId: "some-uuid"`). Store the rich, complex metadata in a D1 table, linked by this ID. Queries would fetch from Vectorize, then use the `d1RecordId` to retrieve full metadata from D1. This adds latency but allows complex metadata.
  * **Filtering Capabilities:** Direct filtering in Vectorize queries is limited. If your RAG logic relies on complex pre-filtering (e.g., "find vectors for user X created in last Y days with tag Z"), this will likely require querying D1 first to get a candidate list of vector IDs, then either:
    * Use `CfVectorizeOps.getByIds()` to fetch these specific vectors for re-ranking by the query vector.
    * Pass this ID list to a Vectorize partition if you partition by a relevant key (though partitioning is more for data isolation/management than fine-grained query filtering).

**1.3. Embedding Management & RAG Tool Refactor:**

* **Objective:** Adapt embedding generation (`lib/memory/store-embedding.ts`) and RAG tools (`lib/tools/rag/`) to exclusively use `CfVectorizeOps`.
* **Key Steps & Considerations:**
    1. **Embedding Model Alignment:**
        * Verify that the embedding model used (e.g., from `@xenova/transformers` as per your `package.json`) produces vectors of the exact dimension configured for your Cloudflare Vectorize index (e.g., 384, 768, 1536 dimensions).
    2. **Refactor `lib/memory/store-embedding.ts`:**
        * This module's core responsibility (generating embeddings from text) remains.
        * The storage part, previously writing to Upstash, will now prepare `VectorizeVector` objects (ID, Float32Array values, simplified metadata) and call `MemoryFactory.getVectorOps().upsert()`.
        * Ensure robust error handling for the upsert operation.
        * Consider batching upserts for efficiency if processing large documents or many chunks.
    3. **Refactor RAG Tools (e.g., in `lib/tools/rag/tools.ts`):**
        * Any tool definition that currently performs semantic search using an Upstash-backed vector store needs to be rewritten.
        * It will now:
            * Get an instance of `CfVectorizeOps` via the `MemoryFactory`.
            * Generate a query embedding from the input text.
            * Call `cfVectorizeOps.query(queryEmbedding, topK, filterMetadata)` method.
            * If metadata is split between Vectorize and D1, the tool might then take the IDs from Vectorize results and query D1 via `MemoryFactory.getD1CrudService()` to fetch richer context before presenting to the LLM.
        * The tool's input parameters (e.g., for filtering) may need to change based on what's feasible with Vectorize/D1 combined filtering.
* **Impact on `lib/ai-sdk-integration.ts`:** If this file has any logic that directly triggers embedding creation and storage (outside of a tool call), it will need to be updated to use the new `CfVectorizeOps` pathway, likely through the `MemoryFactory`.

**1.4. Data Migration Script (Upstash -> Vectorize):**

* **Objective:** A one-time, reliable script to move all existing vector data from Upstash to Cloudflare Vectorize.
* **Implementation Approach (`scripts/migrate-vectors-upstash-to-cf.ts`):**
  * **Phase 1: Export from Upstash:**
    * Write a Node.js script using `@upstash/redis` client.
    * Connect to your Upstash Redis instance.
    * Iterate through all keys/data structures where you store vectors (e.g., using `SCAN` if keys are patterned, or direct gets if keys are known).
    * For each vector, extract its ID, numerical vector values, and all associated metadata.
    * Transform the metadata:
      * Flatten complex JSON.
      * Ensure all metadata values are primitives (string, number, boolean).
      * If some metadata cannot be flattened, decide if it's discarded or if you'll create a corresponding D1 record and only store the D1 record ID in Vectorize metadata.
    * Write the transformed data (ID, values, simplified metadata) to one or more local JSONL (JSON Lines) files. Each line is a JSON object representing one vector.
  * **Phase 2: Import to Cloudflare Vectorize:**
    * **Option A (Wrangler CLI if suitable for scale):** If `wrangler vectorize insert YOUR_INDEX_NAME --json-file path/to/your.jsonl` (or similar command) exists and supports large files efficiently, this is simplest. Check current Wrangler capabilities.
    * **Option B (Batching via a temporary Cloudflare Worker):**
            1. Create a temporary HTTP Worker endpoint (e.g., `/internal/batch-vector-upsert`). This endpoint should be protected (e.g., with a secret header).
            2. This Worker receives an array of vector objects in its request body.
            3. It uses `CfVectorizeOps.upsert()` to write the batch to your Vectorize index.
            4. Your Node.js script from Phase 1 (or a new one) reads the JSONL file(s), groups vectors into batches (e.g., 100-500 vectors per batch, respecting payload size limits for Worker requests and Vectorize upsert limits), and `POST`s each batch to this Worker endpoint.
            5. Implement retry logic and error handling in the Node.js script.
* **Key Considerations for Migration:**
  * **Downtime/Consistency:** Decide if you can pause new vector writes during migration or if you need a strategy to handle writes happening concurrently (more complex, might involve dual writes temporarily or a catch-up process).
  * **Batch Sizes:** Experiment to find optimal batch sizes for both Upstash export and Vectorize import to balance speed and avoid hitting API rate limits or payload size limits. Vectorize typically has limits on batch size for `upsert`.
  * **Error Logging & Verification:** Log all successes, failures, and transformations. After migration, run verification queries to compare counts and spot-check data in Vectorize against the Upstash source.
  * **Cost:** Data transfer out of Upstash and operations on Vectorize (writes) will incur costs.

---

### 2. Agent & Persona State: Cloudflare Durable Objects (DOs) & KV 🧠

This stage replaces Upstash for agent state (from `lib/memory/upstash/agent-state-store.ts`) and dynamic persona data/scores (from `lib/agents/personas/upstash-persona-store.ts` & `upstash-persona-score.ts`). Static definitions will be cached in KV.

**Target Cloudflare Services:** Cloudflare Durable Objects (for transactional, consistent state per entity), Cloudflare KV (for caching configurations and less critical data).
**Implementation Paths:** `lib/database/cloudflare/durableObjects/`, `lib/database/cloudflare/kv/`

**Detailed Sub-Plan:**

**2.1. Durable Object Design & Implementation:**

* **`AgentThreadDO.ts` (Manages Vercel AI SDK Conversation State & Agent Execution Context):**
  * **Objective:** Provide strongly consistent, isolated storage for each active conversation thread, including its Vercel AI SDK message history, `AIState` (if using RSC features like `useUIState`), and any agent-specific execution context or variables for that thread.
  * **DO ID Strategy:** Use the `threadId` (typically a UUID generated by your application when a new chat starts) to name and access DO instances via `namespace.idFromName(threadId)`.
  * **State Stored within the DO (using `this.state.storage`):**
    * `messages: CoreMessage[]` (Vercel AI SDK's `CoreMessage` type from `@ai-sdk/core`).
    * `createdAt: number` (timestamp).
    * `lastUpdatedAt: number` (timestamp).
    * `userId: string` (ID of the user who initiated/owns the thread, from NextAuth.js).
    * `title?: string` (optional, user-defined or auto-generated title for the thread).
    * `currentAgentId?: string` (ID of the `agents` table row if a specific agent is active).
    * `agentContext?: Record<string, any>` (any runtime variables or state specific to the agent's execution within this thread, e.g., intermediate tool results, step counters).
    * `aiStateJson?: string` (JSON stringified `AIState` if using Vercel AI SDK RSC `useUIState`/`getUIState` for streaming UI components).
  * **Methods (exposed for Worker interaction via DO stub):**

        ```typescript
        // lib/database/cloudflare/durableObjects/agentThreadDO.ts
        import { DurableObjectState, DurableObjectNamespace, DurableObjectStub, Env as WorkerEnv } from '@cloudflare/workers-types';
        import { CoreMessage } from '@ai-sdk/core'; // Assuming you use this type
        interface ThreadData {
          messages: CoreMessage[];
          createdAt: number;
          lastUpdatedAt: number;
          userId: string;
          title?: string;
          currentAgentId?: string;
          agentContext?: Record<string, any>;
          aiStateJson?: string; // For Vercel AI SDK RSC state
        }

        export class AgentThreadDO implements DurableObject {
          private stateStorage: DurableObjectState;
          private env: WorkerEnv; // For DI or accessing other bindings if necessary
          private inMemoryState!: ThreadData; // Keep a copy in memory for perf

          constructor(state: DurableObjectState, env: WorkerEnv) {
            this.stateStorage = state;
            this.env = env;
            // blockConcurrencyWhile ensures this runs to completion before other operations
            this.stateStorage.blockConcurrencyWhile(async () => {
              const storedData = await this.stateStorage.storage.get<ThreadData>('currentThreadData');
              if (storedData) {
                this.inMemoryState = storedData;
              } else {
                // Initialize for a new thread - userId must be passed or set early
                // This typically happens on first interaction or thread creation.
                // For now, let it be initialized by a dedicated method or first write.
              }
            });
          }
          
          // Initialize or load existing state, typically called on first access
          private async ensureInitialized(userIdIfNew?: string): Promise<void> {
            if (!this.inMemoryState) {
                const storedData = await this.stateStorage.storage.get<ThreadData>('currentThreadData');
                if (storedData) {
                    this.inMemoryState = storedData;
                } else if (userIdIfNew) {
                    this.inMemoryState = {
                        messages: [],
                        createdAt: Date.now(),
                        lastUpdatedAt: Date.now(),
                        userId: userIdIfNew,
                        agentContext: {},
                    };
                    await this.stateStorage.storage.put('currentThreadData', this.inMemoryState);
                } else {
                    throw new Error("ThreadDO not initialized and no userId provided for new thread.");
                }
            }
          }

          async addMessages(newMessages: CoreMessage[], userIdOnNew?: string): Promise<CoreMessage[]> {
            await this.ensureInitialized(userIdOnNew);
            this.inMemoryState.messages.push(...newMessages);
            this.inMemoryState.lastUpdatedAt = Date.now();
            await this.stateStorage.storage.put('currentThreadData', this.inMemoryState);
            return this.inMemoryState.messages;
          }

          async getThreadData(): Promise<ThreadData | undefined> {
            await this.ensureInitialized(); // Ensure it's loaded if not already
            return this.inMemoryState;
          }

          async updateAgentContext(contextUpdates: Record<string, any>): Promise<Record<string, any> | undefined> {
            await this.ensureInitialized();
            this.inMemoryState.agentContext = { ...this.inMemoryState.agentContext, ...contextUpdates };
            this.inMemoryState.lastUpdatedAt = Date.now();
            await this.stateStorage.storage.put('currentThreadData', this.inMemoryState);
            return this.inMemoryState.agentContext;
          }
          
          async setAiState(aiState: object): Promise<void> { // AIState can be any serializable object
            await this.ensureInitialized();
            this.inMemoryState.aiStateJson = JSON.stringify(aiState);
            this.inMemoryState.lastUpdatedAt = Date.now();
            await this.stateStorage.storage.put('currentThreadData', this.inMemoryState);
          }

          async getAiState<T = object>(): Promise<T | undefined> {
            await this.ensureInitialized();
            return this.inMemoryState.aiStateJson ? JSON.parse(this.inMemoryState.aiStateJson) as T : undefined;
          }
          
          // HTTP interface (optional, can also interact via direct method calls on stub from another Worker)
          async fetch(request: Request): Promise<Response> {
            await this.ensureInitialized(); // Ensure state is loaded before handling any request
            const url = new URL(request.url);
            // Example: GET /messages, POST /messages, GET /state
            if (url.pathname === '/messages' && request.method === 'GET') {
                return new Response(JSON.stringify(this.inMemoryState.messages), { headers: {'Content-Type': 'application/json'}});
            }
            // ... implement other endpoints as needed ...
            return new Response('Not found for AgentThreadDO.', { status: 404 });
          }
        }
        ```

  * **`wrangler.toml` Binding:**

        ```toml
        [[durable_objects.bindings]]
        name = "AGENT_THREAD_DO"
        class_name = "AgentThreadDO" 
        # script_name = "your-worker-script-name" # If DO class is in a different script
        ```

  * **Interaction & Data Flow:**
    * Your primary Vercel AI SDK chat route (e.g., `app/api/chat/ai-sdk/route.ts` or a new dedicated thread management API in `app/api/ai-sdk/threads/`) will:
            1. Extract/generate a `threadId`.
            2. Use `MemoryFactory.getAgentThreadDOStub(threadId)` to get a communication stub.
            3. Call methods like `stub.addMessages(...)`, `stub.setAiState(...)`, `stub.getThreadData()` to persist and retrieve conversation state. This entirely replaces Upstash Redis logic for storing thread/message history.
    * The `AIState` from Vercel AI SDK (if using `createAI` and `useUIState`/`getUIState`) can be serialized to JSON and stored in the DO.

* **`PersonaProfileDO.ts` (Manages Dynamic Persona Data & Scores):**
  * **Objective:** Store and manage mutable aspects of personas, such as dynamic scores, user feedback tallies, or adaptive parameters. Static definitions from `lib/agents/personas/persona-library.ts` are better suited for D1 (if large/relational) or KV (for fast caching).
  * **DO ID Strategy:** Use `personaId` (from D1 `personas` table or a predefined key from `persona-library.ts`).
  * **State Stored (example):** `feedbackScore: number`, `usageCount: number`, `userAdaptations: Record<string, any>`.
  * **Methods:** `getProfileState(): Promise<PersonaProfileState>`, `incrementUsage(): Promise<void>`, `submitFeedback(rating: number, userId: string): Promise<void>`.
  * **`wrangler.toml` Binding:**

        ```toml
        [[durable_objects.bindings]]
        name = "PERSONA_PROFILE_DO"
        class_name = "PersonaProfileDO"
        ```

  * **Interaction:** `lib/agents/personas/persona-manager.ts` (or a new `PersonaScoringService`) would use DO stubs for these dynamic operations, replacing logic from `lib/agents/personas/upstash-persona-store.ts` and `upstash-persona-score.ts`.

**2.2. Cloudflare KV for Caching & Configuration Data (`CfKvOps`):**

* **Objective:** Provide extremely fast, eventually consistent reads for frequently accessed configuration data or cached results.
* **Implementation (`lib/database/cloudflare/kv/ops.ts`):**

    ```typescript
    // lib/database/cloudflare/kv/ops.ts
    import { KVNamespace } from '@cloudflare/workers-types';
    // Import types from your new lib/shared/types/ directory
    import { PersonaDefinition } from '@/lib/shared/types/personaTypes'; 
    import { ToolDefinition } from '@/lib/shared/types/toolTypes';    // e.g., from lib/shared/types/tools.ts
    import { ModelConfiguration } from '@/lib/shared/types/modelSettings'; // e.g., from lib/shared/types/model-settings.ts

    export class CfKvOps {
      private kvCache: KVNamespace; // Bound KV namespace, e.g., env.APP_CONFIG_CACHE_KV
      private kvEphemeral: KVNamespace; // Optional: A separate namespace for very short-lived data

      constructor(cacheNamespace: KVNamespace, ephemeralNamespace?: KVNamespace) { 
        this.kvCache = cacheNamespace;
        this.kvEphemeral = ephemeralNamespace || cacheNamespace; // Default to cache if not provided
      }

      // Static Persona Definitions (sourced from D1 or code, then cached)
      async getCachedPersonaDefinition(personaId: string): Promise<PersonaDefinition | null> {
        return this.kvCache.get<PersonaDefinition>(`persona-def:${personaId}`, 'json');
      }
      async setCachedPersonaDefinition(personaId: string, definition: PersonaDefinition, ttlSeconds: number = 3600 * 6): Promise<void> { // 6 hour TTL
        await this.kvCache.put(`persona-def:${personaId}`, JSON.stringify(definition), { expirationTtl: ttlSeconds });
      }

      // Tool Definitions (sourced from D1 or code, then cached)
      async getCachedToolDefinition(toolName: string): Promise<ToolDefinition | null> {
        return this.kvCache.get<ToolDefinition>(`tool-def:${toolName}`, 'json');
      }
      async setCachedToolDefinition(toolName: string, definition: ToolDefinition, ttlSeconds: number = 3600 * 6): Promise<void> {
        await this.kvCache.put(`tool-def:${toolName}`, JSON.stringify(definition), { expirationTtl: ttlSeconds });
      }

      // Model Configurations (sourced from D1 or code, then cached)
      async getCachedModelConfig(modelId: string): Promise<ModelConfiguration | null> {
         return this.kvCache.get<ModelConfiguration>(`model-cfg:${modelId}`, 'json');
      }
      async setCachedModelConfig(modelId: string, config: ModelConfiguration, ttlSeconds: number = 3600 * 6): Promise<void> {
        await this.kvCache.put(`model-cfg:${modelId}`, JSON.stringify(config), { expirationTtl: ttlSeconds });
      }
      
      // Example: Semantic Cache results (key could be hash of prompt + settings)
      // This replaces lib/memory/upstash/semantic-Cache.ts functionality
      async getSemanticCacheEntry(cacheKey: string): Promise<any | null> {
          return this.kvCache.get<any>(`semcache:${cacheKey}`, 'json');
      }
      async setSemanticCacheEntry(cacheKey: string, value: any, ttlSeconds: number = 3600 * 24): Promise<void> {
          await this.kvCache.put(`semcache:${cacheKey}`, JSON.stringify(value), { expirationTtl: ttlSeconds });
      }

      // Generic methods for flexibility
      async getValue<T = any>(key: string, namespace: 'cache' | 'ephemeral' = 'cache'): Promise<T | null> { 
        const ns = namespace === 'ephemeral' ? this.kvEphemeral : this.kvCache;
        return ns.get<T>(key, 'json'); 
      }
      async setValue(key: string, value: any, ttlSeconds?: number, namespace: 'cache' | 'ephemeral' = 'cache'): Promise<void> {
        const ns = namespace === 'ephemeral' ? this.kvEphemeral : this.kvCache;
        const options = ttlSeconds ? { expirationTtl: ttlSeconds } : {};
        await ns.put(key, JSON.stringify(value), options);
      }
      async deleteValue(key: string, namespace: 'cache' | 'ephemeral' = 'cache'): Promise<void> { 
        const ns = namespace === 'ephemeral' ? this.kvEphemeral : this.kvCache;
        await ns.delete(key); 
      }
    }
    ```

* **`wrangler.toml` KV Bindings:**

    ```toml
    kv_namespaces = [
      { binding = "APP_CONFIG_CACHE_KV", id = "your_main_cache_kv_namespace_id", preview_id = "your_preview_cache_id" },
      { binding = "EPHEMERAL_STORE_KV", id = "your_ephemeral_kv_namespace_id", preview_id = "your_preview_ephemeral_id" } // Optional separate one
    ]
    ```

* **Cache Invalidation & Consistency:**
  * KV is eventually consistent. Updates might not be instantly visible across all Cloudflare edge locations. This is usually acceptable for cached configurations.
  * **Strategy:** When canonical data is updated in D1 or a DO (e.g., a tool definition is modified via an admin UI that writes to D1), the same Worker logic that performs the D1/DO write should also explicitly update or delete the corresponding KV cache entry using `CfKvOps`. This ensures faster cache propagation.
  * Use appropriate TTLs. Data that changes infrequently can have longer TTLs.

**2.3. Data Migration for Upstash Agent/Persona State:**

* **Objective:** Migrate any essential persistent state from Upstash Redis structures to new Cloudflare DOs or D1/KV if not purely ephemeral.
* **Considerations:**
  * **Identify Critical Data:** Determine what state in Upstash (e.g., specific agent task progress, accumulated persona scores) absolutely needs to be preserved. Ephemeral cache entries or active session data in Upstash might not require migration.
  * **Migration Script (`scripts/migrate-state-upstash-to-cf.ts`):**
        1. Node.js script connects to Upstash Redis.
        2. Reads data (e.g., Hashes for agent context, Sorted Sets for scores).
        3. For each relevant entity:
            *If mapping to a DO: The script calls a temporary Worker HTTP endpoint. This endpoint gets the appropriate DO stub (`AgentThreadDO`, `PersonaProfileDO`) by its ID (derived from Upstash key/data) and calls methods on the DO to initialize its state with the migrated data.
            * If mapping to D1/KV: The script can directly (if it has D1/KV access via API/bindings if run as a Worker) or indirectly (via a Worker endpoint) write to D1 tables or KV.
  * **Challenges:** Mapping complex Upstash data structures (like Streams or Hashes with many fields) to DO storage or D1 tables requires careful planning. It's often simpler to migrate summarized or essential persistent data rather than trying to replicate entire Redis structures. Starting fresh for ephemeral states is usually easiest.

---

### 3. Core Relational Data: Complete D1 Migration (from LibSQL & any Supabase Data) 📊

(This section provides exhaustive details on schema design for D1, adapting Drizzle, handling data types, indexing, relationships, and data validation, fully replacing `db/libsql/schema.ts`, `db/libsql/crud.ts` and any relevant data tables from `db/supabase/schema.ts`).

**Target Service:** Cloudflare D1
**Implementation Path:** `lib/database/cloudflare/d1/`

**Detailed Sub-Plan:**

**3.1. D1 Drizzle Client & ORM (`lib/database/cloudflare/d1/client.ts`):**

* **Objective:** Centralized Drizzle ORM instance for D1.
* **Implementation:**

    ```typescript
    // lib/database/cloudflare/d1/client.ts
    import { drizzle, DrizzleD1Database } from 'drizzle-orm/d1';
    import { D1Database as CfD1Database, Env as WorkerEnv } from '@cloudflare/workers-types';
    import * as schema from './schema'; // Your full D1 Drizzle schema

    export type D1Orm = DrizzleD1Database<typeof schema>; // Fully typed ORM instance

    export interface AppEnvWithD1 extends WorkerEnv {
        DB_D1: CfD1Database; // Matches binding in wrangler.toml
    }
    
    let d1OrmInstance: D1Orm | null = null; // Simple singleton

    export function getD1Orm(d1Binding: CfD1Database): D1Orm {
      // Initialize only once
      if (!d1OrmInstance) {
        if (!d1Binding) {
          throw new Error('D1 Database binding (e.g., env.DB_D1) is missing or not provided to getD1Orm.');
        }
        // Enable logger for development to see SQL queries; disable for production.
        const enableLogger = (globalThis as any).env?.WORKER_ENV === 'development'; // Example check
        d1OrmInstance = drizzle(d1Binding, { schema, logger: enableLogger });
      }
      return d1OrmInstance;
    }
    ```

* **`wrangler.toml` D1 Binding:**

    ```toml
    [[d1_databases]]
    binding = "DB_D1"                             # How Worker accesses it: env.DB_D1
    database_name = "ai-sdk-dm-database-prod"     # Your D1 database name in Cloudflare
    database_id = "your-production-d1-database-id" # From Cloudflare dashboard
    # For different environments:
    # [env.dev.d1_databases]
    # binding = "DB_D1"
    # database_name = "ai-sdk-dm-database-dev"
    # database_id = "your-dev-d1-database-id"
    # migrations_table = "drizzle_migrations_dev" # Optional: separate migrations table
    # migrations_dir = "drizzle/migrations/cloudflare-d1" 
    ```

**3.2. Comprehensive D1 Schema Design (`lib/database/cloudflare/d1/schema.ts`):**

* **Objective:** Define all application tables using Drizzle ORM's SQLite dialect, adapted from your existing LibSQL/Supabase schemas and incorporating NextAuth.js tables (from Stage 0).
* **Guiding Principles:**
  * **Source of Truth for Shapes:** Your Zod schemas (to be moved to `lib/shared/types/validation.ts` from `db/libsql/validation.ts`) should dictate the data shapes. Drizzle types (`InferSelectModel`, `InferInsertModel`) will be derived from these D1 tables.
  * **Data Type Mapping (Postgres/LibSQL to SQLite/D1):**
    * `VARCHAR(n)`, `TEXT` -> `text(columnName)`
    * `UUID` -> `text(columnName).$defaultFn(() => crypto.randomUUID())` (if generated by app)
    * `BOOLEAN` -> `integer(columnName, { mode: 'boolean' })`
    * `INTEGER`, `BIGINT` -> `integer(columnName)` (SQLite integers handle large numbers)
    * `NUMERIC`, `DECIMAL`, `FLOAT`, `DOUBLE PRECISION` -> `real(columnName)`
    * `TIMESTAMP WITH TIME ZONE`, `TIMESTAMP WITHOUT TIME ZONE` -> `integer(columnName, { mode: 'timestamp_ms' })` (store as UNIX milliseconds) or `text(columnName)` (store as ISO 8601 string). Milliseconds are generally better for sorting/comparisons.
    * `JSONB`, `JSON` -> `text(columnName, { mode: 'json' })` (Drizzle helps cast to/from your TS type).
    * `BYTEA` -> `blob(columnName)`
    * `ARRAY` types (e.g., `TEXT[]`) -> `text(columnName, { mode: 'json' })` and store as a JSON array string. Application logic handles serialization/deserialization.
* **Key Table Definitions (Illustrative - adapt from your *actual* current schemas):**

    ```typescript
    // lib/database/cloudflare/d1/schema.ts
    import { integer, sqliteTable, text, primaryKey, real, blob, index as sqliteIndex } from 'drizzle-orm/sqlite-core';
    import { relations, InferSelectModel, InferInsertModel } from 'drizzle-orm';

    // == Stage 0: NextAuth.js Tables ==
    export const users = sqliteTable("users", { /* ... as defined in Stage 0.1.2 ... */ });
    export const accounts = sqliteTable("accounts", { /* ... as defined in Stage 0.1.2 ... */ });
    export const sessions = sqliteTable("sessions", { /* ... as defined in Stage 0.1.2 ... */ });
    export const verificationTokens = sqliteTable("verification_tokens", { /* ... as defined in Stage 0.1.2 ... */ });

    // == Application Core Tables (migrated from LibSQL/Supabase Data) ==
    
    // Models Table (from README)
    export const models = sqliteTable('models', {
      id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
      name: text('name').notNull(),
      provider: text('provider').notNull(), // "google", "openai", "anthropic", etc.
      model_id: text('model_id').notNull(), // Provider's specific model string, e.g., "gemini-1.5-pro-latest"
      // ... (other fields like max_tokens, costs, supports_vision etc. as in Stage 0.1.2 example)
      // api_key_name: text('api_key_name'), // Name of the Worker Secret (e.g., "GOOGLE_API_KEY")
      // capabilities: text('capabilities', { mode: 'json' }).$type<ModelCapabilities>(),
      status: text('status').notNull().default('active'), // 'active', 'inactive'
      createdAt: integer('created_at', { mode: 'timestamp_ms' }).defaultNow().notNull(),
      updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).defaultNow().notNull(),
    });
    export type SelectModel = InferSelectModel<typeof models>;
    export type InsertModel = InferInsertModel<typeof models>;

    // Tools Table (from README)
    export const tools = sqliteTable('tools', {
      id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
      name: text('name').notNull().unique(),
      description: text('description').notNull(),
      // parametersSchema is JSON Schema defining tool inputs
      parametersSchema: text('parameters_schema', { mode: 'json' }).notNull().$type<object>(), 
      category: text('category').default('general'),
      // executor_config: text('executor_config', { mode: 'json' }), // If tools have specific backend config
      createdAt: integer('created_at', { mode: 'timestamp_ms' }).defaultNow().notNull(),
      updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).defaultNow().notNull(),
    });
    export type SelectTool = InferSelectModel<typeof tools>;
    export type InsertTool = InferInsertModel<typeof tools>;
    
    // Agents Table (from README & PROJECT_CONTEXT.MD)
    export const agents = sqliteTable('agents', {
      id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
      name: text('name').notNull(),
      description: text('description'),
      modelId: text('model_id').notNull().references(() => models.id, { onDelete: 'set null' }), // Link to model
      userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }), // Creator/owner
      systemPrompt: text('system_prompt'),
      // Store array of tool IDs as a JSON string; application logic will parse/stringify
      toolIds: text('tool_ids', { mode: 'json' }).$type<string[]>(), 
      personaId: text('persona_id'), // Optional: link to a static persona definition
      status: text('status').default('active').notNull(),
      createdAt: integer('created_at', { mode: 'timestamp_ms' }).defaultNow().notNull(),
      updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).defaultNow().notNull(),
    }, (table) => ({
        userIdx: sqliteIndex("agents_user_idx").on(table.userId),
        modelIdx: sqliteIndex("agents_model_idx").on(table.modelId),
    }));
    export type SelectAgent = InferSelectModel<typeof agents>;
    export type InsertAgent = InferInsertModel<typeof agents>;
    
    // Personas Table (if static definitions are stored in D1, supplementing PersonaProfileDO)
    export const personas = sqliteTable('personas', {
        id: text('id').primaryKey(), // e.g., "coder_persona", "researcher_persona"
        name: text('name').notNull(),
        description: text('description'),
        systemPrompt: text('system_prompt').notNull(),
        // staticConfig: text('static_config', { mode: 'json' }),
        createdAt: integer('created_at', { mode: 'timestamp_ms' }).defaultNow().notNull(),
    });
    
    // Threads Table (Primarily for metadata/indexing if AgentThreadDO holds active messages)
    // Or could be the sole source of truth for messages if DOs are just for live state/locking.
    // Your README implies threads & messages are persisted
    export const threads = sqliteTable('threads', {
      id: text('id').primaryKey(), // This ID should match the AgentThreadDO name/ID
      userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
      title: text('title'),
      createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
      lastUpdatedAt: integer('last_updated_at', { mode: 'timestamp_ms' }).notNull(),
      // agentId: text('agent_id').references(() => agents.id), // If a thread is tied to a specific pre-configured agent
      // summary: text('summary'), // Optional, could be AI-generated
      // status: text('status').default('active'), // 'active', 'archived'
    }, (table) => ({
        userIdx: sqliteIndex("threads_user_idx").on(table.userId),
    }));

    // Messages Table (Consider if this is for full history or just an archive from DOs)
    export const messages = sqliteTable('messages', {
      id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
      threadId: text('thread_id').notNull().references(() => threads.id, { onDelete: 'cascade' }),
      role: text('role').notNull(), // 'user', 'assistant', 'system', 'tool'
      content: text('content').notNull(),
      // For Vercel AI SDK tool_calls and tool_results:
      toolCalls: text('tool_calls', { mode: 'json' }), // Store tool_calls array as JSON
      toolCallId: text('tool_call_id'), // If this message is a response to a specific tool call
      name: text('name'), // For 'tool' role, the name of the tool
      createdAt: integer('created_at', { mode: 'timestamp_ms' }).defaultNow().notNull(),
    }, (table) => ({
        threadIdx: sqliteIndex("messages_thread_idx").on(table.threadId),
        createdAtIdx: sqliteIndex("messages_created_at_idx").on(table.createdAt),
    }));

    // Workflow Tables (Example, adapt from lib/workflow/ and PROJECT_CONTEXT.MD)
    export const workflowDefinitions = sqliteTable('workflow_definitions', { /* ... id, name, description, steps_json ... */ });
    export const workflowRuns = sqliteTable('workflow_runs', { /* ... id, definition_id, user_id, status, start_time, end_time, current_step_id, context_json ... */ });
    export const workflowRunSteps = sqliteTable('workflow_run_steps', { /* ... id, run_id, step_name, status, input_json, output_json, error_json, attempts, started_at, completed_at ... */});

    // Observability Tables (from README)
    export const modelPerformance = sqliteTable('model_performance', { /* ... id, modelId, provider, latency_ms (REAL), tokens_per_second (REAL), ... */ });
    export const modelCosts = sqliteTable('model_costs', { /* ... id, modelId, date (INTEGER TS_MS), cost (REAL), inputTokens (INTEGER), ... */ });
    
    // R2 Object Metadata Table (from Stage 5)
    export const r2ObjectMetadata = sqliteTable('r2_object_metadata', { /* ... as defined in Stage 5.2 ... */});

    // Relations (Example for agents and models)
    export const modelRelations = relations(models, ({ many }) => ({
        agents: many(agents), // An agent uses one model
    }));
    export const userRelations = relations(users, ({ many }) => ({
        agents: many(agents),   // A user can have many agents
        threads: many(threads), // A user can have many threads
        accounts: many(accounts),// For NextAuth.js
        sessions: many(sessions),// For NextAuth.js
    }));
    export const agentRelations = relations(agents, ({ one }) => ({
        model: one(models, { fields: [agents.modelId], references: [models.id] }),
        user: one(users, { fields: [agents.userId], references: [users.id] }),
    }));
    export const threadRelations = relations(threads, ({ one, many }) => ({
        user: one(users, { fields: [threads.userId], references: [users.id] }),
        messages: many(messages),
    }));
    export const messageRelations = relations(messages, ({ one }) => ({
        thread: one(threads, { fields: [messages.threadId], references: [threads.id] }),
    }));
    // ... Define other relations as needed for your query patterns
    ```

**3.3. D1 CRUD Service (`lib/database/cloudflare/d1/crudService.ts`):**

* **Objective:** Provide a robust, typed service for all D1 database interactions, replacing `db/libsql/crud.ts`.
* **Implementation (`D1CrudService` class):**
  * (As previously detailed in "Ultimate Blueprint", with methods for `create`, `getById`, `findMany`, `updateById`, `deleteById`, `count`).
  * **Enhancements:**
    * **Stronger Typing:** Leverage Drizzle's `InferSelectModel` and `InferInsertModel` more rigorously in method signatures.
    * **Flexible `findMany`:** Allow more complex filter objects to be passed and construct `where` clauses dynamically using `and()`, `or()`, and other Drizzle SQL operators (`gt`, `lt`, `like`, etc.).

    * **Transaction Support:** Expose a method to run operations within a D1 transaction using Drizzle's `db.transaction(async (tx) => { ... })` pattern.

            ```typescript
            // In D1CrudService class
            async performInTransaction<T>(
              action: (transactionalDb: D1Orm) => Promise<T> // D1Orm is your Drizzle instance type
            ): Promise<T> {
              // Drizzle's transaction API for D1 might be `this.db.transaction(...)`
              // or might require specific setup if the D1 driver has nuances.
              // Assuming `this.db` is the Drizzle D1 instance:
              return this.db.transaction(action); 
            }
            ```

    * **Error Handling:** Wrap Drizzle calls in try-catch blocks, log errors, and potentially throw custom application-specific errors. D1 may return specific error codes for constraint violations etc.

**3.4. Data Validation with Zod (`lib/shared/types/validation.ts`):**

* **Objective:** Ensure all data entering D1 via `D1CrudService` is valid according to business rules defined in Zod schemas. This file moves from `db/libsql/validation.ts`.
* **Process:**
    1. Define Zod schemas for each of your D1 table's insert/update DTOs in `lib/shared/types/validation.ts`. These should align with Drizzle's `InferInsertModel` but can add stricter validation (e.g., string min/max lengths, specific formats).
    2. In your API route handlers (e.g., in `app/api/ai-sdk/`), before calling `D1CrudService.create()` or `updateById()`, parse the incoming request body using the relevant Zod schema.
    3. If parsing fails, return a 400 Bad Request error with Zod's error details.
    4. If successful, pass the parsed (and potentially transformed) data to the service.

**3.5. Data Migration (LibSQL and any unique Supabase data tables -> D1):**

* **Objective:** Perform a complete and accurate one-time migration of all relational data.
* **Detailed Steps:**
    1. **Pre-Migration Checklist:**
        * Finalize D1 schema in `lib/database/cloudflare/d1/schema.ts`.
        * Run Drizzle migrations to create all tables and indexes in your target D1 database (start with a dev/staging D1 instance).
        * Develop and test Zod validation schemas for all tables.
    2. **Export from LibSQL:**
        * Use `libsql-shell .dump` or `turso db shell YOUR_DB_NAME .dump` to get a full SQL dump.
        * Alternatively, export individual tables to CSV if transformations are easier that way.
    3. **Export from Supabase (non-auth data only, if any):**
        * If you have custom tables in Supabase (beyond `auth.*`), export them using `pg_dump` or Supabase dashboard's CSV export.
    4. **Transform Data:**
        * **SQL Dumps:** Modify the LibSQL/Postgres SQL dump to be SQLite compatible (data types, function calls, sequences, etc.). This can be complex. Often easier to export to an intermediate format like CSV.
        * **CSV/JSONL:** Write Node.js scripts to read CSV/JSONL files, transform data types (e.g., date formats to UNIX ms, boolean to 0/1, JSON text for arrays/objects), and map columns according to the new D1 schema. Validate each row against your Zod schemas before preparing for D1 import.
    5. **Import into D1:**
        * **`wrangler d1 execute`:** For importing transformed SQL files: `wrangler d1 execute YOUR_D1_BINDING_NAME --file=./transformed_dump.sql --local` (or `--remote`). Good for initial bulk load.
        * **Batch Inserts via Worker/Script:** For CSV/JSONL, write a script (Node.js calling a temporary Worker endpoint, or a Worker script reading from R2 if data is staged there) that reads transformed data and uses `D1CrudService` or Drizzle batch operations (`db.insert(table).values(batchOfItems).run()`) to insert into D1. This provides more control over batching and error handling.
    6. **Verification:**
        * Compare row counts for each table.
        * Perform spot checks on data integrity and transformations.
        * Test application functionality that relies on this migrated data.
* **Potential Challenges:**
  * **Data Type Inconsistencies:** Carefully handle differences between PostgreSQL/LibSQL data types (arrays, JSONB, specific date/time types) and SQLite's simpler types.
  * **Foreign Key Constraints:** Ensure data is imported in an order that respects foreign key relationships, or temporarily disable/defer constraints during import if your D1 tooling allows (SQLite typically checks FKs immediately).
  * **Large Datasets:** D1 has size limits. For very large tables, plan migration in chunks and monitor D1 usage.

---

### 4. `MemoryFactory`: The Unified Cloudflare Service Gateway 🏭

(This expands on the `MemoryFactory`'s role and its refined implementation, ensuring it's the exclusive and strongly-typed entry point for all Cloudflare data services, completely replacing `lib/memory/upstash/supabase-adapter-factory.ts` and similar old constructs.)

**Implementation Path:** `lib/memory/factory.ts`

**Detailed Sub-Plan:**

**4.1. Factory Design and Initialization:**

* **Objective:** Provide a centralized, injectable factory that instantiates and vends all Cloudflare data service clients and operation wrappers using environment bindings.
* **Implementation (`lib/memory/factory.ts`):**

    ```typescript
    // lib/memory/factory.ts (Revised for Exclusive Cloudflare Stack & Full Detail)
    import {
      D1Database as CfD1Database,
      VectorizeIndex as CfVectorizeIndex,
      KVNamespace as CfKVNamespace,
      R2Bucket as CfR2Bucket,
      DurableObjectNamespace as CfDONamespace,
      DurableObjectStub as CfDOStub,
      DurableObjectId as CfDOId,
      Env as CfWorkerEnv, // Generic Cloudflare Worker Environment type
      Queue as CfQueue // For Cloudflare Queues
    } from '@cloudflare/workers-types';

    // Import concrete service clients/wrappers and their types
    import { D1Orm, getD1Orm } from '../database/cloudflare/d1/client';
    import { D1CrudService } from '../database/cloudflare/d1/crudService';
    import { getVectorizeInstance } from '../database/cloudflare/vectorize/instance';
    import { CfVectorizeOps } from '../database/cloudflare/vectorize/ops';
    import { CfKvOps } from '../database/cloudflare/kv/ops';
    import { CfR2Store } from '../database/cloudflare/r2/ops'; // Assume located in r2/ops.ts
    import { CfQueueOps } from '../database/cloudflare/queues/ops'; // Assume located in queues/ops.ts

    // Define your Application's specific Worker Environment interface
    // This should list ALL bindings defined in your wrangler.toml
    export interface AppEnv extends CfWorkerEnv {
      DB_D1: CfD1Database;
      VECTOR_INDEX: CfVectorizeIndex;
      APP_CONFIG_CACHE_KV: CfKVNamespace; // Main cache
      EPHEMERAL_STORE_KV?: CfKVNamespace; // Optional: for very short-lived data
      ASSETS_R2_BUCKET: CfR2Bucket;
      // Durable Object Namespaces
      AGENT_THREAD_DO: CfDONamespace;
      PERSONA_PROFILE_DO: CfDONamespace;
      WORKFLOW_INSTANCE_DO: CfDONamespace; // For Stage 6
      REALTIME_TOPIC_DO: CfDONamespace;  // For Stage 7
      // Queue Binding
      WORKFLOW_TASK_QUEUE: CfQueue<any>; // For Stage 6
      // Secrets
      NEXTAUTH_SECRET: string; // From Stage 0
      // ... other secrets like GOOGLE_API_KEY, OPENAI_API_KEY etc.
    }

    export class MemoryFactory {
      private env: AppEnv;
      // Singleton instances for service wrappers
      private d1Orm?: D1Orm;
      private d1CrudService?: D1CrudService;
      private vectorOps?: CfVectorizeOps;
      private kvOps?: CfKvOps;
      private r2Store?: CfR2Store;
      private queueOps?: CfQueueOps;

      constructor(workerEnv: AppEnv) {
        this.env = workerEnv;
      }

      // --- D1 Service ---
      public getD1Orm(): D1Orm {
        if (!this.d1Orm) {
          this.d1Orm = getD1Orm(this.env.DB_D1);
        }
        return this.d1Orm;
      }
      public getD1CrudService(): D1CrudService {
        if (!this.d1CrudService) {
          this.d1CrudService = new D1CrudService(this.getD1Orm());
        }
        return this.d1CrudService;
      }

      // --- Vectorize Service ---
      public getVectorOps(): CfVectorizeOps {
        if (!this.vectorOps) {
          const vectorizeInstance = getVectorizeInstance(this.env); // Assuming instance.ts handles env typing
          this.vectorOps = new CfVectorizeOps(vectorizeInstance);
        }
        return this.vectorOps;
      }

      // --- KV Service ---
      public getKvOps(): CfKvOps {
        if (!this.kvOps) {
          // Pass both KV namespaces if defined, CfKvOps constructor can handle optional ephemeral one
          this.kvOps = new CfKvOps(this.env.APP_CONFIG_CACHE_KV, this.env.EPHEMERAL_STORE_KV);
        }
        return this.kvOps;
      }

      // --- R2 Service ---
      public getR2Store(): CfR2Store {
        if (!this.r2Store) {
          this.r2Store = new CfR2Store(this.env.ASSETS_R2_BUCKET);
        }
        return this.r2Store;
      }

      // --- Queue Service ---
      public getQueueOps(): CfQueueOps {
        if (!this.queueOps) {
            this.queueOps = new CfQueueOps(this.env.WORKFLOW_TASK_QUEUE);
        }
        return this.queueOps;
      }

      // --- Durable Object Stub Getters ---
      // Ensures consistent ID generation (idFromName for named access, newUniqueId for truly unique instances)
      public getAgentThreadDOStub(threadId: string): CfDOStub {
        const namespace = this.env.AGENT_THREAD_DO;
        const durableObjectId = namespace.idFromName(threadId); // Consistent access by threadId name
        return namespace.get(durableObjectId);
      }

      public getPersonaProfileDOStub(personaId: string): CfDOStub {
        const namespace = this.env.PERSONA_PROFILE_DO;
        const durableObjectId = namespace.idFromName(personaId);
        return namespace.get(durableObjectId);
      }
      
      public getWorkflowInstanceDOStub(instanceId: string, newInstance?: boolean): CfDOStub {
        const namespace = this.env.WORKFLOW_INSTANCE_DO;
        let durableObjectId: CfDOId;
        if (newInstance) { // For creating a brand new, unique workflow instance
            durableObjectId = namespace.newUniqueId();
        } else { // For accessing an existing instance by its known ID/name
            durableObjectId = namespace.idFromName(instanceId); 
        }
        return namespace.get(durableObjectId);
      }
      
      public getRealtimeTopicDOStub(topic: string): CfDOStub {
        const namespace = this.env.REALTIME_TOPIC_DO;
        const durableObjectId = namespace.idFromName(topic);
        return namespace.get(durableObjectId);
      }
    }
    ```

* **Instantiation in Worker:** Your main Worker `Workspace` handler (or Hono app initialization) will create an instance of `MemoryFactory`, passing its `env` object. This factory instance is then passed to or used by all services and route handlers.

    ```typescript
    // Example in src/worker.ts (Hono setup)
    // const app = new Hono<{ Bindings: AppEnv }>();
    // app.use('*', async (c, next) => {
    //   const factory = new MemoryFactory(c.env);
    //   c.set('memoryFactory', factory); // Make factory available on context
    //   await next();
    // });
    // ... then in routes: c.get('memoryFactory').getD1CrudService();
    ```

**4.2. Typed and Centralized Data Access:**

* **Objective:** All application logic requiring data access will do so through strongly-typed methods provided by the `MemoryFactory`.
* **Refactoring Impact:**
  * `lib/ai-sdk-integration.ts`: When interacting with models, tools, or personas that require DB lookups (e.g., fetching tool schemas, model configurations, persona definitions), it will use the factory.
  * `lib/agents/agent-service.ts`: For loading agent definitions from D1, getting `AgentThreadDO` stubs for state, getting `PersonaProfileDO` stubs.
  * `lib/models/model-service.ts`: For fetching model configurations from D1 (via `D1CrudService`) or KV (via `CfKvOps`).
  * `lib/tools/toolInitializer.ts` & `toolRegistry.ts`: If tool definitions are stored in D1, they will be fetched using `D1CrudService` and potentially cached using `CfKvOps`.
  * All API route handlers in `app/api/ai-sdk/` will use the factory passed via context (e.g., in Hono) or instantiated directly with `env`.

**4.3. Deprecation of Old Data Access Logic:**

* The entire `lib/memory/upstash/` directory, including `supabase-adapter-factory.ts`, will be deleted.
* `lib/memory/libsql.ts`, `lib/memory/supabase.ts`, `lib/memory/drizzle.ts` (if it was for LibSQL/Supabase) will be deleted.
* The old `db/libsql/` and `db/supabase/` directories will be removed after data migration and schema adaptation to D1 is complete.

---

### 5. Large Object Storage: Exclusive Cloudflare R2 Implementation 📦

(Expanded for detailed R2 operations, keying, security, and integration with other services.)

**Target Service:** Cloudflare R2
**Implementation Path:** `lib/database/cloudflare/r2/`

**Detailed Sub-Plan:**

**5.1. R2 Operations Wrapper (`CfR2Store` in `ops.ts`):**

* **Objective:** A comprehensive service for all R2 interactions (put, get, delete, list, head).
* **Implementation (`lib/database/cloudflare/r2/ops.ts`):**

    ```typescript
    // lib/database/cloudflare/r2/ops.ts
    import { 
        R2Bucket, 
        R2PutOptions, 
        R2ObjectBody, // Type for the object returned by get() or head()
        R2Object,     // Type for the object metadata returned by put() or head()
        R2GetOptions, 
        R2ListOptions, 
        R2Objects     // Type for list results
    } from '@cloudflare/workers-types';

    export class CfR2Store {
      private bucket: R2Bucket; // Bound R2 Bucket, e.g., env.ASSETS_R2_BUCKET

      constructor(r2BucketBinding: R2Bucket) {
        this.bucket = r2BucketBinding;
      }

      /**
       * Uploads a file/object to R2.
       * @param key The object key (path).
       * @param value The data to upload (ReadableStream, ArrayBuffer, string, Blob, null for empty).
       * @param options R2PutOptions like customMetadata, httpMetadata.
       * @returns Metadata of the uploaded object.
       */
      async put(
        key: string,
        value: ReadableStream | ArrayBuffer | ArrayBufferView | string | Blob | null,
        options?: R2PutOptions & { customMetadata?: Record<string, string> } // Ensure customMetadata is string-to-string
      ): Promise<R2Object> { // R2 .put() returns R2Object
        // Ensure customMetadata keys and values are strings if provided.
        // R2 only supports string values for custom metadata via HTTP headers.
        // If options.customMetadata, ensure it's flat string key/values.
        return this.bucket.put(key, value, options);
      }

      /**
       * Retrieves an object from R2.
       * @param key The object key.
       * @param options R2GetOptions (e.g., range, onlyIf).
       * @returns R2ObjectBody (includes methods to get body as stream, text, json, ArrayBuffer) or null if not found.
       */
      async get(key: string, options?: R2GetOptions): Promise<R2ObjectBody | null> {
        const object = await this.bucket.get(key, options);
        if (object === null || !object.body) { // Check if object was actually found
            return null;
        }
        // Important: The body (object.body) is a ReadableStream and must be consumed.
        // The R2ObjectBody also has helper methods like .arrayBuffer(), .text(), .json().
        return object;
      }

      /**
       * Retrieves only the metadata (headers) of an object from R2.
       * @param key The object key.
       * @returns R2Object (metadata) or null if not found.
       */
      async head(key: string): Promise<R2Object | null> {
        return this.bucket.head(key);
      }

      /**
       * Deletes one or more objects from R2.
       * @param keys A single key or an array of keys.
       */
      async delete(keys: string | string[]): Promise<void> {
        await this.bucket.delete(keys);
      }

      /**
       * Lists objects in the R2 bucket.
       * @param options R2ListOptions (e.g., prefix, limit, cursor, delimiter).
       */
      async list(options?: R2ListOptions): Promise<R2Objects> {
        return this.bucket.list(options);
      }
    }
    ```

* **`wrangler.toml` R2 Binding:**

    ```toml
    [[r2_buckets]]
    binding = "ASSETS_R2_BUCKET"        # Access as env.ASSETS_R2_BUCKET
    bucket_name = "ai-sdk-dm-assets-prod" # Your actual R2 bucket name
    # preview_bucket_name = "ai-sdk-dm-assets-dev" # Optional: for `wrangler dev` local emulation with a different bucket
    ```

**5.2. R2 Object Keying Strategy:**

* **Objective:** Define a consistent and scalable naming convention for R2 object keys.
* **Recommendations:**
  * **User-Specific Content:** `users/<userId>/<fileType>/<timestamp>-<originalFilename>` or `users/<userId>/<fileType>/<fileUUID>.<extension>`
    * Example: `users/abc-123-xyz/chat-attachments/1678886400000-invoice.pdf`
  * **Public Assets (if any, for website):** `public/images/logo.png`, `public/documents/terms.pdf`
  * **Model Artifacts:** `models/<modelId>/<version>/artifact.bin`
  * **Training Data:** `training-data/<datasetName>/<partition>/datafile.jsonl`
* **Considerations:** Avoid user-supplied filenames directly in keys if they can contain problematic characters. Sanitize or use UUIDs for object keys and store original filename in D1 metadata.

**5.3. Secure File Access & Serving:**

* **Objective:** Control access to R2 objects based on application logic and user authentication. R2 buckets are private by default.
* **Strategies:**
    1. **Worker as Proxy:**
        * Client requests a file via a Worker API endpoint (e.g., `/api/ai-sdk/files/download/<r2ObjectKey>`).
        * The Worker authenticates the user (using NextAuth.js session/token).
        * Performs authorization checks (e.g., does this user own the file or have permission?).
        * If authorized, fetches the object from R2 using `CfR2Store.get()` and streams its body back to the client.
        * Set appropriate `Content-Type`, `Content-Disposition` headers.
    2. **Public R2 Bucket (Use with Caution):**
        * If certain assets are meant to be public (e.g., website images), you can connect a custom domain to your R2 bucket and make it publicly accessible. This bypasses your Worker for those assets.
    3. **Presigned URLs (for Client-Side Uploads/Limited-Time Access):**
        * This is more complex with R2 compared to S3, as R2 bindings in Workers don't directly generate presigned URLs.
        * **For Uploads:** The client requests an upload URL from your Worker. The Worker generates a unique key, potentially stores pending metadata in D1, and then could use the Cloudflare API (not the R2 binding directly, this requires an API token with R2 permissions) to create a presigned POST URL. This is advanced. A simpler way is to have the client upload *to the Worker*, which then streams to R2.
        * **For Downloads:** A Worker can generate a short-lived, signed URL for a proxied download endpoint, effectively acting as a temporary access token.

**5.4. Integration with D1 for Metadata (`r2_object_metadata` table):**

* **Objective:** Store rich, queryable metadata about R2 objects in D1.
* **D1 Table Schema (`lib/database/cloudflare/d1/schema.ts`):**

    ```typescript
    // lib/database/cloudflare/d1/schema.ts
    export const r2ObjectMetadata = sqliteTable('r2_object_metadata', {
      id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
      r2BucketName: text('r2_bucket_name').notNull(), // Store which bucket if you use multiple
      r2Key: text('r2_key').notNull().unique(),      // Full object key in R2
      originalFilename: text('original_filename').notNull(),
      contentType: text('content_type').notNull(),
      sizeBytes: integer('size_bytes').notNull(),
      uploaderUserId: text('uploader_user_id').references(() => users.id, { onDelete: 'set null' }), // Link to NextAuth user
      associatedEntityType: text('associated_entity_type'), // E.g., 'chatMessage', 'appBuilderAsset', 'modelArtifact'
      associatedEntityId: text('associated_entity_id'),   // FK to the relevant table for that entity type
      uploadStatus: text('upload_status').default('completed'), // 'pending', 'completed', 'failed'
      // customAppMetadata: text('custom_app_metadata', { mode: 'json' }), // App-specific JSON metadata
      createdAt: integer('created_at', { mode: 'timestamp_ms' }).defaultNow().notNull(),
      deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }), // For soft deletes
    }, (table) => ({
        r2KeyIdx: sqliteIndex("r2_meta_key_idx").on(table.r2Key),
        uploaderIdx: sqliteIndex("r2_meta_uploader_idx").on(table.uploaderUserId),
        associationIdx: sqliteIndex("r2_meta_assoc_idx").on(table.associatedEntityType, table.associatedEntityId),
    }));
    ```

* **Workflow:** On file upload via `CfR2Store.put()`, your Worker API handler immediately creates a record in this D1 table.

**5.5. Linking R2 with Vectorize for RAG:**

* (As previously detailed: file upload to R2 -> D1 metadata entry -> (optional Queue message) -> Worker consumes queue -> fetches from R2 -> extracts text -> chunks & embeds -> upserts to Vectorize with D1 metadata ID/R2 key in vector metadata).
* This allows search results from Vectorize to link back to the D1 record, which in turn points to the original file in R2.

---

### 6. Workflow Engine: Cloudflare Native Orchestration ⚙️

This stage replaces all existing workflow implementations (`lib/workflow/libsqlWorkflow.ts`, `supabaseWorkflow.ts`, `upstashWorkflow.ts`) with a Cloudflare-native solution using D1 for persistence, Cloudflare Queues for task offloading/orchestration, and Durable Objects for managing the state of active, complex workflow instances.

**Target Services:** Cloudflare D1, Cloudflare Queues, Durable Objects.
**Implementation Path:** `lib/database/cloudflare/workflow/` (new directory for core logic), D1 schema additions, new DOs, new Queue ops.

**Detailed Sub-Plan:**

**6.1. D1 Schema for Workflows (`lib/database/cloudflare/d1/schema.ts` additions):**

* **Objective:** Define D1 tables to store workflow definitions, track individual runs, and log step execution.

    ```typescript
    // lib/database/cloudflare/d1/schema.ts (Workflow additions)
    export const workflowDefinitions = sqliteTable('workflow_definitions', {
      id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()), // Unique ID for the workflow template
      name: text('name').notNull().unique(),
      description: text('description'),
      // Steps can be a JSON array defining the sequence, conditions, agent/tool calls, etc.
      stepsDefinitionJson: text('steps_definition_json', { mode: 'json' }).notNull().$type<any[]>(), 
      version: integer('version').default(1).notNull(),
      isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
      createdByUserId: text('created_by_user_id').references(() => users.id),
      createdAt: integer('created_at', { mode: 'timestamp_ms' }).defaultNow().notNull(),
      updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).defaultNow().notNull(),
    });

    export const workflowRuns = sqliteTable('workflow_runs', {
      id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()), // Unique ID for this specific run
      definitionId: text('definition_id').notNull().references(() => workflowDefinitions.id),
      definitionVersion: integer('definition_version').notNull(),
      status: text('status').notNull(), // e.g., 'pending', 'running', 'completed', 'failed', 'paused'
      initialInputJson: text('initial_input_json', { mode: 'json' }),
      finalOutputJson: text('final_output_json', { mode: 'json' }),
      errorJson: text('error_json', { mode: 'json' }),
      durableObjectId: text('durable_object_id'), // If a DO is managing this run's active state
      startedAt: integer('started_at', { mode: 'timestamp_ms' }),
      completedAt: integer('completed_at', { mode: 'timestamp_ms' }),
      userId: text('user_id').references(() => users.id), // User who triggered this run
    }, (table) => ({
        defIdx: sqliteIndex("workflow_runs_def_idx").on(table.definitionId),
        statusIdx: sqliteIndex("workflow_runs_status_idx").on(table.status),
        userIdx: sqliteIndex("workflow_runs_user_idx").on(table.userId),
    }));

    // Optional: For detailed step logging if not entirely within DO or if DOs archive to D1
    export const workflowRunLog = sqliteTable('workflow_run_log', {
      id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
      runId: text('run_id').notNull().references(() => workflowRuns.id, { onDelete: 'cascade' }),
      stepName: text('step_name'), // Or step_index
      status: text('status'), // 'started', 'completed', 'failed'
      detailsJson: text('details_json', { mode: 'json' }), // Input, output, error for the step
      timestamp: integer('timestamp', { mode: 'timestamp_ms' }).defaultNow().notNull(),
    });
    ```

**6.2. Cloudflare Queue Operations (`lib/database/cloudflare/queues/ops.ts`):**

* **Objective:** Abstract sending messages to Cloudflare Queues for asynchronous step processing.
* **Implementation:**

    ```typescript
    // lib/database/cloudflare/queues/ops.ts
    import { Queue as CfQueue, QueueSendOptions } from '@cloudflare/workers-types';

    // Define message types your queue will handle
    export interface WorkflowStepMessage {
      workflowRunId: string;
      stepIdToExecute: string; // Or step index
      payload?: any; // Data for the step
      retryCount?: number;
    }

    export class CfQueueOps {
        private workflowQueue: CfQueue<WorkflowStepMessage>; // Strongly typed queue

        constructor(queueBinding: CfQueue<WorkflowStepMessage>) { // e.g., env.WORKFLOW_TASK_QUEUE
            this.workflowQueue = queueBinding;
        }

        async enqueueWorkflowStep(message: WorkflowStepMessage, options?: QueueSendOptions): Promise<void> {
            try {
                await this.workflowQueue.send(message, options);
                console.log(`Enqueued step for workflow run ${message.workflowRunId}, step ${message.stepIdToExecute}`);
            } catch (error) {
                console.error(`Failed to enqueue workflow step for run ${message.workflowRunId}:`, error);
                throw error; // Allow for retry or dead-letter queue handling
            }
        }
        // Potentially methods for sending batches if needed: sendBatch()
    }
    ```

* **`wrangler.toml` Queue Configuration:**

    ```toml
    # Producer binding (in the Worker that starts workflows)
    [[queues.producers]]
    queue = "ai-sdk-dm-workflow-tasks" # Name of the queue in Cloudflare
    binding = "WORKFLOW_TASK_QUEUE"    # How Worker accesses it: env.WORKFLOW_TASK_QUEUE

    # Consumer configuration (in wrangler.toml, points to the Worker that processes steps)
    [[queues.consumers]]
    queue = "ai-sdk-dm-workflow-tasks"
    max_batch_size = 10
    max_batch_timeout = 30 # seconds
    max_retries = 5
    # dead_letter_queue = "your-dlq-name" # Optional: configure a DLQ
    # script_name = "your-queue-consumer-worker" # If consumer logic is in a separate Worker script
    # Or, if same script, the `queue` handler in the default export:
    # export default {
    //   async fetch(...) { /* HTTP handler */ },
    //   async queue(batch: MessageBatch<WorkflowStepMessage>, env: AppEnv, ctx: ExecutionContext): Promise<void> {
    //     const factory = new MemoryFactory(env);
    //     const workflowService = new WorkflowService(factory); // Assuming a service
    //     for (const message of batch.messages) {
    //       try {
    //         await workflowService.processQueueMessage(message.body);
    //         message.ack();
    //       } catch (err) {
    //         console.error("Failed to process workflow message:", err, message.body);
    //         if (message.attempts < env.MAX_QUEUE_RETRIES) { // MAX_QUEUE_RETRIES from env
    //            message.retry({delaySeconds: ...});
    //         } else {
    //            message.ack(); // Acknowledge to prevent infinite loops, rely on DLQ or logging
    //         }
    //       }
    //     }
    //   }
    // }
    ```

**6.3. Workflow Instance Durable Object (`lib/database/cloudflare/durableObjects/workflowInstanceDO.ts`):**

* **Objective:** Manage the live state, execution pointers, and context for a single, potentially long-running workflow instance.
* **DO ID Strategy:** `workflowRunId` (from `workflow_runs` D1 table).
* **State Stored:** `currentStepId: string`, `status: string`, `variables: Record<string, any>` (accumulated context), `retryCounts: Record<string, number>`, `lastError?: any`.
* **Methods:**
  * `constructor(state, env)`: Loads definition and current run state from D1 if resuming.
  * `start(definitionId: string, initialInput: any): Promise<void>`: Initializes state, logs to D1, enqueues first step.
  * `executeStep(stepId: string, inputPayload: any): Promise<{ nextStepId?: string, outputPayload?: any, error?: any }>`:
        1. Loads step definition from its internal copy of the workflow definition.
        2. Executes the step's action (e.g., calls an agent via `AgentService`, a tool via `ToolService`, or custom logic). This might involve making HTTP calls *from the DO*.
        3. Updates its internal state (`variables`, `currentStepId`).
        4. Persists its own critical state changes to its DO storage.
        5. Logs step completion/failure to `workflow_run_log` in D1 via `D1CrudService`.
        6. Returns information for the orchestrator (Queue consumer) to enqueue the next step.
  * `pause(): Promise<void>`, `resume(): Promise<void>`, `cancel(): Promise<void>`.
  * `getWorkflowVariables(): Promise<Record<string, any>>`.
* **`wrangler.toml` Binding:** `[[durable_objects.bindings]] name = "WORKFLOW_INSTANCE_DO" class_name = "WorkflowInstanceDO"`
* **Interaction:** The Queue consumer Worker, when processing a `WorkflowStepMessage`, would get the `WorkflowInstanceDO` stub via `MemoryFactory.getWorkflowInstanceDOStub(message.body.workflowRunId)` and call its `executeStep` method.

**6.4. Workflow Service (`lib/database/cloudflare/workflow/service.ts`):**

* **Objective:** High-level service to manage workflows, abstracting the underlying D1, Queue, and DO interactions. This replaces the logic in `lib/workflow/index.ts` and its provider-specific files.
* **Methods:**
  * `createWorkflowDefinition(defData): Promise<SelectWorkflowDefinition>`
  * `getWorkflowDefinition(id): Promise<SelectWorkflowDefinition | null>`
  * `triggerWorkflow(definitionId, initialInput, userId): Promise<SelectWorkflowRun>`: Creates `workflow_runs` record, gets/creates `WorkflowInstanceDO` stub, calls `doStub.start()`, which internally enqueues the first step.
  * `getWorkflowRunStatus(runId): Promise<SelectWorkflowRun | null>`
  * `processQueueMessage(message: WorkflowStepMessage): Promise<void>`: (Called by Queue consumer) Gets DO stub, calls `doStub.executeStep()`, enqueues next step if applicable.
* **Dependencies:** Injected `MemoryFactory` to access D1, Queues, and DO stubs.

---

### 7. Realtime Features: Cloudflare-Native Solutions (Replacing Supabase Realtime) ⚡

This addresses features potentially reliant on Supabase Realtime, as suggested by `hooks/use-supabase-realtime.ts`.

**Target Services:** Cloudflare Durable Objects with WebSockets.

**Detailed Sub-Plan:**

**7.1. Identify and Scope Realtime Use Cases:**

* **Objective:** Clearly define which application features *require* server-pushed realtime updates.
* **Examples:**
  * Live updates in `components/chat/ai-sdk-chat.tsx` as an AI generates responses or tools execute.
  * Notifications for workflow completion or agent task updates.
  * Collaborative features within the "App Builder" (e.g., seeing other users' actions live).

**7.2. WebSocket Durable Object (`lib/database/cloudflare/durableObjects/realtimeTopicDO.ts`):**

* **Objective:** A DO class to manage WebSocket connections for a specific "topic" or "room" (e.g., `chat:<threadId>`, `appbuilder:<sessionId>`).
* **Implementation (`RealtimeTopicDO.ts`):**

    ```typescript
    // lib/database/cloudflare/durableObjects/realtimeTopicDO.ts
    import { DurableObjectState, DurableObjectNamespace, DurableObjectStub, Env as WorkerEnv, WebSocketPair, WebSocket } from '@cloudflare/workers-types';

    export class RealtimeTopicDO implements DurableObject {
        private state: DurableObjectState;
        private sessions: WebSocket[] = []; // Stores active WebSocket server-side ends
        private topicId: string; // The ID of this DO instance (e.g., chat thread ID)

        constructor(state: DurableObjectState, env: WorkerEnv) {
            this.state = state;
            this.topicId = state.id.toString(); // Or fromName if using named DOs primarily
        }

        async fetch(request: Request): Promise<Response> {
            const upgradeHeader = request.headers.get('Upgrade');
            if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
                return new Response('Expected Upgrade: websocket', { status: 426 });
            }

            const webSocketPair = new WebSocketPair();
            const [client, server] = Object.values(webSocketPair);

            server.accept(); // Accept the server-side WebSocket
            this.sessions.push(server);

            // Handle incoming messages from this client (optional, often DOs just broadcast)
            server.addEventListener('message', async event => {
                console.log(`DO ${this.topicId} received: ${event.data}`);
                // Example: If clients can send messages to be broadcasted or processed by DO
                // this.broadcast(event.data, server); // Echo or broadcast
            });

            // Handle client disconnects
            const closeOrErrorHandler = () => {
                this.sessions = this.sessions.filter(ws => ws !== server);
                console.log(`DO ${this.topicId}: WebSocket closed/errored. Active sessions: ${this.sessions.length}`);
            };
            server.addEventListener('close', closeOrErrorHandler);
            server.addEventListener('error', closeOrErrorHandler);
            
            console.log(`DO ${this.topicId}: New WebSocket connected. Active sessions: ${this.sessions.length}`);
            return new Response(null, { status: 101, webSocket: client }); // Return client-side WebSocket
        }

        // Method to broadcast a message to all connected clients of this DO instance
        public broadcast(message: string | ArrayBuffer, excludeSender?: WebSocket) {
            if (typeof message !== 'string') { // Ensure message is string if not already
                try { message = JSON.stringify(message); } catch (e) { /* ignore, send as is */ }
            }
            let deadSessions = 0;
            this.sessions.forEach(session => {
                if (session !== excludeSender) {
                    try {
                        if (session.readyState === WebSocket.READY_STATE_OPEN) {
                           session.send(message);
                        } else {
                           deadSessions++; // Mark for cleanup if readyState is CLOSING or CLOSED
                        }
                    } catch (e) {
                        console.error(`DO ${this.topicId} broadcast error to a session:`, e);
                        // Potentially remove this session if send fails repeatedly
                        deadSessions++;
                    }
                }
            });
            if (deadSessions > 0) {
                 this.sessions = this.sessions.filter(ws => ws.readyState === WebSocket.READY_STATE_OPEN);
            }
        }

        // Method for other backend logic (e.g., another Worker, another DO) to trigger a broadcast to this topic
        public async pushExternalUpdate(data: any) {
            // This method would be called via a DO stub: `doStub.pushExternalUpdate(data)`
            // It's not directly part of the 'fetch' handler for WebSockets.
            // You might need to expose this via a separate HTTP endpoint on the DO if called from outside,
            // or it's called internally if this DO itself processes something then needs to notify.
            console.log(`DO ${this.topicId} pushing external update:`, data);
            this.broadcast(JSON.stringify(data));
        }
    }
    ```

* **`wrangler.toml` Binding:** `[[durable_objects.bindings]] name = "REALTIME_TOPIC_DO" class_name = "RealtimeTopicDO"`
* **Worker Router for WebSockets:** Your main Worker script needs an endpoint to handle initial WebSocket upgrade requests and route them to the correct `RealtimeTopicDO` instance.

    ```typescript
    // In src/worker.ts (Hono example)
    // app.get('/ws/chat/:threadId', async (c) => {
    //   const threadId = c.req.param('threadId');
    //   if (!threadId) return c.text('Missing threadId', 400);
    //
    //   const factory = new MemoryFactory(c.env);
    //   const doStub = factory.getRealtimeTopicDOStub(`chat:${threadId}`); // Use a prefix for topic type
    //
    //   // Forward the request to the Durable Object's fetch handler
    //   return doStub.fetch(c.req.raw); // c.req.raw is the original Request object
    // });
    ```

**7.3. Frontend Integration (`lib/shared/hooks/useRealtimeTopic.ts` - new hook):**

* **Objective:** Create a React hook to manage WebSocket connections and handle incoming/outgoing realtime messages, replacing `hooks/use-supabase-realtime.ts`.
* **Implementation:**

    ```typescript
    // lib/shared/hooks/useRealtimeTopic.ts
    import { useState, useEffect, useRef, useCallback } from 'react';

    interface UseRealtimeTopicOptions {
      onMessage: (data: any) => void;
      topicId: string | null; // e.g., "chat:thread123"
      wsUrl?: string; // Optional: full WebSocket URL if not standard
    }

    export function useRealtimeTopic({ topicId, onMessage, wsUrl }: UseRealtimeTopicOptions) {
      const [isConnected, setIsConnected] = useState(false);
      const wsRef = useRef<WebSocket | null>(null);

      const connect = useCallback(() => {
        if (!topicId || (wsRef.current && wsRef.current.readyState === WebSocket.OPEN)) {
          return;
        }
        // Construct WebSocket URL to your Worker endpoint
        const defaultWsUrl = `wss://${new URL(window.location.href).hostname}/ws/${topicId}`;
        const finalWsUrl = wsUrl || defaultWsUrl;
        
        console.log(`Connecting to WebSocket: ${finalWsUrl}`);
        wsRef.current = new WebSocket(finalWsUrl);

        wsRef.current.onopen = () => {
          console.log(`WebSocket connected to ${topicId}`);
          setIsConnected(true);
        };
        wsRef.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data as string);
            onMessage(data);
          } catch (e) {
            onMessage(event.data); // Pass raw if not JSON
          }
        };
        wsRef.current.onclose = () => {
          console.log(`WebSocket disconnected from ${topicId}`);
          setIsConnected(false);
          wsRef.current = null;
        };
        wsRef.current.onerror = (error) => {
          console.error(`WebSocket error for ${topicId}:`, error);
          setIsConnected(false);
          // Consider retry logic here
          wsRef.current = null;
        };
      }, [topicId, onMessage, wsUrl]);

      const disconnect = useCallback(() => {
        if (wsRef.current) {
          wsRef.current.close();
          wsRef.current = null; // Ensure it's cleared
        }
      }, []);

      useEffect(() => {
        if (topicId) {
          connect();
        } else {
          disconnect();
        }
        return () => { // Cleanup on unmount or if topicId changes
          disconnect();
        };
      }, [topicId, connect, disconnect]);

      const sendMessage = useCallback((data: any) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(typeof data === 'string' ? data : JSON.stringify(data));
        } else {
          console.warn('WebSocket not connected or ready, cannot send message.');
        }
      }, []);

      return { isConnected, sendMessage, connectWebSocket: connect, disconnectWebSocket: disconnect };
    }
    ```

* **Usage:** Components like your chat UI will use this hook to subscribe to updates for a given thread and send messages if the DO is designed to receive them from clients.

---
**Final Critical Steps for Full Transition (Reiteration & Deep Dive):**

* **0. Authentication (NextAuth.js + D1):** (Covered in Stage 0) This is the absolute foundation. All subsequent data services will likely involve `userId` for ownership or access control.
* **1. API Route Overhaul (`app/api/ai-sdk/`):**
  * Every single API route handler within `app/api/ai-sdk/` (and any older routes in `app/api/` that are still active) must be refactored:
        1. **Authentication/Authorization:** Implement robust checks using the NextAuth.js session/JWT validation middleware (as detailed in Stage 0.2). Extract `userId` and `userRole`. Enforce permissions based on role for sensitive operations.
        2. **Data Access via `MemoryFactory`:** All database queries, vector searches, KV operations, R2 interactions, DO calls, and Queue messages must go through the single `MemoryFactory` instance passed via context or instantiated with `env`.
        3. **Input Validation:** Use Zod schemas from `lib/shared/types/validation.ts` to validate all incoming request bodies/params before interacting with services.
        4. **Error Handling:** Standardize error responses using `lib/api-error-handler.ts`, ensuring it can handle errors from Cloudflare services appropriately.
* **2. Comprehensive Testing Strategy (Iterative):**
  * **Unit Tests:** For individual service wrappers in `lib/database/cloudflare/` (e.g., `CfVectorizeOps`, `D1CrudService`, `CfKvOps`, `CfR2Store`), DO methods, and Queue handlers. Mock Cloudflare bindings/SDKs.
  * **Integration Tests with Wrangler:** Use `wrangler dev` to run your Worker locally. Miniflare (Wrangler's local simulator) provides local emulation for D1, KV, R2, DOs, Queues. Write tests (e.g., using Vitest or Jest with a suitable environment) that make HTTP requests to your Worker endpoints and verify interactions between services.
  * **E2E Testing:** (As per your `README.md` Gantt chart's "E2E Testing Phase"). Use tools like Playwright or Cypress to test full user flows from the Next.js frontend through the Cloudflare Worker backend, interacting with the live (or staging) Cloudflare services.
  * **Test Data Migration Scripts:** Thoroughly test your data migration scripts on staging databases before running on production.
* **3. Configuration and Secrets Management (`wrangler.toml` & Worker Secrets):**
  * All external API keys (Google AI, OpenAI, Anthropic), `NEXTAUTH_SECRET`, and any other sensitive configuration must be stored as encrypted Worker Secrets in the Cloudflare dashboard and referenced in `wrangler.toml` (e.g., `[vars] NEXTAUTH_SECRET = "your_actual_secret_value_for_local_dev_only"` and then set via UI for deployed worker).
  * Non-sensitive configuration and all Cloudflare service bindings (D1, KV, R2, DO, Queues, Vectorize) are defined in `wrangler.toml`.
* **4. Observability (`lib/langfuse-integration.ts`, `lib/otel-tracing.ts`):**
  * Adapt your existing Langfuse and OpenTelemetry integrations.
  * Ensure traces capture interactions with the new Cloudflare services. Langfuse SDKs can be used within Workers. OpenTelemetry exporters might need to target a collector accessible from Workers or use Cloudflare's native analytics where appropriate.
  * Trace requests from the Next.js frontend (if deployed on Pages and making calls to the Worker API) through to the Worker and its interactions with D1, DOs, etc.
* **5. Deployment Strategy (Next.js Frontend & Cloudflare Worker Backend):**
  * **Frontend:** Your Next.js application (`app/` directory content) will likely be deployed to **Cloudflare Pages**. This simplifies D1 access for NextAuth.js and provides a globally distributed frontend.
  * **Backend API:** Your Cloudflare Worker (containing API logic from `app/api/ai-sdk/`, all of `lib/database/cloudflare/`, `lib/agents/`, `lib/tools/`, `lib/models/`, `lib/workflow/`, etc.) will be deployed as a separate Cloudflare Worker script, or as part of the Cloudflare Pages project if using Pages Functions.
  * **CI/CD:** Set up GitHub Actions (or your preferred CI/CD) to deploy the Next.js frontend to Pages and the Worker backend, including running D1 migrations via Wrangler.
* **6. Code Cleanup and Deprecation (Post-Migration & Verification):**
  * Once each module is successfully migrated and thoroughly tested on the Cloudflare stack:
    * Delete all LibSQL client code, Drizzle configurations for LibSQL (`drizzle.libsql.config.ts`), and the entire `db/libsql/` directory.
    * Delete all Upstash client code, the `lib/memory/upstash/` directory, and any related types (e.g., `types/upstashTypes.ts`).
    * Delete Supabase client code for data access (if any beyond auth), Drizzle configuration for Supabase (`drizzle.supabase.config.ts`), and the `db/supabase/` directory (unless NextAuth.js migration scripts still temporarily need parts of its schema definition for reference).
    * Remove obsolete types like `types/supabase.ts`, `types/libsql.ts`.
    * Remove old workflow provider files (`lib/workflow/libsqlWorkflow.ts`, `supabaseWorkflow.ts`, `upstashWorkflow.ts`).
    * Remove old React hooks from `hooks/` directory (now `lib/shared/hooks/`) that were specific to Supabase or Upstash (e.g., `use-supabase-*.ts`, `use-upstash-adapter.ts`).
  * Update all documentation (`README.md`, `PROJECT_CONTEXT.MD`, any architecture diagrams) to reflect the new Cloudflare-exclusive stack.
