/**
 * Memory Processor for Upstash
 * 
 * This module provides utilities for processing and streaming memory data from Upstash Redis and Vector.
 * It includes optimized methods for handling personas, micro-personas, and agent states with efficient
 * streaming capabilities.
 * 
 * @module memory-processor
 */

import { getRedisClient, getVectorClient } from './upstashClients';
import { Redis } from '@upstash/redis';
import { Index } from '@upstash/vector';
import { PersonaDefinition, MicroPersonaDefinition } from '../../agents/personas/persona-library';
import { AgentState } from '../../agents/agent.types';
import { Readable } from 'stream';
import { generateEmbedding } from '../../ai-integration';
import { upstashLogger } from './upstash-logger';

/**
 * Error class for memory processor operations
 */
export class MemoryProcessorError extends Error {
  /**
   * Creates a new MemoryProcessorError
   * 
   * @param message - Error message
   * @param cause - Optional cause of the error
   */
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = "MemoryProcessorError";
    Object.setPrototypeOf(this, MemoryProcessorError.prototype);
  }
}

/**
 * Type definition for stream state
 */
type StreamState = { cursor: number | string | null };

/**
 * Memory processor for optimized data operations
 */
export class MemoryProcessor {
  private redis: Redis;
  private vector: Index | null;
  private static instance: MemoryProcessor;

  /**
   * Creates a new MemoryProcessor instance
   * @private
   */
  private constructor() {
    this.redis = getRedisClient();
    try {
      const vectorClient = getVectorClient();
      if (vectorClient) {
        this.vector = vectorClient;
      } else {
        this.vector = null;
        upstashLogger.warn('memory-processor', 'Vector client not available, vector operations will be disabled');
      }
    } catch (error: unknown) {
      this.vector = null;
      upstashLogger.warn('memory-processor', 'Vector client not available, vector operations will be disabled', { error });
    }
  }

  /**
   * Gets the singleton instance of MemoryProcessor
   * 
   * @returns The MemoryProcessor instance
   */
  public static getInstance(): MemoryProcessor {
    if (!MemoryProcessor.instance) {
      MemoryProcessor.instance = new MemoryProcessor();
    }
    return MemoryProcessor.instance;
  }

  /**
   * Generates embeddings for the given text using the AI integration
   * 
   * @param text - The text to generate embeddings for
   * @returns A promise that resolves to the embeddings in the format expected by Upstash Vector
   */
  private async generateEmbeddings(text: string): Promise<number[]> {
    try {
      const embedding = await generateEmbedding(text);
      if (embedding instanceof Float32Array) {
        return Array.from(embedding);
      } else if (Array.isArray(embedding)) {
        return embedding;
      } else if (embedding && typeof embedding === 'object' && 'data' in embedding) {
        upstashLogger.warn('memory-processor', 'Unexpected embedding format, attempting to convert');
        // best effort conversion
        return Array.isArray(embedding.data) ? embedding.data : Array.from(embedding.data);
      } else {
        throw new MemoryProcessorError('Unknown embedding format');
      }
    } catch (error: unknown) {
      upstashLogger.error('memory-processor', 'Error generating embeddings', error instanceof Error ? error : { error });
      throw new MemoryProcessorError('Error generating embeddings', error);
    }
  }

  /**
   * Streams personas from Redis with efficient batching
   * 
   * @param options - Stream options
   * @param options.batchSize - Number of personas to fetch in each batch
   * @param options.filter - Optional filter function for personas
   * @returns A readable stream of personas
   */
  public streamPersonas(options: {
    batchSize?: number;
    filter?: (persona: PersonaDefinition) => boolean;
  } = {}): Readable {
    const { batchSize = 10, filter } = options;
    const redis = this.redis;
    return new Readable({
      objectMode: true,
      read() {
        const state: StreamState = { cursor: 0 };
        (async () => {
          try {
            const cursor = state.cursor ?? 0;
            const result = await redis.zscan('personas', cursor, { count: batchSize });
            const [nextCursor, items] = result;
            const personaIds = items.filter((_, index) => index % 2 === 0) as string[];
            if (personaIds.length === 0) {
              this.push(null);
              return;
            }
            const pipeline = redis.pipeline();
            for (const id of personaIds) {
              pipeline.get(`persona:${id}`);
            }
            const personaJsons = await pipeline.exec();
            for (const json of personaJsons) {
              if (json) {
                try {
                  const persona = JSON.parse(json as string) as PersonaDefinition;
                  if (!filter || filter(persona)) {
                    this.push(persona);
                  }
                } catch {
                  upstashLogger.error('memory-processor', 'Error parsing persona JSON');
                }
              }
            }
            state.cursor = nextCursor === '0' ? null : nextCursor;
            if (state.cursor === null) {
              this.push(null);
            }
          } catch (error: unknown) {
            this.destroy(new MemoryProcessorError('Error streaming personas', error));
          }
        })();
      }
    });
  }

