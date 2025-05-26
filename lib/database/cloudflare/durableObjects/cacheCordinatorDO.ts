/**
 * Cloudflare Durable Object for Cache Coordination Management
 *
 * Manages distributed cache coordination, cache invalidation,
 * and cache synchronization across multiple instances.
 *
 * Generated on 2025-05-24
 */

import { DurableObject } from 'cloudflare:workers';
import {
  CacheEntrySchema,
  type CacheEntry,
  CacheInvalidationSchema,
  type CacheInvalidation,
  type CacheStats,
} from './schema';

/**
 * CacheCoordinatorDO
 *
 * Durable Object for managing distributed cache coordination.
 * Handles cache invalidation, synchronization, and statistics.
 */
export class CacheCoordinatorDO extends DurableObject {
  private coordinatorId: string;
  private cache: Map<string, CacheEntry> = new Map();
  private subscribers: Map<string, WebSocket> = new Map();
  private invalidations: CacheInvalidation[] = [];
  private stats: CacheStats = {
    totalEntries: 0,
    totalSize: 0,
    hitCount: 0,
    missCount: 0,
    evictionCount: 0,
  };

  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env);
    this.coordinatorId = this.constructor.name;

    // Set up periodic cleanup
    this.ctx.storage.setAlarm(Date.now() + 60000); // 1 minute
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;

    try {
      if (request.headers.get('Upgrade') === 'websocket') {
        return await this.handleWebSocketUpgrade(request);
      }

      switch (method) {
        case 'POST':
          if (path === '/set') return await this.handleSetCache(request);
          if (path === '/invalidate')
            return await this.handleInvalidate(request);
          if (path === '/subscribe')
            return await this.handleWebSocketUpgrade(request);
          break;
        case 'GET':
          if (path === '/get') return await this.handleGetCache(request);
          if (path === '/stats') return await this.handleGetStats();
          if (path === '/invalidations')
            return await this.handleGetInvalidations();
          if (path === '/entries') return await this.handleGetEntries();
          break;
        case 'DELETE':
          if (path === '/delete') return await this.handleDeleteCache(request);
          if (path === '/clear') return await this.handleClearCache();
          break;
      }

      return new Response('Not Found', { status: 404 });
    } catch (error) {
      return new Response(`Internal Server Error: ${error}`, { status: 500 });
    }
  }

  async alarm(): Promise<void> {
    // Periodic cleanup of expired entries
    await this.cleanupExpiredEntries();

    // Schedule next cleanup
    this.ctx.storage.setAlarm(Date.now() + 60000); // 1 minute
  }

  private async handleWebSocketUpgrade(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const subscriberId = url.searchParams.get('subscriberId');

    if (!subscriberId) {
      return new Response('Missing subscriberId', { status: 400 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    this.subscribers.set(subscriberId, server);

    server.accept();
    server.addEventListener('close', () => {
      this.subscribers.delete(subscriberId);
    });

    server.addEventListener('message', async (event) => {
      try {
        const data = JSON.parse(event.data as string);
        await this.handleWebSocketMessage(subscriberId, data);
      } catch {
        server.send(JSON.stringify({ error: 'Invalid message format' }));
      }
    });

    // Send current stats
    server.send(
      JSON.stringify({
        type: 'cache-stats',
        data: this.stats,
      })
    );

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  private async handleSetCache(request: Request): Promise<Response> {
    let key: string;
    let value: unknown;
    let ttl: number | undefined;
    let tags: string[] | undefined;
    let metadata: Record<string, unknown> | undefined;

    try {
      const data = await request.json();

      // Validate the input data
      const SetCacheRequestSchema = CacheEntrySchema;

      const validatedData = SetCacheRequestSchema.parse(data);
      ({ key, value, ttl, tags, metadata } = validatedData);
    } catch (error) {
      return new Response(`Invalid request data: ${error}`, { status: 400 });
    }

    const now = Date.now();
    const entry: CacheEntry = {
      key,
      value,
      ttl,
      tags: tags || [],
      metadata,
      createdAt: now,
      updatedAt: now,
      expiresAt: ttl ? now + ttl * 1000 : undefined,
      hitCount: 0, // Ensure hitCount is always included
    };

    const wasNew = !this.cache.has(key);
    this.cache.set(key, entry);

    if (wasNew) {
      this.stats.totalEntries++;
    }

    await this.ctx.storage.put('cache', Object.fromEntries(this.cache));
    await this.ctx.storage.put('stats', this.stats);

    this.broadcastToSubscribers('cache-set', { key, entry });

    return new Response(JSON.stringify({ success: true, entry }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleGetCache(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const key = url.searchParams.get('key');

    if (!key) {
      return new Response('Missing cache key', { status: 400 });
    }

    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.missCount++;
      await this.ctx.storage.put('stats', this.stats);

      return new Response(JSON.stringify({ hit: false, value: null }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if expired
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.totalEntries--;
      this.stats.evictionCount++;
      this.stats.missCount++;

      await this.ctx.storage.put('cache', Object.fromEntries(this.cache));
      await this.ctx.storage.put('stats', this.stats);

      return new Response(
        JSON.stringify({ hit: false, value: null, expired: true }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    this.stats.hitCount++;
    this.stats.lastAccessed = Date.now();
    await this.ctx.storage.put('stats', this.stats);

    return new Response(
      JSON.stringify({ hit: true, value: entry.value, entry }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  private async handleInvalidate(request: Request): Promise<Response> {
    const data = await request.json();

    // Validate the input data first
    const InvalidateRequestSchema = CacheInvalidationSchema;

    let validatedData;
    try {
      validatedData = InvalidateRequestSchema.parse(data);
    } catch (error) {
      return new Response(`Invalid request data: ${error}`, { status: 400 });
    }

    const invalidation: CacheInvalidation = {
      ...validatedData,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };

    let invalidatedKeys: string[] = [];

    switch (invalidation.type) {
      case 'key':
        if (invalidation.target && this.cache.has(invalidation.target)) {
          this.cache.delete(invalidation.target);
          invalidatedKeys.push(invalidation.target);
          this.stats.totalEntries--;
          this.stats.evictionCount++;
        }
        break;

      case 'tag':
        if (invalidation.target) {
          for (const [key, entry] of this.cache.entries()) {
            if (entry.tags.includes(invalidation.target)) {
              this.cache.delete(key);
              invalidatedKeys.push(key);
              this.stats.totalEntries--;
              this.stats.evictionCount++;
            }
          }
        }
        break;

      case 'pattern':
        if (invalidation.target) {
          const pattern = new RegExp(invalidation.target);
          for (const [key] of this.cache.entries()) {
            if (pattern.test(key)) {
              this.cache.delete(key);
              invalidatedKeys.push(key);
              this.stats.totalEntries--;
              this.stats.evictionCount++;
            }
          }
        }
        break;

      case 'all':
        invalidatedKeys = Array.from(this.cache.keys());
        this.cache.clear();
        this.stats.totalEntries = 0;
        this.stats.evictionCount += invalidatedKeys.length;
        break;
    }

    this.invalidations.push(invalidation);

    // Keep only last 100 invalidations
    if (this.invalidations.length > 100) {
      this.invalidations = this.invalidations.slice(-100);
    }

    await this.ctx.storage.put('cache', Object.fromEntries(this.cache));
    await this.ctx.storage.put('stats', this.stats);
    await this.ctx.storage.put('invalidations', this.invalidations);

    this.broadcastToSubscribers('cache-invalidated', {
      invalidation,
      invalidatedKeys,
    });

    return new Response(
      JSON.stringify({
        success: true,
        invalidation,
        invalidatedKeys,
        count: invalidatedKeys.length,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  private async handleDeleteCache(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const key = url.searchParams.get('key');

    if (!key) {
      return new Response('Missing cache key', { status: 400 });
    }

    const existed = this.cache.has(key);
    this.cache.delete(key);

    if (existed) {
      this.stats.totalEntries--;
      this.stats.evictionCount++;
    }

    await this.ctx.storage.put('cache', Object.fromEntries(this.cache));
    await this.ctx.storage.put('stats', this.stats);

    this.broadcastToSubscribers('cache-deleted', { key });

    return new Response(JSON.stringify({ success: true, existed }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleClearCache(): Promise<Response> {
    const count = this.cache.size;
    this.cache.clear();

    this.stats.totalEntries = 0;
    this.stats.evictionCount += count;

    await this.ctx.storage.put('cache', {});
    await this.ctx.storage.put('stats', this.stats);

    this.broadcastToSubscribers('cache-cleared', { count });

    return new Response(JSON.stringify({ success: true, count }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleGetStats(): Promise<Response> {
    return new Response(JSON.stringify(this.stats), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleGetInvalidations(): Promise<Response> {
    return new Response(JSON.stringify(this.invalidations), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleGetEntries(): Promise<Response> {
    const entries = Object.fromEntries(this.cache);
    return new Response(JSON.stringify(entries), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleWebSocketMessage(
    subscriberId: string,
    data: Record<string, unknown>
  ): Promise<void> {
    const { type, payload } = data;

    switch (type) {
      case 'ping':
        this.sendToSubscriber(subscriberId, 'pong', {
          timestamp: Date.now(),
          ...(payload && typeof payload === 'object' ? payload : {}),
        });
        break;
      case 'request-stats':
        this.sendToSubscriber(subscriberId, 'cache-stats', this.stats);
        break;
      case 'request-entries':
        this.sendToSubscriber(
          subscriberId,
          'cache-entries',
          Object.fromEntries(this.cache)
        );
        break;
    }

    switch (type) {
      case 'ping':
        this.sendToSubscriber(subscriberId, 'pong', { timestamp: Date.now() });
        break;
      case 'request-stats':
        this.sendToSubscriber(subscriberId, 'cache-stats', this.stats);
        break;
      case 'request-entries':
        this.sendToSubscriber(
          subscriberId,
          'cache-entries',
          Object.fromEntries(this.cache)
        );
        break;
    }
  }

  private async cleanupExpiredEntries(): Promise<void> {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt && now > entry.expiresAt) {
        this.cache.delete(key);
        cleanedCount++;
        this.stats.totalEntries--;
        this.stats.evictionCount++;
      }
    }

    if (cleanedCount > 0) {
      await this.ctx.storage.put('cache', Object.fromEntries(this.cache));
      await this.ctx.storage.put('stats', this.stats);

      this.broadcastToSubscribers('cache-cleanup', {
        cleanedCount,
        timestamp: now,
      });
    }
  }

  private broadcastToSubscribers(type: string, data: unknown): void {
    const message = JSON.stringify({ type, data, timestamp: Date.now() });

    for (const [, ws] of this.subscribers) {
      try {
        ws.send(message);
      } catch {
        // Connection closed
      }
    }
  }

  private sendToSubscriber(
    subscriberId: string,
    type: string,
    data: unknown
  ): void {
    const ws = this.subscribers.get(subscriberId);
    if (ws) {
      try {
        ws.send(JSON.stringify({ type, data, timestamp: Date.now() }));
      } catch {
        this.subscribers.delete(subscriberId);
      }
    }
  }

  async getStats(): Promise<CacheStats> {
    return this.stats;
  }

  async getCacheEntry(key: string): Promise<CacheEntry | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.totalEntries--;
      this.stats.evictionCount++;
      await this.ctx.storage.put('cache', Object.fromEntries(this.cache));
      await this.ctx.storage.put('stats', this.stats);
      return null;
    }

    return entry;
  }
}
