import { getRedisClient } from '../../memory/upstash/upstashClients';
import { v4 as uuidv4 } from 'uuid';
import { PersonaScore, ScoreUpdateData } from './persona-library';

// --- Constants for Redis Keys ---
const PERSONA_SCORE_PREFIX = "persona:score:";
const PERSONA_SCORE_INDEX = "persona:scores"; // Sorted set for all persona scores, scored by overall score
const PERSONA_SCORE_HISTORY_PREFIX = "persona:score:history:"; // List of historical scores for a persona
const PERSONA_USAGE_PREFIX = "persona:usage:"; // Hash of usage statistics for a persona
const PERSONA_FEEDBACK_PREFIX = "persona:feedback:"; // List of user feedback for a persona

// --- Error Handling ---
export class PersonaScoreError extends Error {
  constructor(message: string, public cause?: any) {
    super(message);
    this.name = "PersonaScoreError";
    Object.setPrototypeOf(this, PersonaScoreError.prototype);
  }
}

/**
 * Saves a persona score to Redis
 * @param personaId The persona ID
 * @param score The score data
 * @returns A promise that resolves when the score is saved
 * @throws PersonaScoreError if saving fails
 */
export async function savePersonaScore(personaId: string, score: PersonaScore): Promise<void> {
  const redis = getRedisClient();
  const scoreKey = `${PERSONA_SCORE_PREFIX}${personaId}`;
  const historyKey = `${PERSONA_SCORE_HISTORY_PREFIX}${personaId}`;
  
  try {
    // Update last_updated
    const updatedScore = {
      ...score,
      personaId,
      last_updated: new Date().toISOString()
    };
    
    // Serialize score
    const scoreJson = JSON.stringify(updatedScore);
    
    // Use pipeline for atomic operations
    const pipeline = redis.pipeline();
    
    // Save current score
    pipeline.set(scoreKey, scoreJson);
    
    // Add to global index with overall score
    pipeline.zadd(PERSONA_SCORE_INDEX, { score: score.overall_score || 0, member: personaId });
    
    // Add to history (keep last 100 entries)
    pipeline.lpush(historyKey, scoreJson);
    pipeline.ltrim(historyKey, 0, 99);
    
    // Execute pipeline
    await pipeline.exec();
  } catch (error) {
    console.error(`Error saving persona score for ${personaId}:`, error);
    throw new PersonaScoreError(`Failed to save persona score for ${personaId}`, error);
  }
}

/**
 * Loads a persona score from Redis
 * @param personaId The persona ID
 * @returns A promise that resolves with the score, or null if not found
 * @throws PersonaScoreError if loading fails
 */
export async function loadPersonaScore(personaId: string): Promise<PersonaScore | null> {
  const redis = getRedisClient();
  const scoreKey = `${PERSONA_SCORE_PREFIX}${personaId}`;
  
  try {
    const scoreJson = await redis.get(scoreKey);
    
    if (!scoreJson) {
      return null;
    }
    
    // Parse score
    return JSON.parse(scoreJson as string) as PersonaScore;
  } catch (error) {
    console.error(`Error loading persona score for ${personaId}:`, error);
    throw new PersonaScoreError(`Failed to load persona score for ${personaId}`, error);
  }
}

/**
 * Updates a persona score with new data
 * @param personaId The persona ID
 * @param updateData The score update data
 * @returns A promise that resolves with the updated score
 * @throws PersonaScoreError if updating fails
 */
