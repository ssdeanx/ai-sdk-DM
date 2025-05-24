/**
 * Cloudflare MemoryFactory
 *
 * Coordinates all Cloudflare services: D1, KV, R2, Vectorize, and Durable Objects.
 * Provides typed getters, health checks, and service initialization.
 *
 * Generated on 2025-05-24
 */

import { generateId } from 'ai';
import { z } from 'zod';
import {
  D1Database,
  KVNamespace,
  R2Bucket,
  Vectorize,
  VectorizeIndex,
} from '@cloudflare/workers-types';

// Import D1 client and schema
import { getD1Orm, type D1Orm } from '../../database/cloudflare/d1/client';
import * as schema from '../../database/cloudflare/d1/schema';

// Import service operation classes
import { CfD1CrudService } from '../../database/cloudflare/d1/crudService';
import { CfKvOps } from '../../database/cloudflare/kv/ops';
import { CfVectorizeOps } from '../../database/cloudflare/vectorize/ops';
import { CfR2Store } from '../../database/cloudflare/r2/ops';

/**
 * Cloudflare Workers Environment Interface
 * Defines all expected bindings from wrangler.jsonc
 */
export interface AppEnv {
  // D1 Database
  DB_D1: D1Database;

  // KV Namespaces
  DB_KV: KVNamespace;
  KV_MAIN_CACHE: KVNamespace;
  KV_EPHEMERAL_CACHE: KVNamespace;

  // R2 Buckets
  R2_MAIN_BUCKET: R2Bucket;
  // Vectorize Index
  VECTORIZE_MAIN_INDEX: VectorizeIndex;
  // Durable Objects
  AGENT_THREAD_DO: DurableObjectNamespace;
  PERSONA_PROFILE_DO: DurableObjectNamespace;
  WORKFLOW_INSTANCE_DO: DurableObjectNamespace;
  APP_BUILDER_SESSION_DO: DurableObjectNamespace;
  CHAT_ROOM_DO: DurableObjectNamespace;
  TERMINAL_SESSION_DO: DurableObjectNamespace;
  DOCUMENT_COLLABORATION_DO: DurableObjectNamespace;
  INTEGRATION_SESSION_DO: DurableObjectNamespace;
  CACHE_COORDINATOR_DO: DurableObjectNamespace;

  // Assets (optional)
  ASSETS?: Fetcher;

  // Environment variables
  NODE_ENV?: string;
  GOOGLE_AI_API_KEY?: string;
  OPENAI_API_KEY?: string;
}

/**
 * Health Check Result Schema
 */
