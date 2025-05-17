/**
 * @file Shared literals for the GraphQL tool-suite.
 */
export const DEFAULT_SUPABASE_GRAPHQL_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/graphql/v1`;
export const DEFAULT_SUPABASE_GRAPHQL_SCHEMA = 'public' as const;
export const DEFAULT_HEADERS = {
  apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''}`,
};
export const DATABASE_URL = process.env.DATABASE_URL ?? '';
