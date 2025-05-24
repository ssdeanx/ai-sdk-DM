import {
  VectorizeIndex,
  VectorizeVectorMetadata,
} from '@cloudflare/workers-types';

export interface VectorRecord {
  id: string;
  values: number[];
  metadata?: Record<string, VectorizeVectorMetadata>;
  namespace?: string;
}

export interface QueryResult {
  id: string;
  score: number;
  values?: number[];
  metadata?: Record<string, unknown>;
}

export class CfVectorizeOps {
  private index: VectorizeIndex;

  constructor(index: VectorizeIndex) {
    this.index = index;
  }

  async upsert(vectors: VectorRecord[]): Promise<void> {
    await this.index.upsert(vectors);
  }

  async query(
    vector: number[],
    options?: {
      topK?: number;
      returnValues?: boolean;
      returnMetadata?: boolean;
    }
  ): Promise<QueryResult[]> {
    const result = await this.index.query(vector, {
      topK: options?.topK || 10,
      returnValues: options?.returnValues || false,
      returnMetadata: options?.returnMetadata || true,
    });

    return result.matches.map((match) => ({
      id: match.id,
      score: match.score,
      values: Array.isArray(match.values)
        ? match.values
        : match.values
          ? Array.from(match.values)
          : undefined,
      metadata: match.metadata,
    }));
  }

  async deleteByIds(ids: string[]): Promise<void> {
    await this.index.deleteByIds(ids);
  }

  async describeIndex() {
    return await this.index.describe();
  }

  async getByIds(ids: string[]): Promise<VectorRecord[]> {
    const result = await this.index.getByIds(ids);
    return result.map((vector) => ({
      id: vector.id,
      values: Array.isArray(vector.values)
        ? vector.values
        : Array.from(vector.values),
      metadata: vector.metadata,
    }));
  }
}