export const HealthCheckResultSchema = z.object({
  service: z.string(),
  status: z.enum(['healthy', 'unhealthy', 'degraded']),
  latency: z.number().optional(),
  error: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type HealthCheckResult = z.infer<typeof HealthCheckResultSchema>;

/**
 * Overall Health Status Schema
 */
export const OverallHealthSchema = z.object({
  status: z.enum(['healthy', 'unhealthy', 'degraded']),
  services: z.array(HealthCheckResultSchema),
  timestamp: z.number(),
  version: z.string().optional(),
});

export type OverallHealth = z.infer<typeof OverallHealthSchema>;

/**
 * MemoryFactory - Central coordinator for all Cloudflare services
 */
export class MemoryFactory {
  private env: AppEnv;
  private d1Orm: D1Orm | null = null;
  private d1CrudService: CfD1CrudService | null = null;
  private kvOps: CfKvOps | null = null;
  private vectorizeOps: CfVectorizeOps | null = null;
  private r2Store: CfR2Store | null = null;

  constructor(env: AppEnv) {
    this.env = env;
  }

  /**
   * Initialize all services
   * Should be called once during Worker startup
   */
  async initialize(): Promise<void> {
    try {
      // Initialize D1 ORM
      this.d1Orm = getD1Orm(this.env);

      // Initialize service operation classes
      this.d1CrudService = new CfD1CrudService(this.d1Orm);
      this.kvOps = new CfKvOps(this.env.DB_KV);
      this.vectorizeOps = new CfVectorizeOps(this.env.VECTORIZE_MAIN_INDEX);
      this.r2Store = new CfR2Store(this.env.R2_MAIN_BUCKET);

      // TODO: Validate that all required bindings are present
      this.validateBindings();
    } catch (error) {
      throw error;
    }
  }
  /**
   * Validate that all required bindings are present
   */
  private validateBindings(): void {
    const requiredBindings = [
      'DB_D1',
      'DB_KV',
      'KV_MAIN_CACHE',
      'KV_EPHEMERAL_CACHE',
      'R2_MAIN_BUCKET',
      'VECTORIZE_MAIN_INDEX',
      'AGENT_THREAD_DO',
      'PERSONA_PROFILE_DO',
      'WORKFLOW_INSTANCE_DO',
      'APP_BUILDER_SESSION_DO',
      'CHAT_ROOM_DO',
      'TERMINAL_SESSION_DO',
      'DOCUMENT_COLLABORATION_DO',
      'INTEGRATION_SESSION_DO',
      'CACHE_COORDINATOR_DO',
    ];

    for (const binding of requiredBindings) {
      if (!this.env[binding as keyof AppEnv]) {
        throw new Error(`Missing required binding: ${binding}`);
      }
    }
  }

  /**
   * Get D1 ORM instance
   */
  getD1Orm(): D1Orm {
    if (!this.d1Orm) {
      throw new Error('D1 ORM not initialized. Call initialize() first.');
    }
    return this.d1Orm;
  }

  /**
   * Get D1 CRUD service
   */
  getD1CrudService(): CfD1CrudService {
    if (!this.d1CrudService) {
      throw new Error(
        'D1 CRUD service not initialized. Call initialize() first.'
      );
    }
    return this.d1CrudService;
  }

  /**
   * Get KV operations service
   */
  getKvOps(): CfKvOps {
    if (!this.kvOps) {
      throw new Error(
        'KV operations not initialized. Call initialize() first.'
      );
    }
    return this.kvOps;
  }

  /**
   * Get Vectorize operations service
   */
  getVectorizeOps(): CfVectorizeOps {
    if (!this.vectorizeOps) {
      throw new Error(
        'Vectorize operations not initialized. Call initialize() first.'
      );
    }
    return this.vectorizeOps;
  }

  /**
   * Get R2 store service
   */
  getR2Store(): CfR2Store {
    if (!this.r2Store) {
      throw new Error('R2 store not initialized. Call initialize() first.');
    }
    return this.r2Store;
  }

  /**
   * Get specific KV namespace
   */
  getKvNamespace(
    name: 'DB_KV' | 'KV_MAIN_CACHE' | 'KV_EPHEMERAL_CACHE'
  ): KVNamespace {
    return this.env[name];
  }

  /**
   * Get specific Durable Object namespace
   */
  getDurableObjectNamespace(
    name:
      | 'AGENT_THREAD_DO'
      | 'PERSONA_PROFILE_DO'
      | 'WORKFLOW_INSTANCE_DO'
      | 'APP_BUILDER_SESSION_DO'
      | 'CHAT_ROOM_DO'
      | 'TERMINAL_SESSION_DO'
      | 'DOCUMENT_COLLABORATION_DO'
      | 'INTEGRATION_SESSION_DO'
      | 'CACHE_COORDINATOR_DO'
  ): DurableObjectNamespace {
    return this.env[name];
  }

  /**
   * Get R2 bucket
   */
  getR2Bucket(): R2Bucket {
    return this.env.R2_MAIN_BUCKET;
  }

  /**
  /**
   * Get Vectorize index
   */
  getVectorizeIndex(): VectorizeIndex {
    return this.env.VECTORIZE_MAIN_INDEX;
  }
  /**
   * Run comprehensive health checks for all Cloudflare services
   */
  async runHealthChecks(): Promise<OverallHealth> {
    const startTime = Date.now();
    const results: HealthCheckResult[] = [];

    // D1 Health Check
    try {
      const d1Start = Date.now();
      const orm = this.getD1Orm();
      await orm.select().from(schema.users).limit(1);
      results.push({
        service: 'D1',
        status: 'healthy',
        latency: Date.now() - d1Start,
      });
    } catch (error) {
      results.push({
        service: 'D1',
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // KV Health Checks
    for (const kvName of [
      'DB_KV',
      'KV_MAIN_CACHE',
      'KV_EPHEMERAL_CACHE',
    ] as const) {
      try {
        const kvStart = Date.now();
        const kv = this.getKvNamespace(kvName);
        const testKey = `health-check-${generateId()}`;
        await kv.put(testKey, 'test', { expirationTtl: 60 });
        await kv.get(testKey);
        await kv.delete(testKey);
        results.push({
          service: `KV-${kvName}`,
          status: 'healthy',
          latency: Date.now() - kvStart,
        });
      } catch (error) {
        results.push({
          service: `KV-${kvName}`,
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // R2 Health Check
    try {
      const r2Start = Date.now();
      const r2 = this.getR2Bucket();
      const testKey = `health-check-${generateId()}`;
      await r2.put(testKey, 'test');
      await r2.get(testKey);
      await r2.delete(testKey);
      results.push({
        service: 'R2',
        status: 'healthy',
        latency: Date.now() - r2Start,
      });
    } catch (error) {
      results.push({
        service: 'R2',
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Vectorize Health Check
    try {
      const vectorizeStart = Date.now();
      const vectorize = this.getVectorizeIndex();
      // Basic connectivity check - perform a minimal query to verify access
      await vectorize.query([0.1, 0.1, 0.1], { topK: 1, returnValues: false });
      results.push({
        service: 'Vectorize',
        status: 'healthy',
        latency: Date.now() - vectorizeStart,
        metadata: { note: 'Index connectivity verified via query' },
      });
    } catch (error) {
      results.push({
        service: 'Vectorize',
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Durable Objects Health Checks
    for (const doName of ['AGENT_THREAD_DO', 'PERSONA_PROFILE_DO'] as const) {
      try {
        const doStart = Date.now();
        const doNamespace = this.getDurableObjectNamespace(doName);
        // Basic namespace availability check
        if (doNamespace) {
          results.push({
            service: `DO-${doName}`,
            status: 'healthy',
            latency: Date.now() - doStart,
            metadata: { note: 'Namespace availability check' },
          });
        } else {
          throw new Error('Namespace not available');
        }
      } catch (error) {
        results.push({
          service: `DO-${doName}`,
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Determine overall status
    const hasUnhealthy = results.some((r) => r.status === 'unhealthy');
    const hasDegraded = results.some((r) => r.status === 'degraded');

    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    if (hasUnhealthy) {
      overallStatus = 'unhealthy';
    } else if (hasDegraded) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      services: results,
      timestamp: startTime,
      version: '1.0.0',
    };
  }

  /**
   * Get environment information (for debugging)
   */
  getEnvironmentInfo(): Record<string, unknown> {
    return {
      nodeEnv: this.env.NODE_ENV || 'unknown',
      hasGoogleAI: !!this.env.GOOGLE_AI_API_KEY,
      hasOpenAI: !!this.env.OPENAI_API_KEY,
      bindings: {
        d1: !!this.env.DB_D1,
        kvMain: !!this.env.KV_MAIN_CACHE,
        kvEphemeral: !!this.env.KV_EPHEMERAL_CACHE,
        kvDb: !!this.env.DB_KV,
        r2: !!this.env.R2_MAIN_BUCKET,
        vectorize: !!this.env.VECTORIZE_MAIN_INDEX,
        agentThreadDO: !!this.env.AGENT_THREAD_DO,
        personaProfileDO: !!this.env.PERSONA_PROFILE_DO,
        workflowInstanceDO: !!this.env.WORKFLOW_INSTANCE_DO,
        appBuilderSessionDO: !!this.env.APP_BUILDER_SESSION_DO,
        chatRoomDO: !!this.env.CHAT_ROOM_DO,
        terminalSessionDO: !!this.env.TERMINAL_SESSION_DO,
        documentCollaborationDO: !!this.env.DOCUMENT_COLLABORATION_DO,
        integrationSessionDO: !!this.env.INTEGRATION_SESSION_DO,
        cacheCoordinatorDO: !!this.env.CACHE_COORDINATOR_DO,
      },
    };
  }
}

/**
 * Create and initialize MemoryFactory instance
 */
export async function createMemoryFactory(env: AppEnv): Promise<MemoryFactory> {
  const factory = new MemoryFactory(env);
  await factory.initialize();
  return factory;
}
