/**
 * Example usage of the persona library with Google AI models
 * 
 * This file demonstrates how to use the persona library to create and use
 * personas with Google's Gemini models for different tasks.
 */

import { streamText, generateText } from 'ai';
import { personaManager } from '../persona-manager';
import { personaScoreManager } from '../persona-score-manager';
import baseLibrary, { PersonaDefinition } from '../persona-library';
import extendedLibrary from '../persona-library-extended';
import { initializePersonaLibrary, createTaskProvider, getPersonaByTaskType } from '../persona-library-utils';
import { trace } from '../../../tracing';

/**
 * Initialize the persona library and register personas
 */
async function initializeLibrary() {
  console.log('Initializing persona library...');
  
  const result = await initializePersonaLibrary({
    registerBase: true,
    registerSpecialized: true,
    registerDomain: true,
    registerTask: true,
    forceUpdate: false
  });
  
  console.log('Persona library initialized with:');
  console.log(`- ${Object.keys(result.base || {}).length} base personas`);
  console.log(`- ${Object.keys(result.specialized || {}).length} specialized personas`);
  console.log(`- ${Object.keys(result.domain || {}).length} domain personas`);
  console.log(`- ${Object.keys(result.task || {}).length} task personas`);
  
  return result;
}

/**
 * List all available personas
 */
async function listAllPersonas() {
  console.log('Listing all available personas:');
  
  const personas = await personaManager.listPersonas();
  
  personas.forEach((persona, index) => {
    console.log(`${index + 1}. ${persona.name} (${persona.id})`);
    console.log(`   Description: ${persona.description}`);
    console.log(`   Model: ${persona.modelSettings?.modelId || 'Default'}`);
    console.log('');
  });
  
  return personas;
}

/**
 * Get top performing personas based on scores
 */
async function getTopPerformingPersonas() {
  console.log('Getting top performing personas:');
  
  const topPersonas = await personaManager.getTopPerformingPersonas(5);
  
  if (topPersonas.length === 0) {
    console.log('No scored personas found. Try using some personas first to generate scores.');
    return [];
  }
  
  topPersonas.forEach((item, index) => {
    console.log(`${index + 1}. ${item.persona.name} (Score: ${item.score.overall_score})`);
    console.log(`   Usage: ${item.score.usage_count}, Success Rate: ${item.score.success_rate}`);
  });
  
  return topPersonas;
}

/**
 * Example of using a persona for a specific task
 */
async function usePersonaForTask(taskType: string, prompt: string) {
  console.log(`Using persona for task type: ${taskType}`);
  
  // Create a trace for this operation
  const traceObj = await trace({
    name: `persona_task_${taskType}`,
    userId: 'example-user',
    metadata: {
      taskType
    }
  });
  
  try {
    // Get a persona for the task
    const persona = await getPersonaByTaskType(taskType);
    
    if (!persona) {
      console.log('No suitable persona found for this task type');
      return null;
    }
    
    console.log(`Selected persona: ${persona.name}`);
    console.log(`Description: ${persona.description}`);
    
    // Start timing
    const startTime = Date.now();
    
    // Create a provider for the task
    const provider = await createTaskProvider(taskType, {
      additionalContext: `You are helping with the following task type: ${taskType}.`
    });
    
    // Generate text with the persona
    const result = await generateText({
      model: provider[persona.name],
      prompt,
    });
    
    // End timing
    const endTime = Date.now();
    const latency = endTime - startTime;
    
    console.log('Generated text:');
    console.log(result);
    
    // Record usage with metrics
    await personaManager.recordPersonaUsage(persona.id, {
      success: true,
      latency,
      adaptabilityFactor: 0.8,
      metadata: {
        taskType,
        promptLength: prompt.length,
        responseLength: result.length,
        executionTime: new Date().toISOString()
      }
    });
    
    console.log(`Task completed in ${latency}ms`);
    
    return {
      persona,
      result,
      latency
    };
  } catch (error) {
    console.error('Error using persona for task:', error);
    
    // If we have a persona, record failure
    const persona = await getPersonaByTaskType(taskType);
    if (persona) {
      await personaManager.recordPersonaUsage(persona.id, {
        success: false,
        metadata: {
          taskType,
          error: error.message
        }
      });
    }
    
    return null;
  } finally {
    // End the trace
    traceObj.end();
  }
}