  /**
   * Streams micro-personas for a specific parent persona
   * 
   * @param parentPersonaId - The parent persona ID
   * @param options - Stream options
   * @param options.batchSize - Number of micro-personas to fetch in each batch
   * @param options.filter - Optional filter function for micro-personas
   * @returns A readable stream of micro-personas
   */
  public streamMicroPersonas(
    parentPersonaId: string,
    options: {
      batchSize?: number;
      filter?: (microPersona: MicroPersonaDefinition) => boolean;
    } = {}
  ): Readable {
    const { batchSize = 10, filter } = options;
    const redis = this.redis;
    const parentKey = `persona:${parentPersonaId}:micro_personas`;
    return new Readable({
      objectMode: true,
      read() {
        const state: StreamState = { cursor: 0 };
        (async () => {
          try {
            const cursor = state.cursor ?? 0;
            const result = await redis.sscan(parentKey, cursor, { count: batchSize });
            const [nextCursor, microPersonaIds] = result;
            if (microPersonaIds.length === 0) {
              this.push(null);
              return;
            }
            const pipeline = redis.pipeline();
            for (const id of microPersonaIds) {
              pipeline.get(`micro_persona:${id}`);
            }
            const microPersonaJsons = await pipeline.exec();
            for (const json of microPersonaJsons) {
              if (json) {
                try {
                  const microPersona = JSON.parse(json as string) as MicroPersonaDefinition;
                  if (!filter || filter(microPersona)) {
                    this.push(microPersona);
                  }
                } catch {
                  upstashLogger.error('memory-processor', 'Error parsing micro-persona JSON');
                }
              }
            }
            state.cursor = nextCursor === '0' ? null : nextCursor;
            if (state.cursor === null) {
              this.push(null);
            }
          } catch (error: unknown) {
            this.destroy(new MemoryProcessorError('Error streaming micro-personas', error));
          }
        })();
      }
    });
  }

  /**
   * Streams agent states for a specific thread
   * 
   * @param threadId - The thread ID
   * @param options - Stream options
   * @param options.batchSize - Number of agent states to fetch in each batch
   * @param options.filter - Optional filter function for agent states
   * @returns A readable stream of agent states
   */
  public streamAgentStates(
    threadId: string,
    options: {
      batchSize?: number;
      filter?: (state: AgentState & { _agent_id: string }) => boolean;
    } = {}
  ): Readable {
    const { batchSize = 10, filter } = options;
    const redis = this.redis;
    const threadStatesKey = `thread:${threadId}:agent_states`;
    return new Readable({
      objectMode: true,
      read() {
        const state: StreamState = { cursor: 0 };
        (async () => {
          try {
            const cursor = state.cursor ?? 0;
            const result = await redis.sscan(threadStatesKey, cursor, { count: batchSize });
            const [nextCursor, agentIds] = result;
            if (agentIds.length === 0) {
              this.push(null);
              return;
            }
            const pipeline = redis.pipeline();
            for (const agentId of agentIds) {
              pipeline.get(`agent:state:${threadId}:${agentId}`);
            }
            const stateJsons = await pipeline.exec();
            for (const json of stateJsons) {
              if (json) {
                try {
                  const stateObj = JSON.parse(json as string) as AgentState & { _agent_id: string };
                  if (!filter || filter(stateObj)) {
                    this.push(stateObj);
                  }
                } catch {
                  upstashLogger.error('memory-processor', 'Error parsing agent state JSON');
                }
              }
            }
            state.cursor = nextCursor === '0' ? null : nextCursor;
            if (state.cursor === null) {
              this.push(null);
            }
          } catch (error: unknown) {
            this.destroy(new MemoryProcessorError('Error streaming agent states', error));
          }
        })();
      }
    });
  }

  /**
   * Performs a semantic search and streams the results
   * 
   * @param query - The search query
   * @param options - Search options
   * @param options.topK - Number of results to return
   * @param options.filter - Optional filter for vector search
   * @returns A readable stream of search results
   */
  public streamSemanticSearch(
    query: string,
    options: {
      topK?: number;
      filter?: Record<string, unknown>;
    } = {}
  ): Readable {
    const { topK = 10, filter } = options;
    const vector = this.vector;
    return new Readable({
      objectMode: true,
      read() {
        let searchStarted = false;
        let results: unknown[] = [];
        let currentIndex = 0;
        (async () => {
          try {
            if (!searchStarted) {
              searchStarted = true;
              results = await vector?.query({
                vector: await MemoryProcessor.getInstance().generateEmbeddings(query),
                topK,
                filter: filter ? JSON.stringify(filter) : undefined,
                includeMetadata: true,
                includeVectors: false
              }) ?? [];
              currentIndex = 0;
            }
            if (currentIndex >= results.length) {
              this.push(null);
              return;
            }
            this.push(results[currentIndex]);
            currentIndex++;
          } catch (error: unknown) {
            this.destroy(new MemoryProcessorError('Error streaming semantic search results', error));
          }
        })();
      }
    });
  }
}