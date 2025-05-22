import * as fsExtra from 'fs-extra';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { v4 as uuidv4 } from 'uuid';
import {
  PersonaDefinition,
  MicroPersonaDefinition,
  validatePersonaDefinition,
  validateMicroPersonaDefinition,
  basePersonas,
  specializedPersonas,
  PersonaScore,
  GeminiCapability,
  composePersona,
} from './persona-library';
import { personaScoreManager } from './persona-score-manager'; // May need to adjust its usage later for scores
import { AgentPersona as SupabaseAgentPersona, NewAgentPersona, NewPersonaScore, PersonaScore as SupabasePersonaScore } from '../../memory/supabase'; // Supabase types
import * as supabase from '../../memory/supabase'; // Supabase data access functions
import { AgentPersona } from '../agent.types';
import { domainPersonas, taskPersonas } from './persona-library-extended';
// import * as UpstashPersonaStore from './upstash-persona-store'; // To be removed
// import * as UpstashPersonaScore from './upstash-persona-score'; // To be removed
// import { PersonaStreamingService } from './persona-streaming-service'; // To be removed
// import { getMemoryProvider } from '../../memory/factory'; // To be removed
// import { getRedisClient } from '../../memory/upstash/upstashClients'; // To be removed

/**
 * File formats supported for persona loading
 */
export enum PersonaFileFormat {
  JSON = 'json',
  YAML = 'yaml',
  YML = 'yml',
}

/**
 * Persona Manager for dynamic persona management
 */
/**
 * Persona Manager for dynamic persona management
 *
 * This class provides methods for managing personas and micro-personas,
 * with support for both file-based storage and Upstash Redis storage.
 */
export class PersonaManager {
  private personas: Map<string, PersonaDefinition> = new Map();
  private microPersonas: Map<string, MicroPersonaDefinition> = new Map();
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;
  public readonly personasDirectory: string;
  // private streamingService: PersonaStreamingService; // To be removed
  // private useUpstash: boolean; // To be removed

