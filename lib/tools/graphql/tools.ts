/**
 * @file Supabase GraphQL query tool with optional LibSQL + Vector
 *       caching.  Ready for Vercel AI SDK tool-calling.
 */

import { tool } from 'ai';
import { z } from 'zod';
import {
  request,
  Variables,
  gql,
  GraphQLClient,
  ClientError,
} from 'graphql-request';
import { eq } from 'drizzle-orm';
import * as libsqlSchema from '@/db/libsql/schema'; // sqlite
import * as pgSchema from '@/db/supabase/schema'; // postgres
import { getLibSQLClient } from '@/lib/memory/db'; // existing helper
import { getDrizzleClient as getPgDrizzle } from '@/lib/memory/supabase'; // pg
import { storeTextEmbedding } from '@/lib/memory/vector-store';
import { GqlQueryResult, ToolFailure } from './types';
import {
  DEFAULT_SUPABASE_GRAPHQL_URL,
  DEFAULT_HEADERS,
  DATABASE_URL,
} from './constants';

const TTL_MIN = 60; // Cache Time-To-Live in minutes (e.g., 1 hour)

/* ── Zod Schema ───────────────────────────────────────────────────── */

export const gqlQuerySchema = z.object({
  query: z.string().describe('GraphQL query (or mutation) string'),
  variables: z.record(z.any()).optional().describe('Optional variables object'),
  cache: z
    .boolean()
    .default(true)
    .describe('Cache the response in LibSQL + Vector store'),
});

/* ── Helper: LibSQL upsert ─────────────────────────────────────────── */

async function cacheInLibSQL(
  query: string,
  variables: Variables | undefined,
  json: string
): Promise<void> {
  const db = getLibSQLClient();
  await db.execute({
    sql: `
      INSERT INTO gql_cache (id, query, variables, response, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        response = excluded.response,
        created_at = excluded.created_at
    `,
    args: [
      /* id */ `${query}:${JSON.stringify(variables)}`,
      query,
      JSON.stringify(variables ?? {}),
      json,
    ],
  });
}
/**
 * Execute a GraphQL query with caching support
 *
 * @param params - Query parameters
 * @returns Query result or error
 */
async function gqlQuery(
  params: z.infer<typeof gqlQuerySchema>
): Promise<GqlQueryResult> {
  const { query, variables, cache } = params;
  const id = `${query}:${JSON.stringify(variables ?? {})}`;
  const db = getPgDrizzle();

  try {
    /* ---------- 1.  try Supabase cache first ------------- */
    if (cache) {
      const [row] = await db
        .select()
        .from(pgSchema.gqlCache)
        .where(eq(pgSchema.gqlCache.id, id))
        .limit(1);

      if (row) {
        // Convert createdAt to Date safely
        const createdAt =
          row.createdAt instanceof Date
            ? row.createdAt
            : new Date(row.createdAt as string);

        const ageMin = (Date.now() - createdAt.getTime()) / 60000;

        if (ageMin < TTL_MIN) {
          return {
            success: true,
            query,
            variables,
            data: JSON.parse(row.response as string),
          };
        }
      }
    }

    /* ---------- 2.  perform real network request --------------- */
    const data = await request(DATABASE_URL, query, variables);

    if (cache) {
      const json = JSON.stringify(data);

      // Cache in Supabase
      await db
        .insert(pgSchema.gqlCache)
        .values({
          id,
          query,
          variables: JSON.stringify(variables ?? {}),
          response: json,
        })
        .onConflictDoUpdate({
          target: pgSchema.gqlCache.id,
          set: {
            response: json,
            createdAt: new Date(), // Use Date object directly
          },
        });

      // Also store in vector store for semantic search
      await storeTextEmbedding(json, 'all-MiniLM-L6-v2');

      // Optionally cache in LibSQL too
      await cacheInLibSQL(query, variables, json);
    }

    return { success: true, query, variables, data };
  } catch (err) {
    console.error('GraphQL query error:', err);
    return {
      success: false,
      error: (err as Error).message,
    } as ToolFailure;
  }
}

/* ── export for AI SDK ─────────────────────────────────────────────── */

export const tools = {
  GqlQuery: tool({
    description:
      'Run a GraphQL query or mutation against the Supabase endpoint.',
    parameters: gqlQuerySchema,
    execute: gqlQuery,
  }),
};
