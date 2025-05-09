/**
 * Stream Processor for Upstash Memory
 *
 * This module provides utilities for processing and streaming data from Upstash Redis and Vector.
 * It includes optimized methods for handling streaming responses, batching, and error handling.
 *
 * @module stream-processor
 */

import { getRedisClient, getVectorClient } from './upstashClients';
import { Redis } from '@upstash/redis';
import { Index } from '@upstash/vector';
import { Readable, Transform, TransformCallback, pipeline as nodePipeline } from 'stream';
import { pipeline } from 'stream/promises';
import { z } from 'zod';

// --- Zod Schemas ---

/**
 * Schema for stream processor options
 */
export const StreamProcessorOptionsSchema = z.object({
  batchSize: z.number().int().positive().default(10),
  maxRetries: z.number().int().min(0).default(3),
  retryDelay: z.number().int().min(0).default(1000),
  timeout: z.number().int().min(0).default(30000),
  filter: z.function().optional(),
  transform: z.function().optional(),
  errorHandler: z.function().optional(),
});

export type StreamProcessorOptions = z.infer<typeof StreamProcessorOptionsSchema>;

/**
 * Schema for Redis stream options
 */
export const RedisStreamOptionsSchema = z.object({
  key: z.string().min(1),
  scanType: z.enum(['zscan', 'sscan', 'hscan']).default('zscan'),
  count: z.number().int().positive().default(10),
  pattern: z.string().optional(),
  parseJson: z.boolean().default(true),
}).merge(StreamProcessorOptionsSchema.partial());

export type RedisStreamOptions = z.infer<typeof RedisStreamOptionsSchema>;

/**
 * Schema for Vector stream options
 */
export const VectorStreamOptionsSchema = z.object({
  query: z.array(z.number()), // Only allow number arrays for vector queries
  topK: z.number().int().positive().default(10),
  filter: z.record(z.any()).optional(),
  includeMetadata: z.boolean().default(true),
  includeVectors: z.boolean().default(false), // Changed from includeValues to includeVectors
}).merge(StreamProcessorOptionsSchema.partial());

export type VectorStreamOptions = z.infer<typeof VectorStreamOptionsSchema>;

// --- Error Handling ---

/**
 * Error class for stream processor operations
 */
export class StreamProcessorError extends Error {
  /**
   * Creates a new StreamProcessorError
   *
   * @param message - Error message
   * @param cause - Optional cause of the error
   */
  constructor(message: string, public cause?: any) {
    super(message);
    this.name = "StreamProcessorError";
    Object.setPrototypeOf(this, StreamProcessorError.prototype);
  }
}

/**
 * Stream processor for optimized data operations
 */
export class StreamProcessor {
  private redis: Redis;
  private vector: Index | null = null;
  private static instance: StreamProcessor;

  /**
   * Creates a new StreamProcessor instance
   * @private
   */
  private constructor() {
    this.redis = getRedisClient();
    try {
      this.vector = getVectorClient();
    } catch (error) {
      console.warn('Vector client not available, vector operations will be disabled');
    }
  }

  /**
   * Gets the singleton instance of StreamProcessor
   *
   * @returns The StreamProcessor instance
   */
  public static getInstance(): StreamProcessor {
    if (!StreamProcessor.instance) {
      StreamProcessor.instance = new StreamProcessor();
    }
    return StreamProcessor.instance;
  }

