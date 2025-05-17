/**
 * Persona Streaming Service
 *
 * This module provides utilities for streaming personas and micro-personas from Upstash memory.
 * It includes optimized methods for efficient data retrieval and processing.
 *
 * @module persona-streaming-service
 */

import { MemoryProcessor } from '../../memory/upstash/memory-processor';
import {
  GeminiCapability,
  PersonaDefinition,
  MicroPersonaDefinition,
} from './persona-library';
import { Readable, Transform } from 'stream';
import { pipeline } from 'stream/promises';

/**
 * Error class for persona streaming operations
 */
export class PersonaStreamingError extends Error {
  /**
   * Creates a new PersonaStreamingError
   *
   * @param message - Error message
   * @param cause - Optional cause of the error
   */
  constructor(
    message: string,
    public cause?: any
  ) {
    super(message);
    this.name = 'PersonaStreamingError';
    Object.setPrototypeOf(this, PersonaStreamingError.prototype);
  }
}

/**
 * Options for streaming personas
 */
export interface StreamPersonasOptions {
  /** Tags to filter personas by */
  tags?: string[];
  /** Capabilities to filter personas by */
  capabilities?: string[];
  /** Maximum number of personas to return */
  limit?: number;
  /** Batch size for efficient streaming */
  batchSize?: number;
  /** Whether to include micro-personas */
  includeMicroPersonas?: boolean;
  /** Custom filter function */
  customFilter?: (persona: PersonaDefinition) => boolean;
}

/**
 * Options for streaming micro-personas
 */
export interface StreamMicroPersonasOptions {
  /** Parent persona ID (optional - if not provided, all micro-personas will be streamed) */
  parentPersonaId?: string;
  /** Maximum number of micro-personas to return */
  limit?: number;
  /** Batch size for efficient streaming */
  batchSize?: number;
  /** Custom filter function */
  customFilter?: (microPersona: MicroPersonaDefinition) => boolean;
}

/**
 * Service for streaming personas and micro-personas
 */
export class PersonaStreamingService {
  private memoryProcessor: MemoryProcessor;
  private static instance: PersonaStreamingService;

  /**
   * Creates a new PersonaStreamingService instance
   * @private
   */
  private constructor() {
    this.memoryProcessor = MemoryProcessor.getInstance();
  }

  /**
   * Gets the singleton instance of PersonaStreamingService
   *
   * @returns The PersonaStreamingService instance
   */
  public static getInstance(): PersonaStreamingService {
    if (!PersonaStreamingService.instance) {
      PersonaStreamingService.instance = new PersonaStreamingService();
    }
    return PersonaStreamingService.instance;
  }

  /**
   * Streams personas with optional filtering
   *
   * @param options - Stream options
   * @returns A readable stream of personas
   */
  public streamPersonas(options: StreamPersonasOptions = {}): Readable {
    const {
      tags,
      capabilities,
      limit,
      batchSize = 10,
      includeMicroPersonas = false,
      customFilter,
    } = options;

    // Create a filter function based on options
    const filter = (persona: PersonaDefinition): boolean => {
      // Apply tag filter if provided
      if (tags && tags.length > 0) {
        if (
          !persona.tags?.length ||
          !tags.some((tag) => persona.tags?.includes(tag))
        ) {
          return false;
        }
      }

      // Apply capability filter if provided
      if (capabilities && capabilities.length > 0) {
        if (
          !persona.capabilities?.length ||
          !capabilities.some((cap) =>
            persona.capabilities?.includes(cap as GeminiCapability)
          )
        ) {
          return false;
        }
      }

      // Apply custom filter if provided
      if (customFilter && !customFilter(persona)) {
        return false;
      }

      return true;
    };

    // Get the base stream from the memory processor
    const baseStream = this.memoryProcessor.streamPersonas({
      batchSize,
      filter,
    });

    // Create a transform stream to handle limit and micro-personas
    const transformStream = new Transform({
      objectMode: true,
      transform: async function (
        persona: PersonaDefinition,
        encoding,
        callback
      ) {
        try {
          // Check if we've reached the limit
          if (limit !== undefined && (this as any).count >= limit) {
            callback(null, null);
            return;
          }

          // Initialize count if not already
          if ((this as any).count === undefined) {
            (this as any).count = 0;
          }

          // Increment count
          (this as any).count++;

          // If includeMicroPersonas is true, fetch and attach micro-personas
          if (includeMicroPersonas) {
            try {
              const microPersonaStream =
                PersonaStreamingService.getInstance().streamMicroPersonas({
                  parentPersonaId: persona.id,
                });

              const microPersonas: MicroPersonaDefinition[] = [];

              for await (const microPersona of microPersonaStream) {
                microPersonas.push(microPersona);
              }

              // Attach micro-personas to the persona using type assertion
              (persona as any).microPersonas = microPersonas;
            } catch (error) {
              console.error(
                `Error fetching micro-personas for persona ${persona.id}:`,
                error
              );
            }
          }

          // Push the persona to the output stream
          callback(null, persona);
        } catch (error) {
          callback(
            new PersonaStreamingError('Error processing persona', error)
          );
        }
      },
    });

    // Pipe the base stream through the transform stream
    return baseStream.pipe(transformStream);
  }

