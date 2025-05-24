import { KVNamespace } from '@cloudflare/workers-types';

export interface KVGetOptions {
  type?: 'text' | 'json' | 'arrayBuffer' | 'stream';
  cacheTtl?: number;
}

export interface KVPutOptions {
  expirationTtl?: number;
  expiration?: number;
  metadata?: Record<string, unknown>;
}

export interface KVListOptions {
  prefix?: string;
  limit?: number;
  cursor?: string;
}

export class CfKvOps {
  private kv: KVNamespace;

  constructor(kv: KVNamespace) {
    this.kv = kv;
  }

  async get<T = unknown>(
    key: string,
    options?: KVGetOptions
  ): Promise<T | null> {
    const type = options?.type || 'json';

    if (type === 'json') {
      return (await this.kv.get(key, 'json')) as T;
    }

    return (await this.kv.get(key, type as 'text')) as T;
  }

  async put(
    key: string,
    value: unknown,
    options?: KVPutOptions
  ): Promise<void> {
    try {
      let serializedValue: string;

      if (typeof value === 'string') {
        serializedValue = value;
      } else {
        serializedValue = JSON.stringify(value);
      }

      await this.kv.put(key, serializedValue, options);
    } catch (error) {
      throw new Error(`Failed to put value in KV: ${error}`);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.kv.delete(key);
    } catch (error) {
      throw new Error(`Failed to delete key from KV: ${error}`);
    }
  }

  async list(options?: KVListOptions): Promise<string[]> {
    try {
      const result = await this.kv.list(options);
      return result.keys.map((key) => key.name);
    } catch (error) {
      throw new Error(`Failed to list KV keys: ${error}`);
    }
  }

  async getWithMetadata<T = unknown>(
    key: string
  ): Promise<{
    value: T | null;
    metadata: unknown | null;
  }> {
    try {
      const result = await this.kv.getWithMetadata(key, 'json');
      return {
        value: result.value as T,
        metadata: result.metadata,
      };
    } catch {
      return { value: null, metadata: null };
    }
  }
}
