/**
 * Example usage of the persona scoring system with advanced scoring features
 * 
 * This file demonstrates how to use the persona scoring system to track,
 * analyze, and retrieve top-performing personas based on various metrics.
 */

import { personaManager } from '../persona-manager';
import { personaScoreManager } from '../persona-score-manager';
import { trace, span } from '../../../tracing';
import { PersonaDefinition, PersonaScore, GeminiCapability } from '../persona-library';

/**
 * Interface for persona with its associated score
 */
interface PersonaWithScore {
  persona: PersonaDefinition;
  score: PersonaScore;
}

/**
 * Options for retrieving top performing personas
 */
interface TopPerformingPersonasOptions {
  /** Number of personas to retrieve (default: 5) */
  limit?: number;
  
  /** Minimum number of usages required (default: 3) */
  minUsageCount?: number;
  
  /** Task type to filter by (optional) */
  taskType?: string;
  
  /** Required capabilities (optional) */
  requiredCapabilities?: GeminiCapability[];
  
  /** Metric to sort by (default: 'overall_score') */
  sortBy?: 'overall_score' | 'success_rate' | 'user_satisfaction' | 'adaptability' | 'latency';
  
  /** Time period to consider (in days, default: all time) */
  timeFrame?: number;
}

/**
 * Get top performing personas with advanced scoring and filtering options
 * 
 * @param options Configuration options for retrieving top personas
 * @returns Array of personas with their scores, sorted by the specified metric
 */
async function getTopPerformingPersonasWithScoring(options: TopPerformingPersonasOptions = {}): Promise<PersonaWithScore[]> {
  // Set default options
  const {
    limit = 5,
    minUsageCount = 3,
    taskType,
    requiredCapabilities = [],
    sortBy = 'overall_score',
    timeFrame
  } = options;
  
  // Create a trace for this operation
  const traceObj = await trace({
    name: 'get_top_performing_personas',
    userId: 'system',
    metadata: {
      options
    }
  });
  
  try {
    // Get all personas
    const allPersonas = await personaManager.listPersonas();
    
    // Filter personas by required capabilities if specified
    let filteredPersonas = allPersonas;
    if (requiredCapabilities.length > 0) {
      filteredPersonas = allPersonas.filter(persona => {
        // Check if persona has all required capabilities
        return requiredCapabilities.every(capability => 
          persona.capabilities?.includes(capability) || 
          (persona as PersonaDefinition & { specializations?: string[] }).specializations?.includes(capability)
        );
      });
    }
    
    // Get scores for all filtered personas
    const personasWithScores = await Promise.all(
      filteredPersonas.map(async (persona): Promise<PersonaWithScore> => {
        // Get the score for this persona
        const score = await personaScoreManager.getScore(persona.id);
        
        // If no score exists, create a default one
        if (!score) {
          return {
            persona,
            score: {
              id: '',
              persona_id: persona.id,
              usage_count: 0,
              success_count: 0,
              failure_count: 0,
              success_rate: 0,
              average_latency_ms: 0,
              user_satisfaction_avg: 0,
              user_feedback_count: 0,
              adaptability_score: 0,
              overall_score: 0,
              last_used_at: undefined,
              last_scored_at: undefined,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              metadata: {},
              token_usage_avg: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
            }
          };
        }
        
        // Ensure all required properties are present in the returned score
        return {
          persona,
          score: {
            ...score,
            success_count: score.success_count ?? 0,
            failure_count: score.failure_count ?? 0,
            average_latency_ms: score.average_latency_ms ?? 0,
            user_satisfaction_avg: score.user_satisfaction_avg ?? 0,
            user_feedback_count: score.user_feedback_count ?? 0,
            adaptability_score: score.adaptability_score ?? 0,
            token_usage_avg: score.token_usage_avg ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
          }
        };
      })    );    
    // Apply additional filters
    let result = personasWithScores.filter(item => {
      // Filter by minimum usage count
      if (item.score.usage_count < minUsageCount) {
        return false;
      }
      
      // Filter by time frame if specified
      if (timeFrame && item.score.last_used_at) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - timeFrame);
        const lastUsedDate = new Date(item.score.last_used_at);
        if (lastUsedDate < cutoffDate) {
          return false;
        }
      }
      
      // Filter by task type if specified
      if (taskType) {
        // Check if persona is specialized for this task type
        const isSpecializedForTask = item.persona.tags?.includes(`task:${taskType}`) || 
                                    item.persona.tags?.includes(taskType);
        
        return isSpecializedForTask;
      }
      
      return true;
    });
    
    // Sort by the specified metric
    result.sort((a, b) => {
      switch (sortBy) {
        case 'success_rate':
          return b.score.success_rate - a.score.success_rate;
        
        case 'user_satisfaction':
          return b.score.user_satisfaction_avg - a.score.user_satisfaction_avg;
        
        case 'adaptability':
          return b.score.adaptability_score - a.score.adaptability_score;
        
        case 'latency':
          // For latency, lower is better
          return (a.score.average_latency_ms || Infinity) - (b.score.average_latency_ms || Infinity);
        
        case 'overall_score':
        default:
          return b.score.overall_score - a.score.overall_score;
      }
    });
    
    // Limit the number of results
    result = result.slice(0, limit);
    
    // Log the results
    console.log(`Retrieved ${result.length} top performing personas sorted by ${sortBy}`);
    result.forEach((item, index) => {
      console.log(`${index + 1}. ${item.persona.name} (${sortBy}: ${
        sortBy === 'latency' 
          ? `${item.score.average_latency_ms || 'N/A'}ms` 
          : sortBy === 'overall_score' 
            ? item.score.overall_score.toFixed(2) 
            : sortBy === 'user_satisfaction'
              ? item.score.user_satisfaction_avg.toFixed(2)
              : sortBy === 'adaptability'
                ? item.score.adaptability_score.toFixed(2)
                : item.score.success_rate.toFixed(2)
      })`);
    });
    
    return result;
  } catch (error) {
    console.error('Error getting top performing personas:', error);
    throw error;
  } finally {
    // End the trace
    traceObj.end();
  }
}
/**
 * Example function to demonstrate using the top performing personas for a specific task
 * 
 * @param taskType The type of task to find personas for
 * @param requiredCapabilities Optional capabilities the personas must have
 * @returns The selected top persona, or null if none found
 */
