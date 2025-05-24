import {
  R2Bucket,
  R2ObjectBody,
  R2Object,
  R2MultipartUpload,
} from '@cloudflare/workers-types';

export interface R2PutOptions {
  httpMetadata?: Record<string, string>;
  customMetadata?: Record<string, string>;
}

export interface R2ListOptions {
  prefix?: string;
  delimiter?: string;
  cursor?: string;
  limit?: number;
}

export class CfR2Store {
  private bucket: R2Bucket;

  constructor(bucket: R2Bucket) {
    this.bucket = bucket;
  }

  async put(
    key: string,
    value: string | ArrayBuffer,
    options?: R2PutOptions
  ): Promise<void> {
    await this.bucket.put(key, value, options);
  }

  async get(key: string): Promise<R2ObjectBody | null> {
    return await this.bucket.get(key);
  }

  async delete(key: string): Promise<void> {
    await this.bucket.delete(key);
  }

  async list(options?: R2ListOptions): Promise<string[]> {
    const result = await this.bucket.list(options);
    return result.objects.map((obj) => obj.key);
  }

  async head(key: string): Promise<R2Object | null> {
    return await this.bucket.head(key);
  }

  async createMultipartUpload(key: string): Promise<R2MultipartUpload> {
    return await this.bucket.createMultipartUpload(key);
  }
}