  /**
   * Records usage of a persona with performance metrics
   *
   * @param personaId - The ID of the persona
   * @param data - Usage data including success, latency, and other metrics
   * @returns Promise that resolves when the usage is recorded
   */
  public async recordPersonaUsage(
    personaId: string,
    data: {
      success: boolean;
      latency: number;
      adaptabilityFactor: number;
      metadata: {
        taskType: string;
        executionTime: string;
      };
    }
  ): Promise<void> {
    await this.ensureInitialized();
    try {
      let score = await supabase.getPersonaScoreByPersonaId(personaId);
      const now = new Date().toISOString();

      if (!score) {
        // Initialize new score
        const newScoreData: NewPersonaScore = {
          persona_id: personaId,
          usage_count: 1,
          success_rate: data.success ? '1.0' : '0.0', // Ensure string for numeric type
          average_latency_ms: data.latency.toString(),
          user_satisfaction: '0.5', // Default initial satisfaction
          adaptability_score: data.adaptabilityFactor.toString(),
          overall_score: '0.5', // Default initial overall score
          last_used_at: now,
          metadata: { taskType: data.metadata.taskType, lastTaskSuccess: data.success },
          // created_at and updated_at will be set by DB
        };
        // Calculate initial overall score (simple example)
        newScoreData.overall_score = this.calculateOverallScore(newScoreData).toString();
        await supabase.createPersonaScore(newScoreData);
      } else {
        // Update existing score
        const previousOverallScore = parseFloat(score.overall_score || '0.5');
        const updatedUsageCount = (score.usage_count || 0) + 1;
        
        const updatedSuccessRate = (((parseFloat(score.success_rate || '0') * (updatedUsageCount -1)) + (data.success ? 1:0)) / updatedUsageCount).toFixed(4);
        const updatedLatency = (((parseFloat(score.average_latency_ms || '0') * (updatedUsageCount - 1)) + data.latency) / updatedUsageCount).toFixed(2);
        const updatedAdaptability = (((parseFloat(score.adaptability_score || '0') * (updatedUsageCount - 1)) + data.adaptabilityFactor) / updatedUsageCount).toFixed(2);

        const updatePayload: Partial<SupabasePersonaScore> = {
          usage_count: updatedUsageCount,
          success_rate: updatedSuccessRate,
          average_latency_ms: updatedLatency,
          adaptability_score: updatedAdaptability,
          last_used_at: now,
          metadata: { ...score.metadata, taskType: data.metadata.taskType, lastTaskSuccess: data.success, previousOverallScore },
        };
        updatePayload.overall_score = this.calculateOverallScore(score, updatePayload).toString();
        await supabase.updatePersonaScoreByPersonaId(personaId, updatePayload);
      }
    } catch (error) {
      console.error(`Error recording persona usage for ${personaId} in Supabase:`, error);
      // Removed fallback to personaScoreManager. Errors from Supabase should propagate.
      // if (personaScoreManager && typeof personaScoreManager.recordPersonaUsage === 'function') {
      //   console.warn(`Falling back to personaScoreManager for recordPersonaUsage for ${personaId}`);
      //   await personaScoreManager.recordPersonaUsage(personaId, data);
      // } else {
      //   console.warn(
      //     'PersonaScoreManager does not have recordPersonaUsage method'
      //   );
      // }
      throw error; // Re-throw the error
    }
  }
  /**   * Records user feedback for a persona
   *
   * @param personaId - The ID of the persona
   * @param rating - User rating (0-1)
   * @param feedback - Optional feedback text
   * @returns Promise that resolves when the feedback is recorded
   */ public async recordUserFeedback(
    personaId: string,
    rating: number,
    feedback?: string
  ): Promise<void> {
    await this.ensureInitialized();
    try {
      let score = await supabase.getPersonaScoreByPersonaId(personaId);
      const now = new Date().toISOString();

      if (!score) {
        // Initialize new score if it doesn't exist
        const newScoreData: NewPersonaScore = {
          persona_id: personaId,
          usage_count: 1, // First feedback implies first use for score purposes
          user_satisfaction: rating.toString(),
          overall_score: '0.5', // Default initial overall score
          last_used_at: now,
          metadata: { lastFeedbackRating: rating, feedbackReceived: !!feedback },
           // Default values for other fields
          success_rate: '0.5', 
          average_latency_ms: '0',
          adaptability_score: '0.5',
        };
        newScoreData.overall_score = this.calculateOverallScore(newScoreData).toString();
        await supabase.createPersonaScore(newScoreData);
      } else {
        // Update existing score's user satisfaction
        const usageCount = score.usage_count || 0; // Should be at least 1 if feedback is given after usage
        const currentUserSatisfaction = parseFloat(score.user_satisfaction || '0.5');
        // Weighted average for user satisfaction
        const updatedUserSatisfaction = usageCount > 0 ? 
            ((currentUserSatisfaction * (usageCount -1) + rating) / usageCount).toFixed(2) : rating.toString();

        const updatePayload: Partial<SupabasePersonaScore> = {
          user_satisfaction: updatedUserSatisfaction,
          last_used_at: now, // Assuming feedback implies usage
          metadata: { ...score.metadata, lastFeedbackRating: rating, feedbackReceived: !!feedback },
        };
        if (usageCount === 0) updatePayload.usage_count = 1; // If first interaction

        updatePayload.overall_score = this.calculateOverallScore(score, updatePayload).toString();
        await supabase.updatePersonaScoreByPersonaId(personaId, updatePayload);
      }

      // Note: Storing the raw feedback string still needs a separate strategy (e.g., new table `persona_feedback_entries`)
      if (feedback) {
        console.warn(`Feedback string received for ${personaId}: "${feedback}". Storage for this is not yet implemented in Supabase.`);
        // Example: await supabase.createPersonaFeedbackEntry({ persona_id: personaId, rating, feedback_text: feedback });
      }

    } catch (error) {
      console.error(`Error recording user feedback for ${personaId} in Supabase:`, error);
      // Removed fallback to personaScoreManager. Errors from Supabase should propagate.
      // if (personaScoreManager && typeof personaScoreManager.recordUserFeedback === 'function') {
      //   console.warn(`Falling back to personaScoreManager for recordUserFeedback for ${personaId}`);
        await personaScoreManager.recordUserFeedback(
          personaId,
          rating,
          feedback
        );
      } else if (typeof personaScoreManager.recordFeedback === 'function') {
        await personaScoreManager.recordFeedback(personaId, rating, feedback);
      } else {
        console.warn(
          'PersonaScoreManager does not have recordFeedback or recordUserFeedback method'
        );
      }
    }
  }

  /**
   * Gets the top performing personas based on overall score
   *
   * @param limit - Maximum number of personas to return
   * @returns Promise resolving to an array of top personas with scores
   */
  public async getTopPerformingPersonas(
    limit: number = 10
  ): Promise<Array<{ persona: PersonaDefinition; score: SupabasePersonaScore }>> {
    await this.ensureInitialized();
    try {
      const scores = await supabase.queryPersonaScores({
        limit,
        orderBy: 'overall_score',
        // `where` clause might need specific syntax for 'IS NOT NULL' depending on supabase.ts implementation
        // For now, assuming it handles it or we filter post-fetch if necessary.
        // where: { overall_score: 'IS NOT NULL' } // This is a conceptual where
      });
      
      const result: Array<{ persona: PersonaDefinition; score: SupabasePersonaScore }> = [];
      if (scores) {
        for (const score of scores) {
          if (score.persona_id && score.overall_score !== null) { // Ensure overall_score is not null
            const persona = await this.getPersonaById(score.persona_id);
            if (persona) {
              result.push({ persona, score });
            }
          }
        }
      }
      // Sort in descending order of overall_score if not handled by DB query
      result.sort((a, b) => parseFloat(b.score.overall_score ?? "0") - parseFloat(a.score.overall_score ?? "0"));
      return result;
    } catch (error) {
      console.error('Error getting top performing personas from Supabase:', error);
      return [];
    }
  }
  /**
   * Gets the most frequently used personas
   *
   * @param limit - Maximum number of personas to return
   * @returns Promise resolving to an array of most used personas with usage counts
   */
  public async getMostUsedPersonas(
    limit: number = 10
  ): Promise<Array<{ persona: PersonaDefinition; usageCount: number }>> {
    await this.ensureInitialized();
    try {
      const scores = await supabase.queryPersonaScores({
        limit,
        orderBy: 'usage_count',
      });
      const result: Array<{ persona: PersonaDefinition; usageCount: number }> = [];

      if (scores) {
        for (const score of scores) {
          if (score.persona_id) {
            const persona = await this.getPersonaById(score.persona_id);
            if (persona) {
              result.push({ persona, usageCount: score.usage_count || 0 });
            }
          }
        }
      }
       // Sort in descending order of usage_count if not handled by DB query
      result.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
      return result;
    } catch (error) {
      console.error('Error getting most used personas from Supabase:', error);
      return [];
    }
  }

  /**
   * Creates a new PersonaManager instance
   *
   * @param personasDir - Optional directory for persona files
   * @param options - Optional configuration options
   */
  constructor(personasDir?: string) {
    this.personasDirectory =
      personasDir ||
      path.resolve(process.cwd(), 'lib', 'agents', 'personas', 'personasData');
    fsExtra.ensureDirSync(this.personasDirectory);

    // this.useUpstash flag is removed. Data source is determined by supabase.ts.
    // this.streamingService = PersonaStreamingService.getInstance(); // Removed

    console.log(
      `PersonaManager initialized. Personas will be managed via Supabase data access layer.`
    );
  }

  // This method will now primarily load MicroPersonas if they remain file-based.
  private async loadPersonasFromDirectory(): Promise<void> {
    if (!fsExtra.existsSync(this.personasDirectory)) {
      console.warn(
        `Personas directory does not exist: ${this.personasDirectory}`
      );
      return;
    }
    const files = await fsExtra.readdir(this.personasDirectory);
    for (const file of files) {
      const filePath = path.join(this.personasDirectory, file);
      const stat = await fsExtra.stat(filePath);
      if (stat.isDirectory()) continue;

      try {
        const content = await fsExtra.readFile(filePath, 'utf-8');
        const data: any = file.endsWith('.json')
          ? JSON.parse(content)
          : file.endsWith('.yaml') || file.endsWith('.yml')
            ? yaml.load(content)
            : null;

        if (!data) {
          console.warn(
            `Skipping file with unsupported extension or empty content: ${file}`
          );
          continue;
        }

        if (
          data.promptFragment ||
          data.parentPersonaId ||
          file.startsWith('micro_') ||
          data.microTraits
        ) {
          // Assuming MicroPersonas are still loaded from files for now
          const microPersona = validateMicroPersonaDefinition(data);
          this.registerMicroPersona(microPersona, false); // saveToStorage for micro-personas might need review
        } else {
          // PersonaDefinition loading from files is removed. They come from Supabase.
          // console.warn(`Skipping PersonaDefinition file: ${file}. Personas are loaded from Supabase.`);
          // const persona = validatePersonaDefinition(data);
          // this.registerPersona(persona, false); // This would try to save to Supabase again
        }
      } catch (error: any) {
        console.error(`Error loading micro-persona from ${file}: ${error.message}`);
        if (error.errors) {
          console.error(
            'Validation details:',
            JSON.stringify(error.errors, null, 2)
          );
        }
      }
    }
  }

  /**
   * Initializes the PersonaManager
   *
   * @param forceUpdate - Whether to force reloading all personas
   * @returns Promise that resolves when initialization is complete
   */
  public async init(forceUpdate: boolean = false): Promise<void> {
    if (this.initialized && !forceUpdate && !this.initPromise) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      this.personas.clear();
      this.microPersonas.clear(); // Keep for file-based micro-personas

      // Load built-in personas into memory.
      // These could be optionally registered to Supabase if they don't exist,
      // but for now, they are primarily in-memory constructs unless explicitly saved.
      Object.values(basePersonas).forEach((p: PersonaDefinition) =>
        this.personas.set(p.id, p)
      );
      Object.values(specializedPersonas).forEach((p: PersonaDefinition) =>
        this.personas.set(p.id, p)
      );
      Object.values(domainPersonas).forEach((p: PersonaDefinition) =>
        this.personas.set(p.id, p)
      );
      Object.values(taskPersonas).forEach((p: PersonaDefinition) =>
        this.personas.set(p.id, p)
      );
      
      // Load personas from Supabase
      try {
        const dbPersonas = await supabase.getAllAgentPersonas();
        if (dbPersonas) {
          dbPersonas.forEach(dbP => {
            const personaDef = this.mapSupabaseAgentPersonaToPersonaDefinition(dbP);
            this.personas.set(personaDef.id, personaDef);
          });
        }
      } catch (error) {
        console.error('Error loading personas from Supabase during init:', error);
        // Decide on fallback or error propagation strategy. For now, log and continue with built-ins.
      }

      // Load MicroPersonas from directory (assuming they remain file-based)
      await this.loadPersonasFromDirectory(); // This now primarily loads micro-personas

      this.initialized = true;
      this.initPromise = null;
      console.log(
        `PersonaManager initialized. Loaded ${this.personas.size} personas and ${this.microPersonas.size} micro-personas.`
      );
    })();
    return this.initPromise;
  }

  /**
   * Loads personas from Upstash Redis
   *
   * @returns Promise that resolves when loading is complete
   */
  // private async loadPersonasFromUpstash(): Promise<void> { // Removed, Supabase handles this.
  //   // ... existing code ...
  // }

  // Helper method to map SupabaseAgentPersona to PersonaDefinition
  private mapSupabaseAgentPersonaToPersonaDefinition(dbPersona: SupabaseAgentPersona): PersonaDefinition {
    // This mapping needs to be robust. Assuming fields align or need transformation.
    // For example, model_settings and capabilities might need JSON.parse if stored as strings,
    // or direct assignment if they are already JSONB/objects.
    // The schema for agent_personas has 'tags' as jsonb, 'model_settings' as jsonb, 'capabilities' as jsonb.
    // PersonaDefinition has tags?: string[], capabilities?: GeminiCapability[]
    
    let capabilitiesArray: GeminiCapability[] | undefined = undefined;
    if (dbPersona.capabilities && typeof dbPersona.capabilities === 'object') {
        // Assuming dbPersona.capabilities is an object like { text: true, vision: false }
        // This needs to be mapped to GeminiCapability[] based on your library's enum/values
        // For now, a placeholder:
        capabilitiesArray = Object.entries(dbPersona.capabilities)
                                .filter(([, value]) => value === true)
                                .map(([key]) => key.toUpperCase() as GeminiCapability); // This is a simplification
    }


    return {
      id: dbPersona.id,
      name: dbPersona.name,
      description: dbPersona.description,
      systemPromptTemplate: dbPersona.system_prompt_template,
      modelSettings: typeof dbPersona.model_settings === 'object' ? dbPersona.model_settings : JSON.parse(dbPersona.model_settings || '{}'),
      capabilities: capabilitiesArray, // Needs proper mapping
      tags: Array.isArray(dbPersona.tags) ? dbPersona.tags as string[] : (dbPersona.tags ? JSON.parse(dbPersona.tags as string) : undefined),
      version: dbPersona.version?.toString() || '1', // Ensure version is string
      isSystemPersona: false, // This field is not in Supabase schema, default or determine
      examples: [], // This field is not in Supabase schema
      category: 'general', // This field is not in Supabase schema
      temperature: (dbPersona.model_settings as any)?.temperature ?? 0.7, // Example, needs actual structure
      maxOutputTokens: (dbPersona.model_settings as any)?.maxOutputTokens ?? 2048, // Example
      responseMIMEType: 'text/plain', // This field is not in Supabase schema
      isEnabled: dbPersona.is_enabled ?? true,
      createdAt: dbPersona.created_at,
      lastUpdatedAt: dbPersona.updated_at,
      // Fields like compatibleMicroPersonas, parentPersonaId are not directly in agent_personas
      // and would need to be handled if MicroPersonas are also moved to Supabase.
    } as PersonaDefinition; // Cast needed due to potential mismatches / simplifications
  }

  // Helper method to calculate overall score
  private calculateOverallScore(currentScore: NewPersonaScore | SupabasePersonaScore, updates?: Partial<SupabasePersonaScore>): number {
    const data = { ...currentScore, ...updates };
    const weights = {
      success_rate: 0.4,
      user_satisfaction: 0.3,
      adaptability_score: 0.2,
      average_latency_ms: 0.1, // Lower latency is better
    };

    const successRate = parseFloat(data.success_rate || '0.5');
    const userSatisfaction = parseFloat(data.user_satisfaction || '0.5');
    const adaptabilityScore = parseFloat(data.adaptability_score || '0.5');
    // Normalize latency: e.g., 0-5000ms range, higher score for lower latency.
    // Max score of 1 for 0ms latency, 0 for 5000ms or more.
    const latencyScore = Math.max(0, 1 - (parseFloat(data.average_latency_ms || '5000') / 5000));

    let overallScore =
      weights.success_rate * successRate +
      weights.user_satisfaction * userSatisfaction +
      weights.adaptability_score * adaptabilityScore +
      weights.average_latency_ms * latencyScore;

    // Ensure score is between 0 and 1
    overallScore = Math.max(0, Math.min(1, overallScore));
    return parseFloat(overallScore.toFixed(4));
  }
  
  // Helper method to map PersonaDefinition to NewAgentPersona for creation
  private mapPersonaDefinitionToNewAgentPersona(personaDef: PersonaDefinition): NewAgentPersona {
    // Inverse of the above, ensure all required NewAgentPersona fields are present.
    // Timestamps (created_at, updated_at) are usually handled by DB.
    return {
      id: personaDef.id, // Assuming ID is already generated for new personas before this call
      name: personaDef.name,
      description: personaDef.description,
      system_prompt_template: personaDef.systemPromptTemplate,
      model_settings: personaDef.modelSettings || {},
      capabilities: personaDef.capabilities ? personaDef.capabilities.reduce((acc, cap) => ({ ...acc, [cap.toLowerCase()]: true }), {}) : {}, // Example mapping
      tags: personaDef.tags || [],
      version: parseInt(personaDef.version || '1', 10),
      is_enabled: personaDef.isEnabled,
      // created_at and updated_at will be set by Supabase/Drizzle
    };
  }
  
  // Helper method to map Partial<PersonaDefinition> to Partial<SupabaseAgentPersona> for updates
  private mapPartialPersonaDefinitionToPartialAgentPersona(updates: Partial<PersonaDefinition>): Partial<SupabaseAgentPersona> {
      const mapped: Partial<SupabaseAgentPersona> = { ...updates };
      if (updates.systemPromptTemplate) {
        mapped.system_prompt_template = updates.systemPromptTemplate;
        delete (mapped as any).systemPromptTemplate;
      }
      if (updates.modelSettings) {
        mapped.model_settings = updates.modelSettings;
        delete (mapped as any).modelSettings;
      }
      if (updates.capabilities) {
        mapped.capabilities = updates.capabilities.reduce((acc, cap) => ({ ...acc, [cap.toLowerCase()]: true }), {});
         delete (mapped as any).capabilities;
      }
      if (updates.version) {
        mapped.version = parseInt(updates.version, 10);
      }
      // Timestamps are handled by Supabase/Drizzle on update
      delete (mapped as any).createdAt;
      delete (mapped as any).lastUpdatedAt;
      return mapped;
  }


  private async ensureInitialized(): Promise<void> {
    if (!this.initialized && !this.initPromise) {
      await this.init();
    } else if (this.initPromise) {
      await this.initPromise;
    }
  }

  /**
   * Registers a persona in memory and persists it to storage
   *
   * @param personaData - The persona to register
   * @param saveToStorage - Whether to save to file/Upstash
   * @returns Promise resolving to the registered persona
   */
  public async registerPersona(
    personaData: PersonaDefinition,
    saveToStorage: boolean = true
  ): Promise<PersonaDefinition> {
    await this.ensureInitialized();

    this.personas.set(personaData.id, personaData); // Keep in-memory cache consistent

    if (saveToStorage) {
      try {
        const newAgentPersonaData = this.mapPersonaDefinitionToNewAgentPersona(personaData);
        // Assuming createAgentPersona handles potential primary key conflicts if id is already set
        // For now, let's assume createAgentPersona can also update if exists, or we need a separate update path.
        // For simplicity, let's assume this is for new personas or an upsert-like behavior from Supabase function.
        const existing = await supabase.getAgentPersonaById(newAgentPersonaData.id!); // Check if exists
        if (existing) {
            await supabase.updateAgentPersona(newAgentPersonaData.id!, newAgentPersonaData);
        } else {
            await supabase.createAgentPersona(newAgentPersonaData);
        }
      } catch (error) {
        console.error(`Error saving persona ${personaData.id} to Supabase:`, error);
        throw error; // Re-throw or handle appropriately
      }
    }
    return personaData;
  }

  /**
   * Registers a micro-persona in memory and persists it to storage
   *
   * @param microPersonaData - The micro-persona to register
   * @param saveToStorage - Whether to save to file/Upstash
   * @returns Promise resolving to the registered micro-persona
   */
  public async registerMicroPersona(
    microPersonaData: MicroPersonaDefinition,
    saveToStorage: boolean = true
  ): Promise<MicroPersonaDefinition> {
    await this.ensureInitialized();

    // MicroPersonas are assumed to be file-based for now.
    this.microPersonas.set(microPersonaData.id, microPersonaData);

    if (saveToStorage) {
      // Save to file (current MicroPersona logic)
      await this.saveMicroPersonaToFile(microPersonaData.id);
    }
    return microPersonaData;
  }

  /**
   * Gets a persona by ID from memory or storage
   *
   * @param id - The persona ID
   * @returns Promise resolving to the persona or null if not found
   */
  public async getPersonaById(id: string): Promise<PersonaDefinition | null> {
    await this.ensureInitialized();

    // Check in-memory cache first
    let persona = this.personas.get(id) || null;

    if (!persona) {
      try {
        const dbPersona = await supabase.getAgentPersonaById(id);
        if (dbPersona) {
          persona = this.mapSupabaseAgentPersonaToPersonaDefinition(dbPersona);
          this.personas.set(id, persona); // Cache in memory
        }
      } catch (error) {
        console.error(`Error fetching persona ${id} from Supabase:`, error);
        // Do not throw here, return null as per function signature
      }
    }
    return persona;
  }

  /**
   * Gets a micro-persona by ID from memory or storage
   *
   * @param id - The micro-persona ID
   * @returns Promise resolving to the micro-persona or null if not found
   */
  public async getMicroPersonaById(
    id: string
  ): Promise<MicroPersonaDefinition | null> {
    await this.ensureInitialized();

    // Check in-memory cache first
    // MicroPersonas are assumed to be file-based for now.
    // The logic to fetch from Upstash is removed.
    let microPersona = this.microPersonas.get(id) || null;
    
    // If file-based, it should be in memory after init. If not, it doesn't exist.
    // Optionally, could try to load it from file here if not found in map,
    // but current `loadPersonasFromDirectory` populates `this.microPersonas`.

    return microPersona;
  }

  /**
   * Lists all personas from memory or storage
   *
   * @param options - Optional filtering options
   * @returns Promise resolving to an array of personas
   */
  /**
   * Lists all personas from memory or storage
   *
   * @param options - Optional filtering options
   * @returns Promise resolving to an array of personas
   */
  public async listPersonas(
    options: {
      tags?: string[];
      capabilities?: GeminiCapability[];
      limit?: number;
      category?: string; // Added from schema if needed for filtering
    } = {}
  ): Promise<PersonaDefinition[]> {
    await this.ensureInitialized();

    // For now, filter from in-memory this.personas which is populated from Supabase + built-ins.
    // More complex queries might require direct Supabase calls with filters.
    let personas = Array.from(this.personas.values());

    // Apply filters if provided
    if (options.tags && options.tags.length > 0) {
      personas = personas.filter((p) => {
        if (!p.tags) return false;
        return options.tags!.some((tag) => p.tags!.includes(tag));
      });
    }

    if (options.capabilities && options.capabilities.length > 0) {
      personas = personas.filter((p) => {
        if (!p.capabilities) return false;
        return options.capabilities!.some((cap) =>
          p.capabilities!.includes(cap)
        );
      });
    }
    
    if (options.category) {
        personas = personas.filter(p => p.category === options.category);
    }

    // Apply limit if provided
    if (options.limit !== undefined) {
      personas = personas.slice(0, options.limit);
    }

    return personas;
  }

  /**
   * Lists all micro-personas from memory or storage
   *
   * @param options - Optional filtering options
   * @returns Promise resolving to an array of micro-personas
   */
  /**
   * Lists all micro-personas from memory or storage
   *
   * @param options - Optional filtering options
   * @returns Promise resolving to an array of micro-personas
   */
  public async listMicroPersonas(
    options: {
      parentPersonaId?: string;
      limit?: number;
    } = {}
  ): Promise<MicroPersonaDefinition[]> {
    await this.ensureInitialized();
    // MicroPersonas are assumed to be file-based for now.
    // The logic to fetch from Upstash (via streamingService) is removed.

    let microPersonas = Array.from(this.microPersonas.values());

    // Filter by parent if provided
    if (options.parentPersonaId) {
      microPersonas = microPersonas.filter(
        (mp) => mp.parentPersonaId === options.parentPersonaId
      );
    }

    // Apply limit if provided
    if (options.limit !== undefined) {
      microPersonas = microPersonas.slice(0, options.limit);
    }
    return microPersonas;
  }

  public async createPersona(
    personaData: Omit<
      PersonaDefinition,
      'id' | 'createdAt' | 'lastUpdatedAt' | 'version'
    > & { version?: string },
    saveToFile: boolean = true
  ): Promise<PersonaDefinition> {
    const newPersona: PersonaDefinition = validatePersonaDefinition({
      ...personaData,
      id: uuidv4(),
      version: personaData.version || '1.0.0',
      createdAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
    });
    return this.registerPersona(newPersona, saveToFile);
  }

  public async createMicroPersona(
    microPersonaData: Omit<
      MicroPersonaDefinition,
      'id' | 'createdAt' | 'lastUpdatedAt' | 'version'
    > & { version?: string },
    saveToFile: boolean = true
  ): Promise<MicroPersonaDefinition> {
    const newMicroPersona: MicroPersonaDefinition =
      validateMicroPersonaDefinition({
        ...microPersonaData,
        id: `micro_${uuidv4()}`,
        version: microPersonaData.version || '1.0.0',
        createdAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
      });
    return this.registerMicroPersona(newMicroPersona, saveToFile);
  }

  public async updatePersona(
    id: string,
    updates: Partial<Omit<PersonaDefinition, 'id' | 'createdAt'>>
  ): Promise<PersonaDefinition | null> {
    await this.ensureInitialized();
    await this.ensureInitialized();
    const existingPersona = this.personas.get(id); // Get from in-memory cache
    if (!existingPersona) return null;

    // Apply updates to the in-memory version
    const updatedInMemoryPersonaData = {
      ...existingPersona,
      ...updates,
      lastUpdatedAt: new Date().toISOString(),
    };
    const updatedPersonaDefinition = validatePersonaDefinition(updatedInMemoryPersonaData);
    this.personas.set(id, updatedPersonaDefinition);

    // Persist changes to Supabase
    try {
      const updatePayload = this.mapPartialPersonaDefinitionToPartialAgentPersona(updates);
      const result = await supabase.updateAgentPersona(id, updatePayload);
      if (result) {
        // Optionally, re-map from Supabase result to ensure consistency, though mapPartial... should be fine
        return this.mapSupabaseAgentPersonaToPersonaDefinition(result);
      }
      return null;
    } catch (error) {
      console.error(`Error updating persona ${id} in Supabase:`, error);
      // Revert in-memory change or handle error appropriately
      this.personas.set(id, existingPersona); // Revert
      throw error;
    }
  }

  public async updateMicroPersona(
    id: string,
    updates: Partial<
      Omit<MicroPersonaDefinition, 'id' | 'createdAt' | 'parentPersonaId'>
    >
  ): Promise<MicroPersonaDefinition | null> {
    await this.ensureInitialized();
    await this.ensureInitialized();
    // MicroPersonas are assumed to be file-based.
    const existingMicro = this.microPersonas.get(id);
    if (!existingMicro) return null;

    const updatedData = {
      ...existingMicro,
      ...updates,
      lastUpdatedAt: new Date().toISOString(),
    };
    const updatedMicro = validateMicroPersonaDefinition(updatedData);
    this.microPersonas.set(id, updatedMicro);
    await this.saveMicroPersonaToFile(id); // Save to file
    return updatedMicro;
  }

  public async deletePersona(id: string): Promise<boolean> {
    await this.ensureInitialized();
    if (!this.personas.has(id)) return false; // Not in memory

    // Delete from Supabase
    try {
      const deleted = await supabase.deleteAgentPersona(id);
      if (deleted) {
        this.personas.delete(id); // Remove from in-memory cache

        // If MicroPersonas are linked and file-based, handle their deletion if necessary
        // This part of the logic for deleting linked micro-personas might need to be re-evaluated
        // if micro-personas are also moved to Supabase.
        const microsToDelete = Array.from(this.microPersonas.values()).filter(
          (mp) => mp.parentPersonaId === id
        );
        for (const micro of microsToDelete) {
          await this.deleteMicroPersona(micro.id); // This uses file-based deletion for micros
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Error deleting persona ${id} from Supabase:`, error);
      throw error;
    }
  }

  public async deleteMicroPersona(id: string): Promise<boolean> {
    await this.ensureInitialized();
    await this.ensureInitialized();
    // MicroPersonas are assumed to be file-based.
    if (!this.microPersonas.has(id)) {
      return false;
    }

    const deletedFromMap = this.microPersonas.delete(id);
    if (!deletedFromMap) {
      return false; // Should not happen if it was in the map
    }

    // Delete file for micro-persona
    const formats: PersonaFileFormat[] = [
      PersonaFileFormat.JSON,
      PersonaFileFormat.YAML,
      PersonaFileFormat.YML,
    ];
    for (const format of formats) {
      const filePath = path.join(this.personasDirectory, `${id}.${format}`);
      try {
        if (await fsExtra.pathExists(filePath)) {
          await fsExtra.remove(filePath);
        }
      } catch (error) {
        console.error(
          `Error removing file ${filePath} for micro-persona ${id}:`,
          error
        );
        // Continue, don't let one file error stop everything
      }
    }

    // Update parent personas (in-memory and potentially Supabase if they were modified)
    for (const persona of this.personas.values()) { // Iterates over in-memory personas
      if (
        persona.compatibleMicroPersonas &&
        persona.compatibleMicroPersonas &&
        persona.compatibleMicroPersonas.includes(id)
      ) {
        const updatedCompatibleMicroPersonas = persona.compatibleMicroPersonas.filter((mpId) => mpId !== id);
        const updatedPersonaData = {
            ...persona,
            compatibleMicroPersonas: updatedCompatibleMicroPersonas,
            lastUpdatedAt: new Date().toISOString(),
        };
        const validatedUpdatedPersona = validatePersonaDefinition(updatedPersonaData);
        this.personas.set(persona.id, validatedUpdatedPersona); // Update in-memory

        // Persist this change to Supabase for the parent persona
        try {
          await supabase.updateAgentPersona(persona.id, { compatible_micro_personas: updatedCompatibleMicroPersonas });
        } catch (error) {
          console.error(
            `Error updating parent persona ${persona.id} in Supabase after deleting micro-persona ${id}:`,
            error
          );
          // Potentially revert in-memory change or handle error
        }
      }
    }
    return true;
  }

  // savePersonaToFile is removed as Supabase is the source of truth for PersonaDefinitions.
  // public async savePersonaToFile(...) {}

  // saveMicroPersonaToFile remains if MicroPersonas are file-based.
  public async saveMicroPersonaToFile(
    microPersonaId: string,
    format: PersonaFileFormat = PersonaFileFormat.JSON
  ): Promise<string> {
    await this.ensureInitialized(); // Ensures microPersonas map is loaded
    const microPersona = this.microPersonas.get(microPersonaId);
    if (!microPersona)
      throw new Error(`Micro-persona with ID ${microPersonaId} not found.`);

    const fileName = `${microPersonaId}.${format}`;
    const filePath = path.join(this.personasDirectory, fileName);

    let content: string;
    if (format === PersonaFileFormat.JSON) {
      content = JSON.stringify(microPersona, null, 2);
    } else {
      content = yaml.dump(microPersona);
    }
    await fsExtra.writeFile(filePath, content);
    console.log(`Saved micro-persona ${microPersonaId} to ${filePath}`);
    return filePath;
  }

  public generateSystemPrompt(
    basePersona: PersonaDefinition,
    microPersona?: MicroPersonaDefinition,
    dynamicContext?: Record<string, string>
  ): string {
    const composed = microPersona
      ? composePersona(basePersona, microPersona)
      : basePersona;
    let prompt = composed.systemPromptTemplate;

    if (composed.traits) {
      prompt = prompt.replace(/\{\{traits\}\}/g, composed.traits.join(', '));
    }
    if (microPersona && microPersona.microTraits) {
      prompt = prompt.replace(
        /\{\{microTraits\}\}/g,
        microPersona.microTraits.join(', ')
      );
    }
    if (dynamicContext) {
      for (const key in dynamicContext) {
        prompt = prompt.replace(
          new RegExp(`\\{\\{dynamicContext.${key}\\}\\}`, 'g'),
          dynamicContext[key]
        );
      }
    }

    Object.entries(composed).forEach(([key, value]) => {
      if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
      ) {
        prompt = prompt.replace(
          new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
          String(value)
        );
      }
    });
    if (microPersona) {
      Object.entries(microPersona).forEach(([key, value]) => {
        if (
          typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean'
        ) {
          prompt = prompt.replace(
            new RegExp(`\\{\\{microPersona.${key}\\}\\}`, 'g'),
            String(value)
          );
        }
      });
    }
    return prompt;
  }

  /**
   * Gets a persona recommendation based on task type, capabilities, and scores
   *
   * @param options - Recommendation options
   * @returns Promise resolving to the recommended persona with details
   */
  public async getPersonaRecommendation(options: {
    taskType?: string;
    userPreferences?: Record<string, any>;
    requiredCapabilities?: GeminiCapability[];
    userId?: string;
  }): Promise<{
    matchReason: string;
    score: number;
    persona: PersonaDefinition;
    microPersona?: MicroPersonaDefinition;
    scoreData?: PersonaScore | null;
    composedPersona: PersonaDefinition;
  } | null> {
    await this.ensureInitialized();

    // Get all personas as candidates from the in-memory map (already initialized from Supabase)
    let candidatePersonas = Array.from(this.personas.values());

    // Filter by required capabilities
    if (
      options.requiredCapabilities &&
      options.requiredCapabilities.length > 0
    ) {
      candidatePersonas = candidatePersonas.filter((p) =>
        options.requiredCapabilities!.every((cap) =>
          p.capabilities?.includes(cap)
        )
      );
    }

    // Filter by task type
    if (options.taskType) {
      candidatePersonas = candidatePersonas.filter(
        (p) =>
          p.tags?.includes(`task:${options.taskType}`) ||
          p.tags?.includes(options.taskType!)
      );
    }

    // Return null if no candidates match
    if (candidatePersonas.length === 0) return null;

    // Get scores for all candidates
    const scoreResults: (SupabasePersonaScore | null)[] = await Promise.all(
      candidatePersonas.map(p => supabase.getPersonaScoreByPersonaId(p.id).catch(err => {
          console.warn(`Failed to get score for persona ${p.id}:`, err);
          return null; // Return null if score fetching fails for a persona
        })
      )
    );

    let bestMatch: {
      persona: PersonaDefinition;
      microPersona?: MicroPersonaDefinition;
      scoreData?: SupabasePersonaScore | null;
      composedPersona: PersonaDefinition;
      matchReason: string;
      score: number;
    } | null = null;

    let highestScore = -Infinity;

    // Find the best match
    for (let i = 0; i < candidatePersonas.length; i++) {
      const p = candidatePersonas[i];
      const currentPersonaScore = scoreResults[i]; // This is now SupabasePersonaScore | null
      let currentOverallScore = currentPersonaScore?.overall_score ?? 0.5; // Ensure field name matches Supabase schema
      let matchReason = 'Highest overall score';

      // Find the best micro-persona for this persona (MicroPersonas still from memory/file)
      let bestMicroPersona: MicroPersonaDefinition | undefined = undefined;
      let bestMicroScore = -1;

      if (p.compatibleMicroPersonas && p.compatibleMicroPersonas.length > 0) {
        for (const microId of p.compatibleMicroPersonas) {
          const micro = this.microPersonas.get(microId) || null; // From memory

          if (micro) {
            // If MicroPersonas also have scores in Supabase, fetch them.
            // For now, assume micro-persona scores are not separately tracked in Supabase, or use a default score.
            // const microScoreData = await supabase.getPersonaScoreByPersonaId(micro.id).catch(() => null);
            // const microOverallScore = microScoreData ? parseFloat(microScoreData.overall_score ?? "0.5") : 0.5;
            const microOverallScore = 0.5; // Placeholder: Default score for micro-personas if not individually scored

            if (microOverallScore > bestMicroScore) {
              bestMicroScore = microOverallScore; // This is a numeric comparison
              bestMicroPersona = micro;
              matchReason = 'Best persona and micro-persona combination';
            }
          }
        }
      }

      // Adjust score if micro-persona is found
      if (bestMicroPersona && bestMicroScore > -1) {
        currentOverallScore = (currentOverallScore + bestMicroScore) / 2;
      }

      // Update best match if this is better
      if (currentOverallScore > highestScore) {
        highestScore = currentOverallScore;
        const composed = bestMicroPersona
          ? composePersona(p, bestMicroPersona)
          : p;
        bestMatch = {
          persona: p,
          microPersona: bestMicroPersona,
          scoreData: currentPersonaScore,
          composedPersona: composed,
          matchReason,
          score: currentOverallScore,
        };
      }
    }
    return bestMatch;
  }

  public getAgentPersona(
    personaDef: PersonaDefinition,
    microDef?: MicroPersonaDefinition,
    dynamicContext?: Record<string, string>
  ): AgentPersona {
    const composed = microDef
      ? composePersona(personaDef, microDef)
      : personaDef;

    const agentCapabilities: AgentPersona['capabilities'] = {};
    if (composed.capabilities) {
      for (const cap of composed.capabilities) {
        switch (cap) {
          case GeminiCapability.TEXT_GENERATION:
            agentCapabilities.text = true;
            break;
          case GeminiCapability.MULTIMODAL_UNDERSTANDING:
            agentCapabilities.vision = true;
            agentCapabilities.audio = true;
            break;
          case GeminiCapability.FUNCTION_CALLING:
          case GeminiCapability.TOOL_USE:
            agentCapabilities.functions = true;
            break;
          case GeminiCapability.JSON_MODE:
            agentCapabilities.json_mode = true;
            break;
          case GeminiCapability.TUNING:
            agentCapabilities.fine_tuning = true;
            break;
          case GeminiCapability.THINKING:
            agentCapabilities.thinking = true;
            break;
          case GeminiCapability.SEARCH_GROUNDING:
            agentCapabilities.search_grounding = true;
            break;
          case GeminiCapability.CACHING:
            agentCapabilities.cached_content = true;
            break;
          case GeminiCapability.CODE_EXECUTION:
            agentCapabilities.code_execution = true;
            break;
          case GeminiCapability.STRUCTURED_OUTPUTS:
            agentCapabilities.structured_output = true;
            break;
          case GeminiCapability.IMAGE_GENERATION:
            agentCapabilities.image_generation = true;
            break;
          case GeminiCapability.AUDIO_GENERATION:
            agentCapabilities.audio_generation = true;
            break;
        }
      }
    }

    return {
      id: composed.id,
      name: composed.name,
      description: composed.description || '',
      systemPromptTemplate: this.generateSystemPrompt(
        personaDef,
        microDef,
        dynamicContext
      ),
      modelSettings: composed.modelSettings || {},
      capabilities:
        Object.keys(agentCapabilities).length > 0
          ? agentCapabilities
          : undefined,
    };
  }
}

export const personaManager = new PersonaManager();
