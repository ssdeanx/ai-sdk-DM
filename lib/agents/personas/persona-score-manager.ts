/**
 * Persona Score Manager
 *
 * This module provides functionality for managing and updating scores for agent personas.
 * It tracks usage metrics, success rates, and other performance indicators to help
 * optimize persona selection and adaptation.
 *
 * Integrates with the tracing system to collect metrics and with Supabase for persistence.
 */

import { getSupabaseClient } from "../../memory/supabase"
import { getDrizzleClient, isDrizzleAvailable } from "../../memory/drizzle"
import { eq, and, desc, asc } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import { logEvent } from "../../tracing"
import { LRUCache } from 'lru-cache'

/**
 * Interface for persona score data
 */
export interface PersonaScore {
  id: string
  persona_id: string
  usage_count: number
  success_rate: number
  average_latency: number
  user_satisfaction: number
  adaptability_score: number
  overall_score: number
  last_used: string
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

/**
 * Interface for score update data
 */
export interface ScoreUpdateData {
  success?: boolean
  latency?: number
  userSatisfaction?: number
  adaptabilityFactor?: number
  metadata?: Record<string, any>
}

/**
 * Persona Score Manager for tracking and updating persona performance metrics
 */
export class PersonaScoreManager {
  private initialized: boolean = false
  private initPromise: Promise<void> | null = null

  // LRU cache for persona scores
  private scoreCache: LRUCache<string, PersonaScore> = new LRUCache({
    max: 100, // Maximum number of scores to cache
    ttl: 60000, // 1 minute TTL
    updateAgeOnGet: true, // Reset TTL when item is accessed
    allowStale: true, // Allow returning stale items before removing them
  })

  // LRU cache for score lists
  private listCache: LRUCache<string, PersonaScore[]> = new LRUCache({
    max: 50, // Maximum number of lists to cache
    ttl: 30000, // 30 seconds TTL
    updateAgeOnGet: true, // Reset TTL when item is accessed
    allowStale: true, // Allow returning stale items before removing them
  })

  // Cache statistics for monitoring
  private cacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
  }

  /**
   * Initialize the score manager
   */
  public async init(): Promise<void> {
    if (this.initialized) return

    if (this.initPromise) {
      await this.initPromise
      return
    }

    this.initPromise = this.ensureScoreTableExists()
    await this.initPromise
    this.initialized = true
  }

  /**
   * Ensure the persona_scores table exists in Supabase
   * This is a safety check for development environments
   */
  private async ensureScoreTableExists(): Promise<void> {
    try {
      const supabase = getSupabaseClient()

      // Check if the table exists by querying it
      const { error } = await supabase
        .from('persona_scores' as any)
        .select('id')
        .limit(1)

      if (error && error.code === '42P01') {
        console.warn('persona_scores table does not exist. Please run migrations.')
      }
    } catch (error) {
      console.error('Error checking persona_scores table:', error)
    }
  }

