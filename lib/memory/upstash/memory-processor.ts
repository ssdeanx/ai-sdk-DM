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
import { Index, Vector } from '@upstash/vector';
import { PersonaDefinition, MicroPersonaDefinition } from '../../agents/personas/persona-library';
import { AgentState } from '../../agents/agent.types';
import { Readable } from 'stream';
import { generateEmbedding } from '../../ai-integration';

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
  constructor(message: string, public cause?: any) {
    super(message);
    this.name = "MemoryProcessorError";
    Object.setPrototypeOf(this, MemoryProcessorError.prototype);
  }
}

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
        console.warn('Vector client not available, vector operations will be disabled');
      }
    } catch (error) {
      this.vector = null;
      console.warn('Vector client not available, vector operations will be disabled');
    }

  } 
  
  /**   * Gets the singleton instance of MemoryProcessor   * 
   * @returns The MemoryProcessor instance
   */  public static getInstance(): MemoryProcessor {
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
      // Use the generateEmbedding function from ai-integration.ts
      const embedding = await generateEmbedding(text);
      
      // Handle different possible return types from generateEmbedding
      if (embedding instanceof Float32Array) {
        // Convert Float32Array to regular array
        return Array.from(embedding);
      } else if (Array.isArray(embedding)) {
        // If it's already an array, return it directly
        return embedding;
      } else {
        // If it's some other format, try to convert it
        console.warn('Unexpected embedding format, attempting to convert');
        return Array.isArray(embedding.data) ? embedding.data : Array.from(embedding.data);
      }
    } catch (error) {
      console.error('Error generating embeddings:', error);
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
    
    // Create a readable stream
    return new Readable({
      objectMode: true,
      async read() {
        try {
          // Get the current cursor position from the stream's state
          const cursor = (this as any).cursor || 0;
          
          // Get persona IDs from the sorted set
          const result = await redis.zscan('personas', cursor, { count: batchSize });
          const [nextCursor, items] = result;
          
          // Extract persona IDs from the result
          const personaIds = items.filter((_, index) => index % 2 === 0) as string[];
          
          if (personaIds.length === 0) {
            // No more personas, end the stream
            this.push(null);
            return;
          }
          
          // Get persona data for each ID
          const pipeline = redis.pipeline();
          for (const id of personaIds) {
            pipeline.get(`persona:${id}`);
          }
          
          const personaJsons = await pipeline.exec();
          
          // Parse and filter personas
          for (const json of personaJsons) {
            if (json) {
              try {
                const persona = JSON.parse(json as string) as PersonaDefinition;
                
                // Apply filter if provided
                if (!filter || filter(persona)) {
                  this.push(persona);
                }
              } catch (error) {
                console.error('Error parsing persona JSON:', error);
              }
            }
          }
          
          // Update cursor for next batch
          (this as any).cursor = nextCursor === '0' ? null : nextCursor;
          
          // If no more personas, end the stream
          if ((this as any).cursor === null) {
            this.push(null);
          }
        } catch (error) {
          this.destroy(new MemoryProcessorError('Error streaming personas', error));
        }
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
    
    // Create a readable stream
    return new Readable({
      objectMode: true,
      async read() {
        try {
          // Get the current cursor position from the stream's state
          const cursor = (this as any).cursor || 0;
          
          // Get micro-persona IDs from the set
          const result = await redis.sscan(parentKey, cursor, { count: batchSize });
          const [nextCursor, microPersonaIds] = result;
          
          if (microPersonaIds.length === 0) {
            // No more micro-personas, end the stream
            this.push(null);
            return;
          }
          
          // Get micro-persona data for each ID
          const pipeline = redis.pipeline();
          for (const id of microPersonaIds) {
            pipeline.get(`micro_persona:${id}`);
          }
          
          const microPersonaJsons = await pipeline.exec();
          
          // Parse and filter micro-personas
          for (const json of microPersonaJsons) {
            if (json) {
              try {
                const microPersona = JSON.parse(json as string) as MicroPersonaDefinition;
                
                // Apply filter if provided
                if (!filter || filter(microPersona)) {
                  this.push(microPersona);
                }
              } catch (error) {
                console.error('Error parsing micro-persona JSON:', error);
              }
            }
          }
          
          // Update cursor for next batch
          (this as any).cursor = nextCursor === '0' ? null : nextCursor;
          
          // If no more micro-personas, end the stream
          if ((this as any).cursor === null) {
            this.push(null);
          }
        } catch (error) {
          this.destroy(new MemoryProcessorError('Error streaming micro-personas', error));
        }
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
    
    // Create a readable stream
    return new Readable({
      objectMode: true,
      async read() {
        try {
          // Get the current cursor position from the stream's state
          const cursor = (this as any).cursor || 0;
          
          // Get agent IDs from the set
          const result = await redis.sscan(threadStatesKey, cursor, { count: batchSize });
          const [nextCursor, agentIds] = result;
          
          if (agentIds.length === 0) {
            // No more agent states, end the stream
            this.push(null);
            return;
          }
          
          // Get agent state data for each ID
          const pipeline = redis.pipeline();
          for (const agentId of agentIds) {
            pipeline.get(`agent:state:${threadId}:${agentId}`);
          }
          
          const stateJsons = await pipeline.exec();
          
          // Parse and filter agent states
          for (const json of stateJsons) {
            if (json) {
              try {
                const state = JSON.parse(json as string) as AgentState & { _agent_id: string };
                
                // Apply filter if provided
                if (!filter || filter(state)) {
                  this.push(state);
                }
              } catch (error) {
                console.error('Error parsing agent state JSON:', error);
              }
            }
          }
          
          // Update cursor for next batch
          (this as any).cursor = nextCursor === '0' ? null : nextCursor;
          
          // If no more agent states, end the stream
          if ((this as any).cursor === null) {
            this.push(null);
          }
        } catch (error) {
          this.destroy(new MemoryProcessorError('Error streaming agent states', error));
        }
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
      filter?: Record<string, any>;
    } = {}
  ): Readable {
    const { topK = 10, filter } = options;
    const vector = this.vector;
    const memoryProcessor = this; // Capture the MemoryProcessor instance
    
    if (!vector) {
      const stream = new Readable({
        objectMode: true,
        read() {
          this.destroy(new MemoryProcessorError('Vector client not available'));
        }
      });
      return stream;
    }
    
    // Create a readable stream
    return new Readable({
      objectMode: true,
      async read() {
        try {
          if (!(this as any).searchStarted) {
            (this as any).searchStarted = true;
            
            // Perform the search
            const results = await vector.query({
              vector: await memoryProcessor.generateEmbeddings(query), // Use the captured instance
              topK,
              filter: filter ? JSON.stringify(filter) : undefined,
              includeMetadata: true,
              includeVectors: false
            });
            
            // Set the results and index
            (this as any).results = results;
            (this as any).currentIndex = 0;
          }
          
          const results = (this as any).results;
          const currentIndex = (this as any).currentIndex;
          
          if (currentIndex >= results.length) {
            // No more results, end the stream
            this.push(null);
            return;
          }
          
          // Push the next result
          this.push(results[currentIndex]);
          
          // Increment the index
          (this as any).currentIndex++;
        } catch (error) {
          this.destroy(new MemoryProcessorError('Error streaming semantic search results', error));
        }
      }
    });
  }
}