async function useTopPerformingPersonaForTask(taskType: string, requiredCapabilities: GeminiCapability[] = []): Promise<PersonaDefinition | null> {
  console.log(`Finding top performing persona for task type: ${taskType}`);
  
  // Get top performing personas for this task type
  const topPersonas = await getTopPerformingPersonasWithScoring({
    limit: 3,
    taskType,
    requiredCapabilities,
    sortBy: 'overall_score',
    minUsageCount: 1
  });
  
  if (topPersonas.length === 0) {
    console.log('No suitable personas found for this task');
    return null;
  }
  
  // Select the top persona
  const selectedPersona = topPersonas[0].persona;
  console.log(`Selected top performing persona: ${selectedPersona.name}`);
  console.log(`Score: ${topPersonas[0].score.overall_score.toFixed(2)}`);
  console.log(`Success rate: ${topPersonas[0].score.success_rate.toFixed(2)}`);
  
  return selectedPersona;
}

/**
 * Example function to demonstrate analyzing persona performance trends
 * 
 * @param personaId The ID of the persona to analyze
 * @param timeFrameDays Number of days to analyze (default: 30)
 */
async function analyzePersonaPerformanceTrend(personaId: string, timeFrameDays: number = 30): Promise<{
  trend: 'improving' | 'declining' | 'stable';
  details: Record<string, any>;
}> {
  console.log(`Analyzing performance trend for persona ${personaId} over ${timeFrameDays} days`);
  
  // Get the persona
  const persona = await personaManager.getPersonaById(personaId);
  if (!persona) {
    throw new Error(`Persona with ID ${personaId} not found`);
  }
  
  // Get the persona's score
  const score = await personaScoreManager.getScore(personaId);
  if (!score || score.usage_count < 5) {
    return {
      trend: 'stable',
      details: {
        reason: 'Insufficient data for trend analysis',
        usage_count: score?.usage_count || 0
      }
    };
  }
  
  // For this example, we'll simulate feedback history since it's not in the current schema
  // In a real implementation, this would come from a database or other storage
  const simulatedFeedbackHistory = [];
  for (let i = 0; i < score.user_feedback_count; i++) {
    const daysAgo = Math.floor(Math.random() * timeFrameDays * 1.5);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    
    simulatedFeedbackHistory.push({
      timestamp: date.toISOString(),
      rating: 0.5 + Math.random() * 0.5, // Random rating between 0.5 and 1.0
      feedback: ''
    });
  }
  
  // Calculate the cutoff date
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - timeFrameDays);
  
  // Filter feedback by time frame
  const recentFeedback = simulatedFeedbackHistory.filter(item => {
    return new Date(item.timestamp) >= cutoffDate;
  });
  
  if (recentFeedback.length < 3) {
    return {
      trend: 'stable',
      details: {
        reason: 'Insufficient recent feedback for trend analysis',
        recent_feedback_count: recentFeedback.length
      }
    };
  }
  
  // Sort feedback by timestamp (oldest first)
  recentFeedback.sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  
  // Split feedback into two halves to compare
  const midpoint = Math.floor(recentFeedback.length / 2);
  const olderHalf = recentFeedback.slice(0, midpoint);
  const newerHalf = recentFeedback.slice(midpoint);
  
  // Calculate average ratings for each half
  const olderAvg = olderHalf.reduce((sum, item) => sum + item.rating, 0) / olderHalf.length;
  const newerAvg = newerHalf.reduce((sum, item) => sum + item.rating, 0) / newerHalf.length;
  
  // Determine trend
  const difference = newerAvg - olderAvg;
  let trend: 'improving' | 'declining' | 'stable';
  
  if (difference > 0.1) {
    trend = 'improving';
  } else if (difference < -0.1) {
    trend = 'declining';
  } else {
    trend = 'stable';
  }
  
  // Compile details
  const details = {
    persona_name: persona.name,
    total_feedback_count: score.user_feedback_count,
    recent_feedback_count: recentFeedback.length,
    older_average: olderAvg.toFixed(2),
    newer_average: newerAvg.toFixed(2),
    difference: difference.toFixed(2),
    current_overall_score: score.overall_score.toFixed(2),
    current_success_rate: score.success_rate.toFixed(2)
  };
  
  console.log(`Performance trend for ${persona.name}: ${trend}`);
  console.log(`Older average rating: ${olderAvg.toFixed(2)}`);
  console.log(`Newer average rating: ${newerAvg.toFixed(2)}`);
  console.log(`Difference: ${difference.toFixed(2)}`);
  
  return { trend, details };
}

