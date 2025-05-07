/**
 * Persona Library Utilities
 * 
 * This module provides utility functions for working with the persona library,
 * including initialization, management, and integration with Google's models.
 */

import { personaManager } from './persona-manager';
import { personaScoreManager } from './persona-score-manager';
import baseLibrary, { PersonaDefinition } from './persona-library';
import extendedLibrary from './persona-library-extended';
import { getGoogleAI, GOOGLE_MODEL_CONFIGS } from '../../google-ai';
import { customProvider } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { AgentPersona } from '../agent.types';

/**
 * Initialize the persona library
 * 
 * @param options - Initialization options
 * @returns Promise resolving to the registered persona IDs
 */
export async function initializePersonaLibrary(options: {
  registerBase?: boolean;
  registerSpecialized?: boolean;
  registerDomain?: boolean;
  registerTask?: boolean;
  forceUpdate?: boolean;
} = {}): Promise<{
  base?: Record<string, string>;
  specialized?: Record<string, string>;
  domain?: Record<string, string>;
  task?: Record<string, string>;
}> {
  const {
    registerBase = true,
    registerSpecialized = true,
    registerDomain = true,
    registerTask = true,
    forceUpdate = false
  } = options;

  // Initialize persona manager
  await personaManager.init();
  
  // Initialize persona score manager
  await personaScoreManager.init();
  
  const result: {
    base?: Record<string, string>;
    specialized?: Record<string, string>;
    domain?: Record<string, string>;
    task?: Record<string, string>;
  } = {};
  
  // Register base personas if requested
  if (registerBase) {
    if (forceUpdate) {
      // Update existing personas or create new ones
      result.base = await updateOrCreatePersonas(baseLibrary.basePersonas);
    } else {
      // Just register new personas
      result.base = await baseLibrary.registerBasePersonas();
    }
  }
  
  // Register specialized personas if requested
  if (registerSpecialized) {
    if (forceUpdate) {
      // Update existing personas or create new ones
      result.specialized = await updateOrCreatePersonas(baseLibrary.specializedPersonas);
    } else {
      // Just register new personas
      result.specialized = await baseLibrary.registerSpecializedPersonas();
    }
  }
  
  // Register domain personas if requested
  if (registerDomain) {
    if (forceUpdate) {
      // Update existing personas or create new ones
      result.domain = await updateOrCreatePersonas(extendedLibrary.domainPersonas);
    } else {
      // Just register new personas
      result.domain = await extendedLibrary.registerDomainPersonas();
    }
  }
  
  // Register task personas if requested
  if (registerTask) {
    if (forceUpdate) {
      // Update existing personas or create new ones
      result.task = await updateOrCreatePersonas(extendedLibrary.taskPersonas);
    } else {
      // Just register new personas
      result.task = await extendedLibrary.registerTaskPersonas();
    }
  }
  
  return result;
}

/**
 * Update existing personas or create new ones
 * 
 * @param personas - Record of persona definitions
 * @returns Promise resolving to an object mapping persona names to their IDs
 */
async function updateOrCreatePersonas(personas: Record<string, PersonaDefinition>): Promise<Record<string, string>> {
  const personaIds: Record<string, string> = {};
  const existingPersonas = await personaManager.listPersonas();
  
  for (const [key, persona] of Object.entries(personas)) {
    try {
      // Check if persona already exists by name
      const existingPersona = existingPersonas.find(p => p.name === persona.name);
      
      if (existingPersona) {
        // Update existing persona
        await personaManager.updatePersona(existingPersona.id, {
          name: persona.name,
          description: persona.description,
          systemPromptTemplate: persona.systemPromptTemplate,
          modelSettings: persona.modelSettings
        });
        
        personaIds[key] = existingPersona.id;
        console.log(`Updated persona: ${persona.name} with ID: ${existingPersona.id}`);
      } else {
        // Create new persona
        const id = await personaManager.createPersona({
          name: persona.name,
          description: persona.description,
          systemPromptTemplate: persona.systemPromptTemplate,
          modelSettings: persona.modelSettings
        });
        
        personaIds[key] = id;
        console.log(`Created persona: ${persona.name} with ID: ${id}`);
      }
    } catch (error) {
      console.error(`Error updating/creating persona ${key}:`, error);
    }
  }
  
  return personaIds;
}

