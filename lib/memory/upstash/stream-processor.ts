/**
 * Stream Processor for Upstash Memory
 *
 * This module provides utilities for processing and streaming data from Upstash Redis and Vector.
 * It includes optimized methods for handling streaming responses, batching, and error handling.
 *
 * @module stream-processor
 */

import { getRedisClient, getVectorClient } from './upstashClients';
import { upstashLogger } from './upstash-logger';
import { Readable, Transform, TransformCallback } from 'stream';
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

export type StreamProcessorOptions = z.infer<
  typeof StreamProcessorOptionsSchema
>;

/**
 * Schema for Redis stream options
 */
export const RedisStreamOptionsSchema = z
  .object({
    key: z.string().min(1),
    scanType: z.enum(['zscan', 'sscan', 'hscan']).default('zscan'),
    count: z.number().int().positive().default(10),
    pattern: z.string().optional(),
    parseJson: z.boolean().default(true),
  })
  .merge(StreamProcessorOptionsSchema.partial());

export type RedisStreamOptions = z.infer<typeof RedisStreamOptionsSchema>;

/**
 * Schema for Vector stream options
 */
export const VectorStreamOptionsSchema = z
  .object({
    query: z.array(z.number()), // Only allow number arrays for vector queries
    topK: z.number().int().positive().default(10),
    filter: z.record(z.unknown()).optional(),
    includeMetadata: z.boolean().default(true),
    includeVectors: z.boolean().default(false), // Changed from includeValues to includeVectors
  })
  .merge(StreamProcessorOptionsSchema.partial());

export type VectorStreamOptions = z.infer<typeof VectorStreamOptionsSchema>;

// --- Error Handling ---

/**
 * Error class for stream processor operations
 */
export class StreamProcessorError extends Error {
  constructor(
    message: string,
    public cause?: unknown
  ) {
    super(message);
    this.name = 'StreamProcessorError';
    Object.setPrototypeOf(this, StreamProcessorError.prototype);
  }
}

/**
 * Stream processor for optimized data operations
 */
export class StreamProcessor {
  private redis = getRedisClient();
  private vector = (() => {
    try {
      return getVectorClient();
    } catch {
      upstashLogger.warn(
        'stream-processor',
        'Vector client not available, vector operations will be disabled'
      );
      return null;
    }
  })();
  private static instance: StreamProcessor;

  private constructor() {}

  public static getInstance(): StreamProcessor {
    if (!StreamProcessor.instance) {
      StreamProcessor.instance = new StreamProcessor();
    }
    return StreamProcessor.instance;
  }

  public createRedisStream(options: RedisStreamOptions): Readable {
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
      errorHandler,
    } = validatedOptions;

    const redis = this.redis;

