/**
 * @file Shared literals & utility constants for the "rag" tool-suite.
 */

export const VECTOR_DIMENSIONS = 1536 as const;
export const DEFAULT_EMBEDDING_MODEL = 'text-embedding-ada-002' as const;
export const DEFAULT_SEARCH_LIMIT = 5 as const;
export const MAX_SEARCH_LIMIT = 20 as const;

export const VECTOR_PROVIDERS = ['supabase', 'pinecone', 'libsql', 'upstash'] as const;
export const CHUNKING_STRATEGIES = ['fixed', 'recursive', 'semantic'] as const;

export const DEFAULT_CHUNK_SIZE = 1000 as const;
export const DEFAULT_CHUNK_OVERLAP = 200 as const;

export const SIMILARITY_METRICS = ['cosine', 'euclidean', 'dot'] as const;