export async function updatePersonaScore(personaId: string, updateData: ScoreUpdateData): Promise<PersonaScore> {
  const redis = getRedisClient();
  const scoreKey = `${PERSONA_SCORE_PREFIX}${personaId}`;
  
  try {
    // Get current score
    const currentScoreJson = await redis.get(scoreKey);
    let currentScore: PersonaScore;
    
    if (currentScoreJson) {
      currentScore = JSON.parse(currentScoreJson as string) as PersonaScore;
    } else {
      // Initialize new score if none exists
      currentScore = {
        personaId,
        overall_score: 0.5,
        success_rate: 0,
        user_satisfaction: 0,
        adaptability: 0,
        latency: 0,
        usage_count: 0,
        task_specific_scores: {},
        trend: 'stable',
        last_updated: new Date().toISOString()
      };
    }
    
    // Update usage count
    currentScore.usage_count = (currentScore.usage_count || 0) + 1;
    
    // Update success rate (weighted average)
    if (updateData.success !== undefined) {
      const successValue = updateData.success ? 1 : 0;
      currentScore.success_rate = ((currentScore.success_rate || 0) * (currentScore.usage_count - 1) + successValue) / currentScore.usage_count;
    }
    
    // Update user satisfaction if provided
    if (updateData.userSatisfaction !== undefined) {
      currentScore.user_satisfaction = ((currentScore.user_satisfaction || 0) * (currentScore.usage_count - 1) + updateData.userSatisfaction) / currentScore.usage_count;
    }
    
    // Update adaptability if provided
    if (updateData.adaptabilityFactor !== undefined) {
      currentScore.adaptability = ((currentScore.adaptability || 0) * (currentScore.usage_count - 1) + updateData.adaptabilityFactor) / currentScore.usage_count;
    }
    
    // Update latency if provided
    if (updateData.latency !== undefined) {
      currentScore.latency = ((currentScore.latency || 0) * (currentScore.usage_count - 1) + updateData.latency) / currentScore.usage_count;
    }
    
    // Update task-specific scores if provided
    if (updateData.taskType && updateData.taskScore !== undefined) {
      const taskScores = currentScore.task_specific_scores || {};
      const currentTaskScore = taskScores[updateData.taskType] || { score: 0, count: 0 };
      
      currentTaskScore.score = (currentTaskScore.score * currentTaskScore.count + updateData.taskScore) / (currentTaskScore.count + 1);
      currentTaskScore.count += 1;
      
      taskScores[updateData.taskType] = currentTaskScore;
      currentScore.task_specific_scores = taskScores;
    }
    
    // Calculate overall score (weighted average of all factors)
    const weights = {
      success_rate: 0.4,
      user_satisfaction: 0.3,
      adaptability: 0.2,
      latency: 0.1
    };
    
    currentScore.overall_score = 
      (weights.success_rate * (currentScore.success_rate || 0)) +
      (weights.user_satisfaction * (currentScore.user_satisfaction || 0)) +
      (weights.adaptability * (currentScore.adaptability || 0)) +
      (weights.latency * Math.max(0, 1 - (currentScore.latency || 0) / 5000)); // Normalize latency (0-5000ms)
    
    // Update trend
    if (updateData.previousOverallScore !== undefined) {
      const scoreDiff = currentScore.overall_score - updateData.previousOverallScore;
      if (scoreDiff > 0.05) {
        currentScore.trend = 'improving';
      } else if (scoreDiff < -0.05) {
        currentScore.trend = 'declining';
      } else {
        currentScore.trend = 'stable';
      }
    }
    
    // Update timestamp
    currentScore.last_updated = new Date().toISOString();
    
    // Save updated score
    await savePersonaScore(personaId, currentScore);
    
    return currentScore;
  } catch (error) {
    console.error(`Error updating persona score for ${personaId}:`, error);
    throw new PersonaScoreError(`Failed to update persona score for ${personaId}`, error);
  }
}

/**
 * Records usage of a persona
 * @param personaId The persona ID
 * @param metadata Optional metadata about the usage
 * @returns A promise that resolves when the usage is recorded
 * @throws PersonaScoreError if recording fails
 */
export async function recordPersonaUsage(personaId: string, metadata: Record<string, any> = {}): Promise<void> {
  const redis = getRedisClient();
  const usageKey = `${PERSONA_USAGE_PREFIX}${personaId}`;
  
  try {
    // Increment usage count
    await redis.hincrby(usageKey, 'total_usage', 1);
    
    // Record timestamp of last usage
    await redis.hset(usageKey, 'last_used', new Date().toISOString());
    
    // Record task type if provided
    if (metadata.taskType) {
      await redis.hincrby(usageKey, `task:${metadata.taskType}`, 1);
    }
    
    // Record user ID if provided
    if (metadata.userId) {
      await redis.hincrby(usageKey, `user:${metadata.userId}`, 1);
    }
  } catch (error) {
    console.error(`Error recording persona usage for ${personaId}:`, error);
    throw new PersonaScoreError(`Failed to record persona usage for ${personaId}`, error);
  }
}