    return new Readable({
      objectMode: true,
      async read(this: Readable & { cursor?: string }) {
        try {
          const cursor = this.cursor || '0';
          let result: [string, (string | number)[]] | null = null;
          let scanMethod: (
            key: string,
            cursor: string | number,
            options: { count: number; match?: string }
          ) => Promise<[string, (string | number)[]]>;

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

          let retries = 0;
          let success = false;

          while (!success && retries <= maxRetries) {
            try {
              result = await scanMethod(key, cursor, {
                count: count || batchSize,
                ...(pattern ? { match: pattern } : {}),
              });
              success = true;
            } catch {
              retries++;
              if (retries > maxRetries) {
                throw new StreamProcessorError('Max retries exceeded');
              }
              await new Promise((resolve) => setTimeout(resolve, retryDelay));
            }
          }

          if (!result) {
            this.push(null);
            return;
          }

          const [nextCursor, items] = result;

          if (items.length === 0) {
            this.push(null);
            return;
          }

          let processedItems: unknown[] = [];

          if (scanType === 'zscan' || scanType === 'sscan') {
            processedItems =
              scanType === 'zscan'
                ? items.filter((_, index) => index % 2 === 0)
                : items;
          } else {
            const fields: string[] = [];
            const values: unknown[] = [];

            for (let i = 0; i < items.length; i += 2) {
              fields.push(String(items[i]));
              values.push(items[i + 1]);
            }

            processedItems = fields.map((field, index) => ({
              field,
              value: values[index],
            }));
          }

          if (parseJson && processedItems.length > 0) {
            const pipeline = redis.pipeline();

            for (const item of processedItems) {
              const itemKey =
                typeof item === 'object' && item !== null && 'field' in item
                  ? `${key}:${item.field}`
                  : `${key}:${item}`;

              pipeline.get(itemKey);
            }

            const jsonResults = await pipeline.exec();

            for (const json of jsonResults) {
              if (json) {
                try {
                  const parsedItem = parseJson
                    ? JSON.parse(json as string)
                    : json;

                  if (!filter || filter(parsedItem)) {
                    const itemToEmit = transform
                      ? transform(parsedItem)
                      : parsedItem;
                    this.push(itemToEmit);
                  }
                } catch {
                  if (errorHandler) {
                    errorHandler(undefined, json);
                  } else {
                    upstashLogger.error(
                      'stream-processor',
                      'Error processing item in Redis stream',
                      { item: json }
                    );
                  }
                }
              }
            }
          } else {
            for (const item of processedItems) {
              if (!filter || filter(item)) {
                const itemToEmit = transform ? transform(item) : item;
                this.push(itemToEmit);
              }
            }
          }

          this.cursor = nextCursor === '0' ? undefined : nextCursor;

          if (this.cursor === undefined) {
            this.push(null);
          }
        } catch (error) {
          if (errorHandler) {
            try {
              errorHandler(error);
            } catch (handlerError) {
              this.destroy(
                new StreamProcessorError(
                  'Error in stream error handler',
                  handlerError
                )
              );
            }
          } else {
            this.destroy(
              new StreamProcessorError('Error streaming from Redis', error)
            );
          }
        }
      },
    });
  }

  public createVectorStream(options: VectorStreamOptions): Readable {
    const validatedOptions = VectorStreamOptionsSchema.parse(options);
    const {
      query,
      topK,
      filter: vectorFilter,
      includeMetadata,
      includeVectors,
      batchSize = 10,
      filter,
      transform,
      errorHandler,
    } = validatedOptions;

    const vector = this.vector;

    if (!vector) {
      return new Readable({
        objectMode: true,
        read() {
          this.destroy(new StreamProcessorError('Vector client not available'));
        },
      });
    }

    return new Readable({
      objectMode: true,
      async read(
        this: Readable & {
          searchStarted?: boolean;
          results?: unknown[];
          currentIndex?: number;
        }
      ) {
        try {
          if (!this.searchStarted) {
            this.searchStarted = true;

            const results = await vector.query({
              vector: query,
              topK,
              ...(vectorFilter ? { filter: JSON.stringify(vectorFilter) } : {}),
              includeMetadata,
              includeVectors,
            });

            this.results = results;
            this.currentIndex = 0;
          }

          const results = this.results;
          const currentIndex = this.currentIndex;

          if (
            !results ||
            currentIndex === undefined ||
            currentIndex >= results.length
          ) {
            this.push(null);
            return;
          }

          const endIndex = Math.min(currentIndex + batchSize, results.length);
          const batch = results.slice(currentIndex, endIndex);

          for (const result of batch) {
            if (!filter || filter(result)) {
              const itemToEmit = transform ? transform(result) : result;
              this.push(itemToEmit);
            }
          }

          this.currentIndex = endIndex;
        } catch {
          if (errorHandler) {
            try {
              errorHandler(undefined);
            } catch (handlerError) {
              this.destroy(
                new StreamProcessorError(
                  'Error in stream error handler',
                  handlerError
                )
              );
            }
          } else {
            this.destroy(
              new StreamProcessorError('Error streaming from Vector')
            );
          }
        }
      },
    });
  }

  public createTransformStream<TInput = unknown>(
    transformer: (
      item: TInput,
      encoding: string,
      callback: TransformCallback
    ) => void,
    errorHandler?: (error: unknown) => void
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
              callback(null);
            } catch (handlerError) {
              callback(
                new StreamProcessorError(
                  'Error in transform error handler',
                  handlerError
                )
              );
            }
          } else {
            callback(
              new StreamProcessorError('Error in transform stream', error)
            );
          }
        }
      },
    });
  }

  public async processStream<T = unknown>(
    inputStream: Readable,
    handler: (item: T) => Promise<void>,
    errorHandler?: (error: unknown, item?: T) => Promise<void>
  ): Promise<void> {
    const processorStream = this.createTransformStream<T>(
      async function (item, _encoding, callback) {
        try {
          await handler(item);
          callback(null, item);
        } catch (error) {
          if (errorHandler) {
            try {
              await errorHandler(error, item);
              callback(null);
            } catch (handlerError) {
              callback(
                new StreamProcessorError(
                  `Error handling error in stream processor`,
                  handlerError
                )
              );
            }
          } else {
            callback(
              new StreamProcessorError(`Error processing item in stream`, error)
            );
          }
        }
      }
    );

    await new Promise<void>((resolve, reject) => {
      inputStream
        .pipe(processorStream)
        .on('finish', resolve)
        .on('error', reject);
    });
  }
}

// Export the singleton instance for easier access
export const streamProcessor = StreamProcessor.getInstance();

export default StreamProcessor;