  /**
   * Creates a readable stream from Redis scan operations
   *
   * @param options - Stream options
   * @returns A readable stream of data
   */
  public createRedisStream<T = any>(options: RedisStreamOptions): Readable {
    // Validate options
    const validatedOptions = RedisStreamOptionsSchema.parse(options);
    const {
      key,
      scanType,
      count,
      pattern,
      parseJson,
      batchSize = 10,
      maxRetries = 3,
      retryDelay = 1000,
      filter,
      transform,
      errorHandler
    } = validatedOptions;

    const redis = this.redis;

    // Create a readable stream
    return new Readable({
      objectMode: true,
      async read() {
        try {
          // Get the current cursor position from the stream's state
          const cursor = (this as any).cursor || 0;

          // Get items from Redis based on scan type
          let result;
          let scanMethod;

          switch (scanType) {
            case 'zscan':
              scanMethod = redis.zscan.bind(redis);
              break;
            case 'sscan':
              scanMethod = redis.sscan.bind(redis);
              break;
            case 'hscan':
              scanMethod = redis.hscan.bind(redis);
              break;
            default:
              scanMethod = redis.zscan.bind(redis);
          }

          // Apply retries if needed
          let retries = 0;
          let success = false;

          while (!success && retries <= maxRetries) {
            try {
              result = await scanMethod(key, cursor, {
                count: count || batchSize,
                ...(pattern ? { match: pattern } : {})
              });
              success = true;
            } catch (error) {
              retries++;
              if (retries > maxRetries) {
                throw error;
              }
              await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
          }

          if (!result) {
            this.push(null);
            return;
          }

          const [nextCursor, items] = result;

          if (items.length === 0) {
            // No more items, end the stream
            this.push(null);
            return;
          }

          // Process items based on scan type
          let processedItems: any[] = [];

          if (scanType === 'zscan' || scanType === 'sscan') {
            // For zscan and sscan, items alternate between values and scores/members
            processedItems = scanType === 'zscan'
              ? items.filter((_, index) => index % 2 === 0) // For zscan, get members (even indices)
              : items; // For sscan, all items are members
          } else {
            // For hscan, items alternate between field and value
            const fields: string[] = [];
            const values: any[] = [];

            for (let i = 0; i < items.length; i += 2) {
              fields.push(items[i] as string);
              values.push(items[i + 1]);
            }

            processedItems = fields.map((field, index) => ({
              field,
              value: values[index]
            }));
          }

          // If we need to get full objects from Redis
          if (parseJson && processedItems.length > 0) {
            const pipeline = redis.pipeline();

            for (const item of processedItems) {
              const itemKey = typeof item === 'object' && item.field
                ? `${key}:${item.field}`
                : `${key}:${item}`;

              pipeline.get(itemKey);
            }

            const jsonResults = await pipeline.exec();

            // Parse and filter results
            for (const json of jsonResults) {
              if (json) {
                try {
                  const parsedItem = parseJson ? JSON.parse(json as string) : json;

                  // Apply filter if provided
                  if (!filter || filter(parsedItem)) {
                    // Apply transform if provided
                    const itemToEmit = transform ? transform(parsedItem) : parsedItem;
                    this.push(itemToEmit);
                  }
                } catch (error) {
                  if (errorHandler) {
                    errorHandler(error, json);
                  } else {
                    console.error('Error processing item:', error);
                  }
                }
              }
            }
          } else {
            // Emit the items directly
            for (const item of processedItems) {
              // Apply filter if provided
              if (!filter || filter(item)) {
                // Apply transform if provided
                const itemToEmit = transform ? transform(item) : item;
                this.push(itemToEmit);
              }
            }
          }

          // Update cursor for next batch
          (this as any).cursor = nextCursor === '0' ? null : nextCursor;

          // If no more items, end the stream
          if ((this as any).cursor === null) {
            this.push(null);
          }
        } catch (error) {
          if (errorHandler) {
            try {
              errorHandler(error);
            } catch (handlerError) {
              this.destroy(new StreamProcessorError('Error in stream error handler', handlerError));
            }
          } else {
            this.destroy(new StreamProcessorError('Error streaming from Redis', error));
          }
        }
      }
    });
  }
  /**
   * Creates a readable stream from Vector search operations
   *
   * @param options - Stream options
   * @returns A readable stream of search results
   */
  public createVectorStream<T = any>(options: VectorStreamOptions): Readable {
    // Validate options
    const validatedOptions = VectorStreamOptionsSchema.parse(options);
    const {
      query,
      topK,
      filter: vectorFilter,
      includeMetadata,
      includeVectors, // Changed from includeValues to includeVectors
      batchSize = 10,
      filter,
      transform,
      errorHandler
    } = validatedOptions;

    const vector = this.vector;

    if (!vector) {
      return new Readable({
        objectMode: true,
        read() {
          this.destroy(new StreamProcessorError('Vector client not available'));
        }
      });
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
              vector: query, // 'query' parameter should be 'vector'
              topK,
              ...(vectorFilter ? { filter: JSON.stringify(vectorFilter) } : {}),
              includeMetadata,
              includeVectors
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

          // Get the next batch of results
          const endIndex = Math.min(currentIndex + batchSize, results.length);
          const batch = results.slice(currentIndex, endIndex);

          // Process and emit each result in the batch
          for (const result of batch) {
            // Apply filter if provided
            if (!filter || filter(result)) {
              // Apply transform if provided
              const itemToEmit = transform ? transform(result) : result;
              this.push(itemToEmit);
            }
          }

          // Update the index
          (this as any).currentIndex = endIndex;
        } catch (error) {
          if (errorHandler) {
            try {
              errorHandler(error);
            } catch (handlerError) {
              this.destroy(new StreamProcessorError('Error in stream error handler', handlerError));
            }
          } else {
            this.destroy(new StreamProcessorError('Error streaming from Vector', error));
          }
        }
      }
    });
  }

  /**
   * Creates a transform stream for processing data
   *
   * @param transformer - Function to transform each item
   * @param errorHandler - Optional function to handle errors
   * @returns A transform stream
   */
  public createTransformStream<TInput = any>(
    transformer: (item: TInput, encoding: string, callback: TransformCallback) => void,
    errorHandler?: (error: any) => void
  ): Transform {
    return new Transform({
      objectMode: true,
      transform(chunk: TInput, encoding, callback) {
        try {
          transformer(chunk, encoding, callback);
        } catch (error) {
          if (errorHandler) {
            try {
              errorHandler(error);
              callback(null); // Continue the stream
            } catch (handlerError) {
              callback(new StreamProcessorError('Error in transform error handler', handlerError));
            }
          } else {
            callback(new StreamProcessorError('Error in transform stream', error));
          }
        }
      }
    });
  }

  /**
   * Processes a stream with a handler function
   *
   * @param inputStream - The input stream
   * @param handler - Function to process each item
   * @param errorHandler - Optional function to handle errors
   * @returns Promise that resolves when processing is complete
   */
  public async processStream<T = any>(
    inputStream: Readable,
    handler: (item: T) => Promise<void>,
    errorHandler?: (error: any, item?: T) => Promise<void>
  ): Promise<void> {
    const processorStream = this.createTransformStream<T>(
      async function(item, _encoding, callback) {
        try {
          await handler(item);
          callback(null, item);
        } catch (error) {
          if (errorHandler) {
            try {
              await errorHandler(error, item);
              callback(null); // Continue the stream
            } catch (handlerError) {
              callback(new StreamProcessorError(`Error handling error in stream processor`, handlerError));
            }
          } else {
            callback(new StreamProcessorError(`Error processing item in stream`, error));
          }
        }
      }
    );

    await pipeline(inputStream, processorStream);
  }
}

// Export the singleton instance for easier access
export const streamProcessor = StreamProcessor.getInstance();

export default StreamProcessor;