/**
 * Get all available personas from the library
 * 
 * @returns Record of all persona definitions
 */
export function getAllPersonaDefinitions(): Record<string, PersonaDefinition> {
  return {
    ...baseLibrary.basePersonas,
    ...baseLibrary.specializedPersonas,
    ...extendedLibrary.domainPersonas,
    ...extendedLibrary.taskPersonas
  };
}

/**
 * Create a custom provider for a specific task
 * 
 * @param taskType - Type of task
 * @param options - Additional options
 * @returns Custom provider for the task
 */
export async function createTaskProvider(
  taskType: string,
  options: {
    temperature?: number;
    topP?: number;
    maxOutputTokens?: number;
    additionalContext?: string;
  } = {}
): Promise<any> {
  // Get a recommendation based on task type
  const recommendation = await personaManager.getPersonaRecommendation({
    taskType,
    requiredCapabilities: []
  });
  
  if (!recommendation) {
    // Fall back to general assistant if no recommendation
    const googleAI = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_API_KEY,
    });
    
    return googleAI('models/gemini-1.5-pro', {
      temperature: options.temperature || 0.7,
      topP: options.topP || 0.95,
      maxOutputTokens: options.maxOutputTokens || 8192,
    });
  }
  
  // Get the persona
  const persona = recommendation.persona;
  
  // Create a custom provider with the recommended persona
  const googleAI = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_API_KEY,
  });
  
  // Generate system prompt with additional context if provided
  let systemPrompt = persona.systemPromptTemplate;
  if (options.additionalContext) {
    systemPrompt = systemPrompt.replace('{{additionalContext}}', options.additionalContext);
  } else {
    systemPrompt = systemPrompt.replace('{{additionalContext}}', '');
  }
  
  // Create custom provider
  return customProvider({
    languageModels: {
      [persona.name]: googleAI(persona.modelSettings?.modelId || 'models/gemini-1.5-pro', {
        temperature: options.temperature || persona.modelSettings?.temperature || 0.7,
        topP: options.topP || persona.modelSettings?.topP || 0.95,
        maxOutputTokens: options.maxOutputTokens || persona.modelSettings?.maxOutputTokens || 8192,
        system: systemPrompt,
      }),
    },
    fallbackProvider: googleAI,
  });
}

/**
 * Get a persona by task type
 * 
 * @param taskType - Type of task
 * @returns Promise resolving to the recommended persona or undefined if not found
 */
export async function getPersonaByTaskType(taskType: string): Promise<AgentPersona | undefined> {
  // Get a recommendation based on task type
  const recommendation = await personaManager.getPersonaRecommendation({
    taskType,
    requiredCapabilities: []
  });
  
  return recommendation?.persona;
}

/**
 * Export persona library to JSON files
 * 
 * @param outputDir - Output directory
 * @returns Promise resolving to an array of saved file paths
 */
export async function exportPersonaLibraryToFiles(outputDir?: string): Promise<string[]> {
  const savedFiles: string[] = [];
  const allPersonas = await personaManager.listPersonas();
  
  for (const persona of allPersonas) {
    try {
      const filePath = await personaManager.savePersonaToFile(
        persona.id,
        undefined, // Use default format (JSON)
        outputDir ? `${outputDir}/${persona.name.toLowerCase().replace(/\s+/g, '-')}.json` : undefined
      );
      
      savedFiles.push(filePath);
    } catch (error) {
      console.error(`Error exporting persona ${persona.name}:`, error);
    }
  }
  
  return savedFiles;
}

// Export all utilities
export default {
  initializePersonaLibrary,
  getAllPersonaDefinitions,
  createTaskProvider,
  getPersonaByTaskType,
  exportPersonaLibraryToFiles
};
