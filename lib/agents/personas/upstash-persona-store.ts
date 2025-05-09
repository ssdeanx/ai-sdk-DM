import { getRedisClient } from '../../memory/upstash/upstashClients';
import { v4 as uuidv4 } from 'uuid';
import { PersonaDefinition, MicroPersonaDefinition, PersonaScore } from './persona-library';

// --- Constants for Redis Keys ---
const PERSONA_PREFIX = "persona:";
const MICRO_PERSONA_PREFIX = "micro_persona:";
const PERSONA_INDEX = "personas"; // Sorted set for all personas, scored by last update timestamp
const MICRO_PERSONA_INDEX = "micro_personas"; // Sorted set for all micro-personas, scored by last update timestamp
const PERSONA_BY_TAG_PREFIX = "persona:tag:"; // Set of persona IDs for each tag
const PERSONA_BY_CAPABILITY_PREFIX = "persona:capability:"; // Set of persona IDs for each capability
const PARENT_MICRO_PERSONAS_PREFIX = "persona:"; // Prefix for parent-specific micro-personas
const PARENT_MICRO_PERSONAS_SUFFIX = ":micro_personas"; // Suffix for parent-specific micro-personas
const PERSONA_SCORE_PREFIX = "persona:score:"; // Prefix for persona scores

// --- Error Handling ---
export class PersonaStoreError extends Error {
  constructor(message: string, public cause?: any) {
    super(message);
    this.name = "PersonaStoreError";
    Object.setPrototypeOf(this, PersonaStoreError.prototype);
  }
}

/**
 * Saves a persona to Redis
 * @param persona The persona to save
 * @returns A promise that resolves when the persona is saved
 * @throws PersonaStoreError if saving fails
 */
export async function savePersona(persona: PersonaDefinition): Promise<void> {
  const redis = getRedisClient();
  const personaKey = `${PERSONA_PREFIX}${persona.id}`;
  const now = Date.now();
  
  try {
    // Update lastUpdatedAt
    const updatedPersona = {
      ...persona,
      lastUpdatedAt: new Date().toISOString()
    };
    
    // Serialize persona
    const personaJson = JSON.stringify(updatedPersona);
    
    // Use pipeline for atomic operations
    const pipeline = redis.pipeline();
    
    // Save persona
    pipeline.set(personaKey, personaJson);
    
    // Update global index with timestamp
    pipeline.zadd(PERSONA_INDEX, { score: now, member: persona.id });
    
    // Update tag indices
    if (persona.tags && persona.tags.length > 0) {
      // First, get existing tags for this persona (if any)
      const existingPersona = await redis.get(personaKey);
      let existingTags: string[] = [];
      
      if (existingPersona) {
        try {
          const parsed = JSON.parse(existingPersona as string) as PersonaDefinition;
          existingTags = parsed.tags || [];
        } catch (e) {
          console.warn(`Error parsing existing persona ${persona.id}:`, e);
        }
      }
      
      // Remove persona from tag sets it no longer belongs to
      for (const tag of existingTags) {
        if (!persona.tags.includes(tag)) {
          pipeline.srem(`${PERSONA_BY_TAG_PREFIX}${tag}`, persona.id);
        }
      }
      
      // Add persona to tag sets
      for (const tag of persona.tags) {
        pipeline.sadd(`${PERSONA_BY_TAG_PREFIX}${tag}`, persona.id);
      }
    }
    
    // Update capability indices
    if (persona.capabilities && persona.capabilities.length > 0) {
      // First, get existing capabilities for this persona (if any)
      const existingPersona = await redis.get(personaKey);
      let existingCapabilities: string[] = [];
      
      if (existingPersona) {
        try {
          const parsed = JSON.parse(existingPersona as string) as PersonaDefinition;
          existingCapabilities = parsed.capabilities || [];
        } catch (e) {
          console.warn(`Error parsing existing persona ${persona.id}:`, e);
        }
      }
      
      // Remove persona from capability sets it no longer belongs to
      for (const capability of existingCapabilities) {
        if (!persona.capabilities.includes(capability)) {
          pipeline.srem(`${PERSONA_BY_CAPABILITY_PREFIX}${capability}`, persona.id);
        }
      }
      
      // Add persona to capability sets
      for (const capability of persona.capabilities) {
        pipeline.sadd(`${PERSONA_BY_CAPABILITY_PREFIX}${capability}`, persona.id);
      }
    }
    
    // Execute pipeline
    await pipeline.exec();
  } catch (error) {
    console.error(`Error saving persona ${persona.id}:`, error);
    throw new PersonaStoreError(`Failed to save persona ${persona.id}`, error);
  }
}

