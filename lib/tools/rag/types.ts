/**
 * @file Discriminated-union result shapes + handy type-guards for the RAG tools.
 */

import {
  VECTOR_PROVIDERS,
  CHUNKING_STRATEGIES,
  SIMILARITY_METRICS,
} from './constants';

/* ------------------------------------------------------------------ */
/*                             Failure                                */
/* ------------------------------------------------------------------ */

export interface ToolFailure {
  success: false;
  error: string;
}

/* ------------------------------------------------------------------ */
/*                         DocumentSearch                             */
/* ------------------------------------------------------------------ */

export interface DocumentSearchItem {
  id: string;
  title: string;
  content: string;
  metadata?: Record<string, any>;
  similarity: number;
}

export interface DocumentSearchSuccess {
  success: true;
  query: string;
  results: DocumentSearchItem[];
}

export type DocumentSearchResult = DocumentSearchSuccess | ToolFailure;
export const isDocumentSearchSuccess = (
  r: DocumentSearchResult
): r is DocumentSearchSuccess => r.success;

/* ------------------------------------------------------------------ */
/*                          DocumentAdd                               */
/* ------------------------------------------------------------------ */

export interface DocumentAddSuccess {
  success: true;
  documentId: string;
  title: string;
}

export type DocumentAddResult = DocumentAddSuccess | ToolFailure;
export const isDocumentAddSuccess = (
  r: DocumentAddResult
): r is DocumentAddSuccess => r.success;

/* ------------------------------------------------------------------ */
/*                          ChunkDocument                             */
/* ------------------------------------------------------------------ */

export interface DocumentChunk {
  id: string;
  content: string;
  metadata: Record<string, any>;
}

export interface ChunkDocumentSuccess {
  success: true;
  documentId: string;
  chunks: DocumentChunk[];
}

export type ChunkDocumentResult = ChunkDocumentSuccess | ToolFailure;
export const isChunkDocumentSuccess = (
  r: ChunkDocumentResult
): r is ChunkDocumentSuccess => r.success;

/* ------------------------------------------------------------------ */
/*                       VectorStoreUpsert                            */
/* ------------------------------------------------------------------ */

export interface VectorStoreUpsertSuccess {
  success: true;
  ids: string[];
  provider: (typeof VECTOR_PROVIDERS)[number];
}

export type VectorStoreUpsertResult = VectorStoreUpsertSuccess | ToolFailure;
export const isVectorStoreUpsertSuccess = (
  r: VectorStoreUpsertResult
): r is VectorStoreUpsertSuccess => r.success;

/* ------------------------------------------------------------------ */
/*                       VectorStoreQuery                             */
/* ------------------------------------------------------------------ */

export interface VectorStoreQueryItem {
  id: string;
  metadata: Record<string, any>;
  score: number;
}

export interface VectorStoreQuerySuccess {
  success: true;
  query: string;
  results: VectorStoreQueryItem[];
  provider: (typeof VECTOR_PROVIDERS)[number];
}

export type VectorStoreQueryResult = VectorStoreQuerySuccess | ToolFailure;
export const isVectorStoreQuerySuccess = (
  r: VectorStoreQueryResult
): r is VectorStoreQuerySuccess => r.success;