  /**
   * Streams micro-personas for a specific parent persona
   *
   * @param options - Stream options
   * @returns A readable stream of micro-personas
   */
  public streamMicroPersonas(options: StreamMicroPersonasOptions): Readable {
    const { parentPersonaId, limit, batchSize = 10, customFilter } = options;

    // If no parentPersonaId is provided, return an empty stream
    // (This would be enhanced in a real implementation to stream all micro-personas)
    if (!parentPersonaId) {
      // Create an empty readable stream
      return new Readable({
        objectMode: true,
        read() {
          this.push(null); // End the stream immediately
        },
      });
    }

    // Get the base stream from the memory processor
    const baseStream = this.memoryProcessor.streamMicroPersonas(
      parentPersonaId,
      {
        batchSize,
        filter: customFilter,
      }
    );

    // Create a transform stream to handle limit
    const transformStream = new Transform({
      objectMode: true,
      transform: function (
        microPersona: MicroPersonaDefinition,
        encoding,
        callback
      ) {
        try {
          // Check if we've reached the limit
          if (limit !== undefined && (this as any).count >= limit) {
            callback(null, null);
            return;
          }

          // Initialize count if not already
          if ((this as any).count === undefined) {
            (this as any).count = 0;
          }

          // Increment count
          (this as any).count++;

          // Push the micro-persona to the output stream
          callback(null, microPersona);
        } catch (error) {
          callback(
            new PersonaStreamingError('Error processing micro-persona', error)
          );
        }
      },
    });

    // Pipe the base stream through the transform stream
    return baseStream.pipe(transformStream);
  }

  /**
   * Collects all personas from a stream into an array
   *
   * @param options - Stream options
   * @returns Promise resolving to an array of personas
   */
  public async getAllPersonas(
    options: StreamPersonasOptions = {}
  ): Promise<PersonaDefinition[]> {
    const stream = this.streamPersonas(options);
    const personas: PersonaDefinition[] = [];

    for await (const persona of stream) {
      personas.push(persona);
    }

    return personas;
  }

  /**
   * Collects all micro-personas from a stream into an array
   *
   * @param options - Stream options
   * @returns Promise resolving to an array of micro-personas
   */
  public async getAllMicroPersonas(
    options: StreamMicroPersonasOptions
  ): Promise<MicroPersonaDefinition[]> {
    const stream = this.streamMicroPersonas(options);
    const microPersonas: MicroPersonaDefinition[] = [];

    for await (const microPersona of stream) {
      microPersonas.push(microPersona);
    }

    return microPersonas;
  }

  /**
   * Processes a stream of personas with a custom handler
   *
   * @param handler - Function to process each persona
   * @param options - Stream options
   * @returns Promise that resolves when processing is complete
   */
  public async processPersonaStream(
    handler: (persona: PersonaDefinition) => Promise<void>,
    options: StreamPersonasOptions = {}
  ): Promise<void> {
    const stream = this.streamPersonas(options);

    const processorStream = new Transform({
      objectMode: true,
      transform: async function (
        persona: PersonaDefinition,
        encoding,
        callback
      ) {
        try {
          await handler(persona);
          callback(null, persona);
        } catch (error) {
          callback(
            new PersonaStreamingError(
              `Error processing persona ${persona.id}`,
              error
            )
          );
        }
      },
    });

    await pipeline(stream, processorStream);
  }
}
