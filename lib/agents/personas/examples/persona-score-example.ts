/**
 * Example usage of the persona scoring system
 * 
 * This file demonstrates how to use the persona scoring system to track
 * and adapt persona performance based on usage metrics.
 */

import { personaManager } from '../persona-manager';
import { personaScoreManager } from '../persona-score-manager';
import { trace, span } from '../../../tracing';

/**
 * Example function to demonstrate persona selection with scoring
 */
async function selectPersonaForTask(taskType: string, requiredCapabilities: string[] = []) {
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
    const updatedScore = await personaManager.recordPersonaUsage(personaId, {
      success,
      latency,
      adaptabilityFactor: 0.8, // Example adaptability factor
      metadata: {
        taskType,
        executionTime: new Date().toISOString()
      }
    });
    
    console.log(`Task ${success ? 'succeeded' : 'failed'} in ${latency}ms`);
    console.log(`Updated score: ${updatedScore.overall_score}`);
    
    return success;
  } catch (error) {
    console.error('Error executing task:', error);
    
    // Record failure
    await personaManager.recordPersonaUsage(personaId, {
      success: false,
      metadata: {
        taskType,
        error: error instanceof Error ? error.message : String(error)
      }
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
  
  const updatedScore = await personaManager.recordUserFeedback(
    personaId,
    rating,
    feedback
  );
  
  console.log(`Updated user satisfaction: ${updatedScore.user_satisfaction}`);
  console.log(`Updated overall score: ${updatedScore.overall_score}`);
  
  return updatedScore;
}

/**
 * Example function to demonstrate getting top performing personas
 */
async function getTopPerformingPersonas() {
  console.log('Getting top performing personas:');
  
  const topPersonas = await personaManager.getTopPerformingPersonas(3);
  
  topPersonas.forEach((item, index) => {
    console.log(`${index + 1}. ${item.persona.name} (Score: ${item.score.overall_score})`);
    console.log(`   Usage: ${item.score.usage_count}, Success Rate: ${item.score.success_rate}`);
  });
  
  return topPersonas;
}

/**
 * Example function to demonstrate getting most used personas
 */
async function getMostUsedPersonas() {
  console.log('Getting most used personas:');
  
  const mostUsedPersonas = await personaManager.getMostUsedPersonas(3);
  
  mostUsedPersonas.forEach((item, index) => {
    console.log(`${index + 1}. ${item.persona.name} (Usage: ${item.score.usage_count})`);
    console.log(`   Score: ${item.score.overall_score}, Success Rate: ${item.score.success_rate}`);
  });
  
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
    const selectedPersona = await selectPersonaForTask('code-generation', ['python', 'typescript']);
    
    if (!selectedPersona) {
      console.log('Could not select a persona. Exiting example.');
      return;
    }
    
    // Use the persona for a task
    const success = await usePersonaForTask(selectedPersona.id, 'code-generation');
    
    // Record user feedback
    if (success) {
      await recordFeedbackForPersona(selectedPersona.id, 0.9, 'Great job!');
    } else {
      await recordFeedbackForPersona(selectedPersona.id, 0.3, 'Could be better');
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
  selectPersonaForTask,
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