  /**
   * Get score for a specific persona
   *
   * @param personaId - Persona ID
   * @returns PersonaScore or null if not found
   */
  public async getScore(personaId: string): Promise<PersonaScore | null> {
    await this.ensureInitialized()

    try {
      // Check cache first
      const cacheKey = `persona_score_${personaId}`
      const cachedScore = this.scoreCache.get(cacheKey)

      if (cachedScore) {
        this.cacheStats.hits++
        return cachedScore
      }

      this.cacheStats.misses++

      // Not in cache, fetch from database
      const supabase = getSupabaseClient()

      const { data, error } = await supabase
        .from('persona_scores' as any)
        .select('*')
        .eq('persona_id', personaId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - score doesn't exist yet
          return null
        }
        throw error
      }

      const score = data as unknown as PersonaScore

      // Cache the result
      if (score) {
        this.scoreCache.set(cacheKey, score)
        this.cacheStats.sets++
      }

      return score
    } catch (error) {
      console.error(`Error getting score for persona ${personaId}:`, error)
      return null
    }
  }

  /**
   * Get scores for all personas
   *
   * @param options - Optional filtering and sorting options
   * @returns Array of PersonaScore objects
   */
  public async getAllScores(options?: {
    sortBy?: 'usage_count' | 'success_rate' | 'overall_score',
    sortDirection?: 'asc' | 'desc',
    limit?: number
  }): Promise<PersonaScore[]> {
    await this.ensureInitialized()
    const cacheKey = `all_scores_${options?.sortBy || 'none'}_${options?.sortDirection || 'none'}_${options?.limit || 'all'}`
    const cached = this.listCache.get(cacheKey)
    if (cached) {
      this.cacheStats.hits++
      return cached
    }
    this.cacheStats.misses++
    const supabase = getSupabaseClient()
    let query = supabase.from('persona_scores' as any).select('*')
    if (options?.sortBy) {
      query = query.order(options.sortBy, { ascending: options.sortDirection === 'asc' })
    }
    if (options?.limit) {
      query = query.limit(options.limit)
    }
    const { data, error } = await query
    if (error || !data) return []
    const scores = data as unknown as PersonaScore[]
    this.listCache.set(cacheKey, scores)
    return scores
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
    await this.ensureInitialized()
    const existing = await this.getScore(personaId)
    if (!existing) return null
    // update metrics
    const updated: PersonaScore = { ...existing,
      usage_count: existing.usage_count + 1,
      success_rate: updateData.success !== undefined ? ((existing.success_rate * existing.usage_count + (updateData.success ? 1 : 0)) / (existing.usage_count + 1)) : existing.success_rate,
      average_latency: updateData.latency !== undefined ? ((existing.average_latency * existing.usage_count + updateData.latency) / (existing.usage_count + 1)) : existing.average_latency,
      user_satisfaction: updateData.userSatisfaction !== undefined ? updateData.userSatisfaction : existing.user_satisfaction,
      adaptability_score: updateData.adaptabilityFactor !== undefined ? updateData.adaptabilityFactor : existing.adaptability_score,
      overall_score: 0,
      last_used: new Date().toISOString(),
      metadata: { ...existing.metadata, ...updateData.metadata },
      updated_at: new Date().toISOString()
    }
    updated.overall_score = this.calculateOverallScore(updated)
    const supabase = getSupabaseClient()
    await supabase.from('persona_scores' as any).upsert({
      ...updated,
      persona_id: personaId
    }, { onConflict: 'persona_id' })
    this.scoreCache.set(`persona_score_${personaId}`, updated)
    this.cacheStats.sets++
    return updated
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
      userSatisfaction: 0.30,
      adaptability: 0.20,
      latency: 0.15
    }

    // Normalize latency score (lower is better)
    // Assuming 5000ms (5s) as a high latency threshold
    const normalizedLatency = Math.max(0, 1 - (score.average_latency / 5000))

    // Calculate weighted score
    const overallScore =
      (score.success_rate * weights.successRate) +
      (score.user_satisfaction * weights.userSatisfaction) +
      (score.adaptability_score * weights.adaptability) +
      (normalizedLatency * weights.latency)

    // Return rounded to 2 decimal places
    return Math.round(overallScore * 100) / 100
  }

  /**
   * Get top performing personas based on overall score
   *
   * @param limit - Maximum number of personas to return
   * @returns Array of top performing PersonaScore objects
   */
  public async getTopPerformingPersonas(limit: number = 5): Promise<PersonaScore[]> {
    return this.getAllScores({
      sortBy: 'overall_score',
      sortDirection: 'desc',
      limit
    })
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
      limit
    })
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
    // Ensure rating is between 0 and 1
    const normalizedRating = Math.max(0, Math.min(1, rating))

    // Update score with user satisfaction
    return this.updateScore(personaId, {
      userSatisfaction: normalizedRating,
      metadata: feedback ? { lastFeedback: feedback } : undefined
    })
  }

  /**
   * Get cache statistics
   *
   * @returns Cache statistics
   */
  public getCacheStats(): {
    scores: { size: number, max: number },
    lists: { size: number, max: number },
    hits: number,
    misses: number,
    sets: number,
    hitRate: number
  } {
    const totalRequests = this.cacheStats.hits + this.cacheStats.misses
    const hitRate = totalRequests > 0 ? this.cacheStats.hits / totalRequests : 0

    return {
      scores: {
        size: this.scoreCache.size,
        max: this.scoreCache.max
      },
      lists: {
        size: this.listCache.size,
        max: this.listCache.max
      },
      hits: this.cacheStats.hits,
      misses: this.cacheStats.misses,
      sets: this.cacheStats.sets,
      hitRate
    }
  }

  /**
   * Clear all caches
   */
  public clearCaches(): void {
    this.scoreCache.clear()
    this.listCache.clear()

    // Reset statistics
    this.cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0
    }
  }

  /**
   * Ensure the manager is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.init()
    }
  }
}

/**
 * Singleton instance of PersonaScoreManager
 */
export const personaScoreManager = new PersonaScoreManager()