/**
 * Example function to demonstrate finding the best persona for a specific task type
 * based on historical performance
 * 
 * @param taskType The type of task to find the best persona for
 * @returns The best persona for the task, or null if none found
 */
async function getBestPersonaForTaskType(taskType: string): Promise<PersonaWithScore | null> {
  console.log(`Finding best persona for task type: ${taskType}`);
  
  // Get all personas
  const allPersonas = await personaManager.listPersonas();
  
  // Filter personas that support this task type
  const supportingPersonas = allPersonas.filter(persona => 
    persona.tags?.includes(`task:${taskType}`) || persona.tags?.includes(taskType)
  );
  
  if (supportingPersonas.length === 0) {
    console.log(`No personas found that support task type: ${taskType}`);
    return null;
  }
  
  // Get scores for all supporting personas
  const personasWithScores: PersonaWithScore[] = await Promise.all(
    supportingPersonas.map(async (persona) => {
      const score = await personaScoreManager.getScore(persona.id);
      
      // If no score exists or no usage for this task type, create a default one
      if (!score) {
        return {
          persona,
          score: {
            id: '',
            persona_id: persona.id,
            usage_count: 0,
            success_count: 0,
            failure_count: 0,
            success_rate: 0,
            average_latency_ms: 0,
            user_satisfaction_avg: 0,
            user_feedback_count: 0,
            adaptability_score: 0,
            overall_score: 0,
            last_used_at: undefined,
            last_scored_at: undefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),

            metadata: {
              task_specific_scores: {}
            },
            token_usage_avg: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
          }
        };
      }
      
      return { persona, score };
    })
  );
  
  // Sort by overall score
  personasWithScores.sort((a, b) => b.score.overall_score - a.score.overall_score);
  
  // Filter personas that have been used for this task type
  const usedPersonas = personasWithScores.filter(item => 
    (item.score.metadata as any)?.task_specific_scores?.[taskType]?.usage_count > 0
  );
  
  if (usedPersonas.length === 0) {
    console.log(`No personas have been used for task type: ${taskType}`);
    
    // Return the persona that's most specialized for this task type
    const mostSpecialized = personasWithScores.sort((a, b) => {
      const aSpecialization = a.persona.metadata?.specializations?.includes(taskType) ? 1 : 0;
      const bSpecialization = b.persona.metadata?.specializations?.includes(taskType) ? 1 : 0;
      return bSpecialization - aSpecialization;
    })[0];
    
    console.log(`Recommending ${mostSpecialized.persona.name} based on specialization`);
    return mostSpecialized;
  }
  
  // Sort by task-specific success rate
  usedPersonas.sort((a, b) => {
    const aScore = ((a.score.metadata as any)?.task_specific_scores?.[taskType]?.success_rate) || 0;
    const bScore = ((b.score.metadata as any)?.task_specific_scores?.[taskType]?.success_rate) || 0;
    return bScore - aScore;
  });  
  const bestPersona = usedPersonas[0];
  console.log(`Best persona for ${taskType}: ${bestPersona.persona.name}`);
  console.log(`Task-specific success rate: ${((bestPersona.score.metadata as any)?.task_specific_scores?.[taskType]?.success_rate.toFixed(2)) || 0}`);
  return bestPersona;
}
/**
 * Example function to demonstrate persona selection with scoring
 */