/**
 * Example of streaming text with a persona
 */
async function streamWithPersona(personaName: string, prompt: string) {
  console.log(`Streaming with persona: ${personaName}`);
  
  // Get all personas
  const personas = await personaManager.listPersonas();
  const persona = personas.find(p => p.name === personaName);
  
  if (!persona) {
    console.log(`Persona "${personaName}" not found`);
    return null;
  }
  
  try {
    // Start timing
    const startTime = Date.now();
    
    // Create a provider for the persona
    const provider = baseLibrary.createPersonaProvider({
      name: persona.name,
      description: persona.description,
      systemPromptTemplate: persona.systemPromptTemplate,
      modelSettings: persona.modelSettings
    });
    
    // Stream text with the persona
    const result = await streamText({
      model: provider[persona.name],
      prompt,
    });
    
    // For this example, we'll just collect the streamed text
    let fullText = '';
    for await (const chunk of result.stream) {
      fullText += chunk;
      process.stdout.write(chunk); // Print chunks as they arrive
    }
    
    // End timing
    const endTime = Date.now();
    const latency = endTime - startTime;
    
    console.log('\n');
    
    // Record usage with metrics
    await personaManager.recordPersonaUsage(persona.id, {
      success: true,
      latency,
      adaptabilityFactor: 0.8,
      metadata: {
        promptLength: prompt.length,
        responseLength: fullText.length,
        executionTime: new Date().toISOString()
      }
    });
    
    console.log(`Streaming completed in ${latency}ms`);
    
    return {
      persona,
      result: fullText,
      latency
    };
  } catch (error) {
    console.error('Error streaming with persona:', error);
    
    // Record failure
    await personaManager.recordPersonaUsage(persona.id, {
      success: false,
      metadata: {
        error: error.message
      }
    });
    
    return null;
  }
}

/**
 * Record user feedback for a persona
 */
async function recordFeedbackForPersona(personaName: string, rating: number, feedback?: string) {
  console.log(`Recording feedback for persona ${personaName}: ${rating}/1`);
  
  // Get all personas
  const personas = await personaManager.listPersonas();
  const persona = personas.find(p => p.name === personaName);
  
  if (!persona) {
    console.log(`Persona "${personaName}" not found`);
    return null;
  }
  
  const updatedScore = await personaManager.recordUserFeedback(
    persona.id,
    rating,
    feedback
  );
  
  console.log(`Updated user satisfaction: ${updatedScore.user_satisfaction}`);
  console.log(`Updated overall score: ${updatedScore.overall_score}`);
  
  return updatedScore;
}

/**
 * Run the example
 */
async function runExample() {
  try {
    // Initialize the library
    await initializeLibrary();
    
    // List all personas
    await listAllPersonas();
    
    // Use a persona for a coding task
    const codingResult = await usePersonaForTask(
      'code-generation',
      'Write a TypeScript function that sorts an array of objects by a specified property'
    );
    
    // Use a persona for a creative writing task
    const writingResult = await usePersonaForTask(
      'creative-writing',
      'Write a short story about a robot that discovers it has emotions'
    );
    
    // Stream with a specific persona
    const streamingResult = await streamWithPersona(
      'Technical Documentation Writer',
      'Explain how to use the Fetch API in JavaScript with examples'
    );
    
    // Record feedback
    if (codingResult) {
      await recordFeedbackForPersona(codingResult.persona.name, 0.9, 'Excellent code explanation!');
    }
    
    if (writingResult) {
      await recordFeedbackForPersona(writingResult.persona.name, 0.8, 'Creative and engaging story');
    }
    
    // Get top performing personas
    await getTopPerformingPersonas();
    
    console.log('Example completed successfully');
  } catch (error) {
    console.error('Error running example:', error);
  }
}

// Export functions for use in other examples
export {
  initializeLibrary,
  listAllPersonas,
  getTopPerformingPersonas,
  usePersonaForTask,
  streamWithPersona,
  recordFeedbackForPersona,
  runExample
};

// Run the example if this file is executed directly
if (require.main === module) {
  runExample().catch(console.error);
}