/**
 * Loads a persona from Redis
 * @param personaId The persona ID
 * @returns A promise that resolves with the persona, or null if not found
 * @throws PersonaStoreError if loading fails
 */
export async function loadPersona(personaId: string): Promise<PersonaDefinition | null> {
  const redis = getRedisClient();
  const personaKey = `${PERSONA_PREFIX}${personaId}`;
  
  try {
    const personaJson = await redis.get(personaKey);
    
    if (!personaJson) {
      return null;
    }
    
    // Parse persona
    const persona = JSON.parse(personaJson as string) as PersonaDefinition;
    
    // Update access timestamp
    redis.zadd(PERSONA_INDEX, { score: Date.now(), member: personaId });
    
    return persona;
  } catch (error) {
    console.error(`Error loading persona ${personaId}:`, error);
    throw new PersonaStoreError(`Failed to load persona ${personaId}`, error);
  }
}

/**
 * Saves a micro-persona to Redis
 * @param microPersona The micro-persona to save
 * @returns A promise that resolves when the micro-persona is saved
 * @throws PersonaStoreError if saving fails
 */
export async function saveMicroPersona(microPersona: MicroPersonaDefinition): Promise<void> {
  const redis = getRedisClient();
  const microPersonaKey = `${MICRO_PERSONA_PREFIX}${microPersona.id}`;
  const parentMicroPersonasKey = `${PARENT_MICRO_PERSONAS_PREFIX}${microPersona.parentPersonaId}${PARENT_MICRO_PERSONAS_SUFFIX}`;
  const now = Date.now();
  
  try {
    // Update lastUpdatedAt
    const updatedMicroPersona = {
      ...microPersona,
      lastUpdatedAt: new Date().toISOString()
    };
    
    // Serialize micro-persona
    const microPersonaJson = JSON.stringify(updatedMicroPersona);
    
    // Use pipeline for atomic operations
    const pipeline = redis.pipeline();
    
    // Save micro-persona
    pipeline.set(microPersonaKey, microPersonaJson);
    
    // Update global index with timestamp
    pipeline.zadd(MICRO_PERSONA_INDEX, { score: now, member: microPersona.id });
    
    // Add to parent's micro-personas set
    pipeline.sadd(parentMicroPersonasKey, microPersona.id);
    
    // Execute pipeline
    await pipeline.exec();
  } catch (error) {
    console.error(`Error saving micro-persona ${microPersona.id}:`, error);
    throw new PersonaStoreError(`Failed to save micro-persona ${microPersona.id}`, error);
  }
}

/**
 * Loads a micro-persona from Redis
 * @param microPersonaId The micro-persona ID
 * @returns A promise that resolves with the micro-persona, or null if not found
 * @throws PersonaStoreError if loading fails
 */
export async function loadMicroPersona(microPersonaId: string): Promise<MicroPersonaDefinition | null> {
  const redis = getRedisClient();
  const microPersonaKey = `${MICRO_PERSONA_PREFIX}${microPersonaId}`;
  
  try {
    const microPersonaJson = await redis.get(microPersonaKey);
    
    if (!microPersonaJson) {
      return null;
    }
    
    // Parse micro-persona
    const microPersona = JSON.parse(microPersonaJson as string) as MicroPersonaDefinition;
    
    // Update access timestamp
    redis.zadd(MICRO_PERSONA_INDEX, { score: Date.now(), member: microPersonaId });
    
    return microPersona;
  } catch (error) {
    console.error(`Error loading micro-persona ${microPersonaId}:`, error);
    throw new PersonaStoreError(`Failed to load micro-persona ${microPersonaId}`, error);
  }
}