async function selectPersonaForTask(taskType: string, requiredCapabilities: GeminiCapability[] = []) {
  console.log(`Selecting persona for task type: ${taskType}`);
  
  // Get a recommendation based on context
  const recommendation = await personaManager.getPersonaRecommendation({
    taskType,
    requiredCapabilities
  });
  
  if (!recommendation) {
    console.log('No suitable persona found');
    return null;
  }
  
  console.log(`Recommended persona: ${recommendation.persona.name}`);
  console.log(`Match reason: ${recommendation.matchReason}`);
  
  if (recommendation.score) {
    console.log(`Score: ${recommendation.score.overall_score}`);
    console.log(`Usage count: ${recommendation.score.usage_count}`);
    console.log(`Success rate: ${recommendation.score.success_rate}`);
  } else {
    console.log('No score data available for this persona');
  }
  
  return recommendation.persona;
}

/**
 * Example function to demonstrate recording persona usage
 */
async function usePersonaForTask(personaId: string, taskType: string) {
  console.log(`Using persona ${personaId} for task type: ${taskType}`);
  
  // Create a trace for this operation
  const traceObj = await trace({
    name: `persona_task_${taskType}`,
    userId: 'example-user',
    metadata: {
      personaId,
      taskType
    }
  });
  
  try {
    // Start timing
    const startTime = Date.now();
    
    // Simulate task execution
    console.log('Executing task...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate work
    
    // End timing
    const endTime = Date.now();
    const latency = endTime - startTime;
    
    // Simulate success or failure (90% success rate)
    const success = Math.random() < 0.9;
    
    // Record usage with metrics
    const result = personaManager.recordPersonaUsage(personaId, {
      success,
      latency,
      adaptabilityFactor: 0.8, // Example adaptability factor
      metadata: {
        taskType,
        executionTime: new Date().toISOString()
      }
    });
    const updatedScore = result as unknown as { overall_score: number };
    
    console.log(`Task ${success ? 'succeeded' : 'failed'} in ${latency}ms`);
    console.log(`Updated score: ${updatedScore.overall_score}`);
    
    return success;
  } catch (error) {
    console.error('Error executing task:', error);
    
    // Record failure
    personaManager.recordPersonaUsage(personaId, {
      success: false,
      metadata: {
        taskType,
        executionTime: new Date().toISOString()
      },
      latency: 0,
      adaptabilityFactor: 0
    });
    
    return false;
  } finally {
    // End the trace
    traceObj.end();
  }
}
/**
 * Example function to demonstrate recording user feedback
 */
async function recordFeedbackForPersona(personaId: string, rating: number, feedback?: string) {
  console.log(`Recording feedback for persona ${personaId}: ${rating}/1`);
  
  const updatedScore = personaManager.recordUserFeedback(
    personaId,
    rating,
    feedback
  ) as unknown as { user_satisfaction: number; overall_score: number };
  
  console.log(`Updated user satisfaction: ${updatedScore.user_satisfaction}`);
  console.log(`Updated overall score: ${updatedScore.overall_score}`);
  
  return updatedScore;
}
/**
 * Example function to demonstrate getting top performing personas
 */
async function getTopPerformingPersonas() {
  console.log('Getting top performing personas:');
  
  const topPersonas = personaManager.getTopPerformingPersonas(3);
  
  if (Array.isArray(topPersonas)) {
    topPersonas.forEach((item, index) => {
      console.log(`${index + 1}. ${item.persona.name} (Score: ${item.score.overall_score})`);
      console.log(`   Usage: ${item.score.usage_count}, Success Rate: ${item.score.success_rate}`);
    });
  }
  
  return topPersonas;
}
/**
 * Example function to demonstrate getting most used personas
 */
async function getMostUsedPersonas() {
  console.log('Getting most used personas:');
  
  const mostUsedPersonas = personaManager.getMostUsedPersonas(3);
  
  if (Array.isArray(mostUsedPersonas)) {
    mostUsedPersonas.forEach((item, index) => {
      console.log(`${index + 1}. ${item.persona.name} (Usage: ${item.score.usage_count})`);
      console.log(`   Score: ${item.score.overall_score}, Success Rate: ${item.score.success_rate}`);
    });
  }
  
  return mostUsedPersonas;
}
/**
 * Run the example
 */
async function runExample() {
  try {
    // Initialize persona manager
    await personaManager.init();
    
    // List available personas
    const personas = await personaManager.listPersonas();
    console.log(`Available personas: ${personas.length}`);
    
    if (personas.length === 0) {
      console.log('No personas available. Please create some personas first.');
      return;
    }
    
    // Select a persona for a task
    const selectedPersona = await personaManager.getPersonaRecommendation({
      taskType: 'code-generation',
      requiredCapabilities: [GeminiCapability.CODE_GENERATION, GeminiCapability.TEXT_GENERATION]
    });

    if (!selectedPersona) {
      console.log('Could not select a persona. Exiting example.');
      return;
    }

    console.log(`Selected persona: ${selectedPersona.persona.name}`);
    
    // Use the persona for a task
    const success = await usePersonaForTask(selectedPersona.persona.id, 'code-generation');
    
    // Record user feedback
    if (success) {
      await recordFeedbackForPersona(selectedPersona.persona.id, 0.9, 'Great job!');
    } else {
      await recordFeedbackForPersona(selectedPersona.persona.id, 0.3, 'Could be better');
    }
    
    // Get top performing personas
    await getTopPerformingPersonas();
    // Get most used personas
    await getMostUsedPersonas();
    
    console.log('Example completed successfully');
  } catch (error) {
    console.error('Error running example:', error);
  }
}
// Export functions for use in other examples
export {
  usePersonaForTask,
  recordFeedbackForPersona,
  getTopPerformingPersonas,
  getMostUsedPersonas,
  runExample
};

// Run the example if this file is executed directly
if (require.main === module) {
  runExample().catch(console.error);
}

