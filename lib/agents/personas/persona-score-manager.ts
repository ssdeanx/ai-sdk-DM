/**
 * Persona Score Manager
 *
 * This module provides functionality for managing and updating scores for agent personas.
 * It tracks usage metrics, success rates, and other performance indicators to help
 * optimize persona selection and adaptation.
 *
 * Integrates with the tracing system to collect metrics and with Supabase for persistence.
 */

import { getSupabaseClient } from '../../memory/supabase';
import { getDrizzleClient, isDrizzleAvailable } from '../../memory/drizzle';
import { eq, and, desc, asc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { logEvent } from '../../tracing';
import { LRUCache } from 'lru-cache';
import { z } from 'zod';

/**
 * Zod schema for token usage data
 */
export const TokenUsageSchema = z.object({
  prompt_tokens: z.number().nonnegative(),
  completion_tokens: z.number().nonnegative(),
  total_tokens: z.number().nonnegative(),
});

/**
 * Zod schema for persona score data
 */
export const PersonaScoreSchema = z.object({
  id: z.string().uuid(),
  persona_id: z.string().uuid(),
  usage_count: z.number().nonnegative().default(0),
  success_count: z.number().nonnegative().default(0),
  failure_count: z.number().nonnegative().default(0),
  success_rate: z.number().min(0).max(1).default(0),
  average_latency: z.number().nonnegative().default(0),
  average_latency_ms: z.number().nonnegative().default(0),
  user_satisfaction: z.number().min(0).max(1).default(0.5),
  user_satisfaction_avg: z.number().min(0).max(1).default(0.5),
  user_feedback_count: z.number().nonnegative().default(0),
  adaptability_score: z.number().min(0).max(1).default(0.5),
  overall_score: z.number().min(0).max(1).default(0.5),
  token_usage_avg: TokenUsageSchema.default({
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0,
  }),
  last_used: z
    .string()
    .datetime()
    .default(() => new Date().toISOString()),
  metadata: z.record(z.any()).default({}),
  created_at: z
    .string()
    .datetime()
    .default(() => new Date().toISOString()),
  updated_at: z
    .string()
    .datetime()
    .default(() => new Date().toISOString()),
  persona: z.any().optional(),
  score: z.any().optional(),
});

/**
 * Type for persona score data
 */
export type PersonaScore = z.infer<typeof PersonaScoreSchema>;

/**
 * Zod schema for score update data
 */
export const ScoreUpdateDataSchema = z.object({
  success: z.boolean().optional(),
  latency: z.number().nonnegative().optional(),
  userSatisfaction: z.number().min(0).max(1).optional(),
  adaptabilityFactor: z.number().min(0).max(1).optional(),
  metadata: z.record(z.any()).optional(),
});

/**
 * Type for score update data
 */
export type ScoreUpdateData = z.infer<typeof ScoreUpdateDataSchema>;

/**
 * Persona Score Manager for tracking and updating persona performance metrics
 */
export class PersonaScoreManager {
  [x: string]: any;
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  // LRU cache for persona scores
  private scoreCache: LRUCache<string, PersonaScore> = new LRUCache({
    max: 100, // Maximum number of scores to cache
    ttl: 60000, // 1 minute TTL
    updateAgeOnGet: true, // Reset TTL when item is accessed
    allowStale: true, // Allow returning stale items before removing them
  });

  // LRU cache for score lists
  private listCache: LRUCache<string, PersonaScore[]> = new LRUCache({
    max: 50, // Maximum number of lists to cache
    ttl: 30000, // 30 seconds TTL
    updateAgeOnGet: true, // Reset TTL when item is accessed
    allowStale: true, // Allow returning stale items before removing them
  });

  // Cache statistics for monitoring
  private cacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
  };

  /**
   * Initialize the score manager
   */
  public async init(): Promise<void> {
    if (this.initialized) return;

    if (this.initPromise) {
      await this.initPromise;
      return;
    }

    this.initPromise = this.ensureScoreTableExists();
    await this.initPromise;
    this.initialized = true;
  }

  /**
   * Ensure the persona_scores table exists in Supabase
   * This is a safety check for development environments
   */
  private async ensureScoreTableExists(): Promise<void> {
    try {
      const supabase = getSupabaseClient();

      // Check if the table exists by querying it
      const { error } = await supabase
        .from('persona_scores' as any)
        .select('id')
        .limit(1);

      if (error && error.code === '42P01') {
        console.warn(
          'persona_scores table does not exist. Please run migrations.'
        );
      }
    } catch (error) {
      console.error('Error checking persona_scores table:', error);
    }
  }

  /**
   * Get score for a specific persona
   *
   * @param personaId - Persona ID
   * @returns PersonaScore or null if not found
   */
  public async getScore(personaId: string): Promise<PersonaScore | null> {
    await this.ensureInitialized();

    try {
      // Check cache first
      const cacheKey = `persona_score_${personaId}`;
      const cachedScore = this.scoreCache.get(cacheKey);

      if (cachedScore) {
        this.cacheStats.hits++;
        return cachedScore;
      }

      this.cacheStats.misses++;

      // Not in cache, fetch from database
      const supabase = getSupabaseClient();

      const { data, error } = await supabase
        .from('persona_scores' as any)
        .select('*')
        .eq('persona_id', personaId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - score doesn't exist yet
          return null;
        }
        throw error;
      }

      // Validate with Zod schema
      let score: PersonaScore;
      try {
        score = PersonaScoreSchema.parse(data);
      } catch (validationError) {
        console.error(
          `Validation error for persona score ${personaId}:`,
          validationError
        );
        if (validationError instanceof z.ZodError) {
          console.error(
            'Validation details:',
            JSON.stringify(validationError.errors, null, 2)
          );

          // Try to create a valid score from the data
          const defaultScore = PersonaScoreSchema.parse({
            id: uuidv4(),
            persona_id: personaId,
            // Default values will be applied by the schema
          });

          // Merge with the data we have
          score = {
            ...defaultScore,
            ...data,
            persona_id: personaId, // Ensure persona_id is correct
          };
        } else {
          // If not a Zod error, rethrow
          throw validationError;
        }
      }

      // Cache the result
      if (score) {
        this.scoreCache.set(cacheKey, score);
        this.cacheStats.sets++;
      }

      return score;
    } catch (error) {
      console.error(`Error getting score for persona ${personaId}:`, error);
      return null;
    }
  }

  /**
   * Get scores for all personas
   *
   * @param options - Optional filtering and sorting options
   * @returns Array of PersonaScore objects
   */
  public async getAllScores(options?: {
    sortBy?: 'usage_count' | 'success_rate' | 'overall_score';
    sortDirection?: 'asc' | 'desc';
    limit?: number;
  }): Promise<PersonaScore[]> {
    await this.ensureInitialized();

    // Create a cache key based on options
    const cacheKey = `all_scores_${options?.sortBy || 'none'}_${options?.sortDirection || 'none'}_${options?.limit || 'all'}`;

    // Check cache first
    const cached = this.listCache.get(cacheKey);
    if (cached) {
      this.cacheStats.hits++;
      return cached;
    }

    this.cacheStats.misses++;

    try {
      // Fetch from database
      const supabase = getSupabaseClient();
      let query = supabase.from('persona_scores' as any).select('*');

      // Apply sorting if specified
      if (options?.sortBy) {
        query = query.order(options.sortBy, {
          ascending: options.sortDirection === 'asc',
        });
      }

      // Apply limit if specified
      if (options?.limit) {
        query = query.limit(options.limit);
      }

      // Execute query
      const { data, error } = await query;

      if (error || !data) {
        console.error('Error fetching all scores:', error);
        return [];
      }

      // Validate each score with Zod schema
      const validatedScores: PersonaScore[] = [];

      for (const scoreData of data) {
        try {
          const score = PersonaScoreSchema.parse(scoreData);
          validatedScores.push(score);
        } catch (validationError) {
          console.warn(`Skipping invalid score:`, validationError);
          if (validationError instanceof z.ZodError) {
            console.warn(
              'Validation details:',
              JSON.stringify(validationError.errors, null, 2)
            );
          }
        }
      }

      // Cache the results
      this.listCache.set(cacheKey, validatedScores);

      return validatedScores;
    } catch (error) {
      console.error('Error getting all scores:', error);
      return [];
    }
  }
  /**
   * Create or update score for a persona
   *
   * @param personaId - Persona ID
   * @param updateData - Score update data
   * @returns Updated PersonaScore
   */
  public async updateScore(
    personaId: string,
    updateData: ScoreUpdateData
  ): Promise<PersonaScore | null> {
    try {
      // Validate update data with Zod schema
      const validatedUpdateData = ScoreUpdateDataSchema.parse(updateData);

      await this.ensureInitialized();
      const existing = await this.getScore(personaId);
      if (!existing) return null;

      // Update metrics
      const updatedData = {
        ...existing,
        usage_count: existing.usage_count + 1,
        success_rate:
          validatedUpdateData.success !== undefined
            ? (existing.success_rate * existing.usage_count +
                (validatedUpdateData.success ? 1 : 0)) /
              (existing.usage_count + 1)
            : existing.success_rate,
        average_latency:
          validatedUpdateData.latency !== undefined
            ? (existing.average_latency * existing.usage_count +
                validatedUpdateData.latency) /
              (existing.usage_count + 1)
            : existing.average_latency,
        user_satisfaction:
          validatedUpdateData.userSatisfaction !== undefined
            ? validatedUpdateData.userSatisfaction
            : existing.user_satisfaction,
        adaptability_score:
          validatedUpdateData.adaptabilityFactor !== undefined
            ? validatedUpdateData.adaptabilityFactor
            : existing.adaptability_score,
        overall_score: 0,
        last_used: new Date().toISOString(),
        metadata: { ...existing.metadata, ...validatedUpdateData.metadata },
        updated_at: new Date().toISOString(),
      };

      // Validate the updated data with Zod schema
      const updated = PersonaScoreSchema.parse(updatedData);

      // Calculate overall score
      updated.overall_score = this.calculateOverallScore(updated);

      // Save to database
      const supabase = getSupabaseClient();
      await supabase.from('persona_scores' as any).upsert(
        {
          ...updated,
          persona_id: personaId,
        },
        { onConflict: 'persona_id' }
      );

      // Update cache
      this.scoreCache.set(`persona_score_${personaId}`, updated);
      this.cacheStats.sets++;

      return updated;
    } catch (error) {
      console.error(`Error updating score for persona ${personaId}:`, error);
      if (error instanceof z.ZodError) {
        console.error(
          'Validation errors:',
          JSON.stringify(error.errors, null, 2)
        );
      }
      return null;
    }
  }

  /**
   * Calculate overall score based on individual metrics
   *
   * @param score - PersonaScore object
   * @returns Calculated overall score
   */
  private calculateOverallScore(score: PersonaScore): number {
    // Weights for different factors
    const weights = {
      successRate: 0.35,
      userSatisfaction: 0.3,
      adaptability: 0.2,
      latency: 0.15,
    };

    // Normalize latency score (lower is better)
    // Assuming 5000ms (5s) as a high latency threshold
    const normalizedLatency = Math.max(0, 1 - score.average_latency / 5000);

    // Calculate weighted score
    const overallScore =
      score.success_rate * weights.successRate +
      score.user_satisfaction * weights.userSatisfaction +
      score.adaptability_score * weights.adaptability +
      normalizedLatency * weights.latency;

    // Return rounded to 2 decimal places
    return Math.round(overallScore * 100) / 100;
  }

  /**
   * Get top performing personas based on overall score
   *
   * @param limit - Maximum number of personas to return
   * @returns Array of top performing PersonaScore objects
   */
  public async getTopPerformingPersonas(
    limit: number = 5
  ): Promise<PersonaScore[]> {
    return this.getAllScores({
      sortBy: 'overall_score',
      sortDirection: 'desc',
      limit,
    });
  }

  /**
   * Get most used personas
   *
   * @param limit - Maximum number of personas to return
   * @returns Array of most used PersonaScore objects
   */
  public async getMostUsedPersonas(limit: number = 5): Promise<PersonaScore[]> {
    return this.getAllScores({
      sortBy: 'usage_count',
      sortDirection: 'desc',
      limit,
    });
  }

  /**
   * Record user feedback for a persona
   *
   * @param personaId - Persona ID
   * @param rating - User satisfaction rating (0-1)
   * @param feedback - Optional feedback text
   * @returns Updated PersonaScore
   */
  public async recordUserFeedback(
    personaId: string,
    rating: number,
    feedback?: string
  ): Promise<PersonaScore | null> {
    try {
      // Validate inputs
      if (typeof personaId !== 'string' || !personaId) {
        throw new Error('Invalid personaId');
      }

      if (typeof rating !== 'number' || isNaN(rating)) {
        throw new Error('Rating must be a number');
      }

      if (feedback !== undefined && typeof feedback !== 'string') {
        throw new Error('Feedback must be a string if provided');
      }

      // Ensure rating is between 0 and 1
      const normalizedRating = Math.max(0, Math.min(1, rating));

      // Create update data
      const updateData: ScoreUpdateData = {
        userSatisfaction: normalizedRating,
        metadata: feedback ? { lastFeedback: feedback } : undefined,
      };

      // Validate update data with Zod schema
      const validatedUpdateData = ScoreUpdateDataSchema.parse(updateData);

      // Update score with user satisfaction
      return this.updateScore(personaId, validatedUpdateData);
    } catch (error) {
      console.error(
        `Error recording user feedback for persona ${personaId}:`,
        error
      );
      if (error instanceof z.ZodError) {
        console.error(
          'Validation errors:',
          JSON.stringify(error.errors, null, 2)
        );
      }
      return null;
    }
  }

  /**
   * Get cache statistics
   *
   * @returns Cache statistics
   */
  public getCacheStats(): {
    scores: { size: number; max: number };
    lists: { size: number; max: number };
    hits: number;
    misses: number;
    sets: number;
    hitRate: number;
  } {
    const totalRequests = this.cacheStats.hits + this.cacheStats.misses;
    const hitRate =
      totalRequests > 0 ? this.cacheStats.hits / totalRequests : 0;

    return {
      scores: {
        size: this.scoreCache.size,
        max: this.scoreCache.max,
      },
      lists: {
        size: this.listCache.size,
        max: this.listCache.max,
      },
      hits: this.cacheStats.hits,
      misses: this.cacheStats.misses,
      sets: this.cacheStats.sets,
      hitRate,
    };
  }

  /**
   * Clear all caches
   */
  public clearCaches(): void {
    this.scoreCache.clear();
    this.listCache.clear();

    // Reset statistics
    this.cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0,
    };
  }

  /**
   * Ensure the manager is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.init();
    }
  }
}

/**
 * Singleton instance of PersonaScoreManager
 */
export const personaScoreManager = new PersonaScoreManager();
