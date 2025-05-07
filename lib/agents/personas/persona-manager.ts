/**
 * Dynamic persona management for agents
 *
 * This module provides functionality for managing agent personas,
 * including dynamic system prompt generation and model settings.
 * Supports loading personas from various file formats (JSON, YAML).
 * Integrates with Supabase and Drizzle for database operations.
 * Includes scoring system for tracking persona performance and adaptability.
 */

import { getSupabaseClient } from "../../memory/supabase"
import { AgentPersona } from "../agent.types"
import * as path from 'path'
import * as yaml from 'js-yaml'
import * as YAML from 'yaml'
import * as fsExtra from 'fs-extra'
import { personaScoreManager, ScoreUpdateData } from "./persona-score-manager"

/**
 * File formats supported for persona loading
 */
export enum PersonaFileFormat {
  JSON = 'json',
  YAML = 'yaml',
  YML = 'yml',
}

/**
 * Interface for persona file content
 */
export interface PersonaFileContent {
  id?: string
  name: string
  description: string
  systemPromptTemplate: string
  modelSettings?: Record<string, any>
}

/**
 * Persona Manager for dynamic persona management
 */
export class PersonaManager {
  private personas: Map<string, AgentPersona> = new Map()
  private promptTemplates: Map<string, string> = new Map()
  private initialized: boolean = false
  private initPromise: Promise<void> | null = null
  private personasDirectory: string = path.join(process.cwd(), 'lib', 'agents', 'personas', 'templates')

  /**
   * Initialize the persona manager
   */
  public async init(): Promise<void> {
    if (this.initialized) return

    if (this.initPromise) {
      await this.initPromise
      return
    }

    this.initPromise = Promise.all([
      this.loadPersonasFromDatabase(),
      this.loadPersonasFromFiles()
    ]).then(() => {
      console.log(`Total personas loaded: ${this.personas.size}`)
    })

    await this.initPromise
    this.initialized = true
  }

  /**
   * Load personas from database (Supabase)
   */
  private async loadPersonasFromDatabase(): Promise<void> {
    try {
      // Use Supabase client
      const supabase = getSupabaseClient();
      const { data: personas, error } = await supabase.from("agent_personas").select("*");

      if (error) throw error;
      if (!personas || personas.length === 0) {
        console.log("No personas found in database");
        return;
      }

      // Load each persona
      for (const persona of personas) {
        this.personas.set(persona.id, {
          id: persona.id,
          name: persona.name,
          description: persona.description,
          systemPromptTemplate: persona.system_prompt_template,
          modelSettings: persona.model_settings || {},
          capabilities: persona.capabilities || {
            text: true,
            vision: false,
            audio: false,
            video: false,
            functions: true,
            streaming: true,
            json_mode: false,
            fine_tuning: false,
            thinking: false,
            search_grounding: false,
            dynamic_retrieval: false,
            hybrid_grounding: false,
            cached_content: false,
            code_execution: false,
            structured_output: false,
            image_generation: false,
            video_generation: false,
            audio_generation: false,
            response_modalities: false,
            file_inputs: false
          }
        } as AgentPersona);

        if (persona.system_prompt_template) {
          this.promptTemplates.set(persona.id, persona.system_prompt_template);
        }
      }

      console.log(`Loaded ${personas.length} personas from database`);
    } catch (error) {
      console.error("Failed to load personas from database:", error);
      // Don't throw, just log the error to allow file loading to continue
    }
  }

  /**
   * Load personas from files in the templates directory
   */
  private async loadPersonasFromFiles(): Promise<void> {
    try {
      // Create the directory if it doesn't exist
      await fsExtra.ensureDir(this.personasDirectory)

      // Get all files in the directory
      const files = await fsExtra.readdir(this.personasDirectory)

      let loadedCount = 0

      // Process each file
      for (const file of files) {
        try {
          const filePath = path.join(this.personasDirectory, file)
          const stats = await fsExtra.stat(filePath)

          // Skip directories
          if (stats.isDirectory()) continue

          // Get file extension
          const ext = path.extname(file).toLowerCase().substring(1)

          // Skip unsupported file types
          if (!Object.values(PersonaFileFormat).includes(ext as PersonaFileFormat)) {
            continue
          }

          // Load and parse the file
          const persona = await this.parsePersonaFile(filePath, ext as PersonaFileFormat)

          if (persona) {
            // Generate an ID if not provided
            const id = persona.id || `file-${path.basename(file, path.extname(file))}`

            // Add to personas map
            this.personas.set(id, {
              id,
              name: persona.name,
              description: persona.description,
              systemPromptTemplate: persona.systemPromptTemplate,
              modelSettings: persona.modelSettings || {}
            })

            // Add to prompt templates
            this.promptTemplates.set(id, persona.systemPromptTemplate)

            loadedCount++
          }
        } catch (fileError) {
          console.error(`Error loading persona from file ${file}:`, fileError)
          // Continue with other files
        }
      }

      console.log(`Loaded ${loadedCount} personas from files`)
    } catch (error) {
      console.error("Failed to load personas from files:", error)
      // Don't throw, just log the error
    }
  }

  /**
   * Parse a persona file based on its format
   *
   * @param filePath - Path to the persona file
   * @param format - File format
   * @returns Parsed persona or null if parsing failed
   */
  private async parsePersonaFile(filePath: string, format: PersonaFileFormat): Promise<PersonaFileContent | null> {
    try {
      const content = await fsExtra.readFile(filePath, 'utf8')

      switch (format) {
        case PersonaFileFormat.JSON:
          return JSON.parse(content) as PersonaFileContent

        case PersonaFileFormat.YAML:
        case PersonaFileFormat.YML:
          // Try both YAML parsers
          try {
            return yaml.load(content) as PersonaFileContent
          } catch (yamlError) {
            return YAML.parse(content) as PersonaFileContent
          }

        default:
          console.warn(`Unsupported file format: ${format}`)
          return null
      }
    } catch (error) {
      console.error(`Failed to parse persona file ${filePath}:`, error)
      return null
    }
  }

  /**
   * Get a persona by ID
   *
   * @param id - Persona ID
   * @returns AgentPersona or undefined if not found
   */
  public async getPersona(id: string): Promise<AgentPersona | undefined> {
    await this.ensureInitialized()
    return this.personas.get(id)
  }

  /**
   * List all personas
   *
   * @returns Array of AgentPersona objects
   */
  public async listPersonas(): Promise<AgentPersona[]> {
    await this.ensureInitialized()
    return Array.from(this.personas.values())
  }

  /**
   * Generate a system prompt for an agent based on a persona
   *
   * @param personaId - Persona ID
   * @param context - Context variables for template substitution
   * @returns Generated system prompt
   */
  public async generateSystemPrompt(
    personaId: string,
    context: Record<string, any> = {}
  ): Promise<string> {
    await this.ensureInitialized()

    const template = this.promptTemplates.get(personaId)
    if (!template) {
      throw new Error(`No prompt template found for persona: ${personaId}`)
    }

    // Simple template substitution
    let prompt = template
    for (const [key, value] of Object.entries(context)) {
      prompt = prompt.replace(new RegExp(`{{${key}}}`, 'g'), String(value))
    }

    return prompt
  }

  /**
   * Get model settings for a persona
   *
   * @param personaId - Persona ID
   * @returns Model settings object or undefined if not found
   */
  public async getModelSettings(personaId: string): Promise<Record<string, any> | undefined> {
    await this.ensureInitialized()

    const persona = await this.getPersona(personaId)
    return persona?.modelSettings
  }

  /**
   * Create a new persona
   *
   * @param persona - Persona configuration
   * @returns Created persona ID
   */
  public async createPersona(persona: Omit<AgentPersona, 'id'>): Promise<string> {
    // Prepare data for insertion
    const personaData = {
      name: persona.name,
      description: persona.description,
      system_prompt_template: persona.systemPromptTemplate,
      model_settings: persona.modelSettings || {},
      capabilities: persona.capabilities || {
        text: true,
        vision: false,
        audio: false,
        video: false,
        functions: true,
        streaming: true,
        json_mode: false,
        fine_tuning: false,
        thinking: false,
        search_grounding: false,
        dynamic_retrieval: false,
        hybrid_grounding: false,
        cached_content: false,
        code_execution: false,
        structured_output: false,
        image_generation: false,
        video_generation: false,
        audio_generation: false,
        response_modalities: false,
        file_inputs: false
      }
    };

    // Use Supabase client
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from("agent_personas")
      .insert(personaData)
      .select()
      .single();

    if (error) throw error;

    const createdId = data.id;
    console.log(`Created persona with ID ${createdId} in database`);

    // Reload personas
    await Promise.all([
      this.loadPersonasFromDatabase(),
      this.loadPersonasFromFiles()
    ]);

    return createdId;
  }

  /**
   * Update an existing persona
   *
   * @param id - Persona ID
   * @param updates - Partial persona updates
   */
  public async updatePersona(
    id: string,
    updates: Partial<Omit<AgentPersona, 'id'>>
  ): Promise<void> {
    // Prepare update data
    const updateData: any = {};
    if (updates.name) updateData.name = updates.name;
    if (updates.description) updateData.description = updates.description;
    if (updates.systemPromptTemplate) updateData.system_prompt_template = updates.systemPromptTemplate;
    if (updates.modelSettings) updateData.model_settings = updates.modelSettings;

    // Use Supabase client
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from("agent_personas")
      .update(updateData)
      .eq("id", id);

    if (error) throw error;

    console.log(`Updated persona with ID ${id} in database`);

    // Reload personas
    await Promise.all([
      this.loadPersonasFromDatabase(),
      this.loadPersonasFromFiles()
    ]);
  }

  /**
   * Delete a persona
   *
   * @param id - Persona ID
   */
  public async deletePersona(id: string): Promise<void> {
    // Use Supabase client
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from("agent_personas")
      .delete()
      .eq("id", id);

    if (error) throw error;

    console.log(`Deleted persona with ID ${id} from database`);

    // Reload personas
    await Promise.all([
      this.loadPersonasFromDatabase(),
      this.loadPersonasFromFiles()
    ]);
  }

  /**
   * Save a persona to a file
   *
   * @param personaId - ID of the persona to save
   * @param format - File format to save as
   * @param filePath - Optional custom file path (if not provided, will use default location)
   * @returns Path to the saved file
   */
  public async savePersonaToFile(
    personaId: string,
    format: PersonaFileFormat = PersonaFileFormat.JSON,
    filePath?: string
  ): Promise<string> {
    await this.ensureInitialized();

    // Get the persona
    const persona = this.personas.get(personaId);
    if (!persona) {
      throw new Error(`Persona with ID ${personaId} not found`);
    }

    // Create persona data for file
    const personaData: PersonaFileContent = {
      id: persona.id,
      name: persona.name,
      description: persona.description,
      systemPromptTemplate: persona.systemPromptTemplate,
      modelSettings: persona.modelSettings
    };

    // Determine file path
    const fileName = filePath || path.join(
      this.personasDirectory,
      `${persona.name.toLowerCase().replace(/\s+/g, '-')}.${format}`
    );

    // Ensure directory exists
    await fsExtra.ensureDir(path.dirname(fileName));

    // Convert to appropriate format and save
    let fileContent: string;

    switch (format) {
      case PersonaFileFormat.JSON:
        fileContent = JSON.stringify(personaData, null, 2);
        break;

      case PersonaFileFormat.YAML:
      case PersonaFileFormat.YML:
        fileContent = YAML.stringify(personaData);
        break;

      default:
        throw new Error(`Unsupported file format: ${format}`);
    }

    // Write to file
    await fsExtra.writeFile(fileName, fileContent, 'utf8');

    console.log(`Saved persona ${persona.name} to file: ${fileName}`);
    return fileName;
  }

  /**
   * Get a persona with its score
   *
   * @param id - Persona ID
   * @returns Persona with score information
   */
  public async getPersonaWithScore(id: string): Promise<{
    persona: AgentPersona | undefined;
    score: any | null;
  }> {
    await this.ensureInitialized();

    const persona = this.personas.get(id);
    const score = await personaScoreManager.getScore(id);

    return { persona, score };
  }

  /**
   * Get top performing personas based on score
   *
   * @param limit - Maximum number of personas to return
   * @returns Array of top personas with their scores
   */
  public async getTopPerformingPersonas(limit: number = 5): Promise<Array<{
    persona: AgentPersona;
    score: any;
  }>> {
    await this.ensureInitialized();

    // Get top scores
    const topScores = await personaScoreManager.getTopPerformingPersonas(limit);

    // Map scores to personas
    const result = [];
    for (const score of topScores) {
      const persona = this.personas.get(score.persona_id);
      if (persona) {
        result.push({ persona, score });
      }
    }

    return result;
  }

  /**
   * Get most used personas based on usage count
   *
   * @param limit - Maximum number of personas to return
   * @returns Array of most used personas with their scores
   */
  public async getMostUsedPersonas(limit: number = 5): Promise<Array<{
    persona: AgentPersona;
    score: any;
  }>> {
    await this.ensureInitialized();

    // Get most used scores
    const mostUsedScores = await personaScoreManager.getMostUsedPersonas(limit);

    // Map scores to personas
    const result = [];
    for (const score of mostUsedScores) {
      const persona = this.personas.get(score.persona_id);
      if (persona) {
        result.push({ persona, score });
      }
    }

    return result;
  }

  /**
   * Record usage of a persona with performance metrics
   *
   * @param personaId - Persona ID
   * @param metrics - Performance metrics
   * @returns Updated score
   */
  public async recordPersonaUsage(
    personaId: string,
    metrics: {
      success?: boolean;
      latency?: number;
      userSatisfaction?: number;
      adaptabilityFactor?: number;
      metadata?: Record<string, any>;
    }
  ): Promise<any> {
    await this.ensureInitialized();

    // Ensure persona exists
    const persona = this.personas.get(personaId);
    if (!persona) {
      throw new Error(`Persona with ID ${personaId} not found`);
    }

    // Update score
    return personaScoreManager.updateScore(personaId, metrics as ScoreUpdateData);
  }

  /**
   * Record user feedback for a persona
   *
   * @param personaId - Persona ID
   * @param rating - User satisfaction rating (0-1)
   * @param feedback - Optional feedback text
   * @returns Updated score
   */
  public async recordUserFeedback(
    personaId: string,
    rating: number,
    feedback?: string
  ): Promise<any> {
    await this.ensureInitialized();

    // Ensure persona exists
    const persona = this.personas.get(personaId);
    if (!persona) {
      throw new Error(`Persona with ID ${personaId} not found`);
    }

    // Record feedback
    return personaScoreManager.recordUserFeedback(personaId, rating, feedback);
  }

  /**
   * Get a persona recommendation based on context
   *
   * @param context - Context for recommendation (e.g., task type, user preferences)
   * @returns Recommended persona with score
   */
  public async getPersonaRecommendation(
    context: {
      taskType?: string;
      userPreferences?: Record<string, any>;
      requiredCapabilities?: string[];
      [key: string]: any;
    }
  ): Promise<{
    persona: AgentPersona;
    score: any;
    matchReason: string;
  } | null> {
    await this.ensureInitialized();

    // Get all personas with scores
    const allPersonas = await this.listPersonas();
    const personaScores = await Promise.all(
      allPersonas.map(async (persona) => {
        const score = await personaScoreManager.getScore(persona.id);
        return { persona, score: score || null };
      })
    );

    // Filter out personas with no scores or low usage
    const candidatePersonas = personaScores.filter(
      ({ score }) => score && score.usage_count > 0
    );

    if (candidatePersonas.length === 0) {
      // If no personas have scores, return the first available persona
      if (allPersonas.length > 0) {
        return {
          persona: allPersonas[0],
          score: null,
          matchReason: "No scored personas available, using default"
        };
      }
      return null;
    }

    // Simple scoring algorithm based on context
    const scoredCandidates = candidatePersonas.map(({ persona, score }) => {
      // We've already filtered for non-null scores above, but add a safety check
      if (!score) {
        return {
          persona,
          score: null,
          matchScore: 0,
          matchReason: "No score data available"
        };
      }

      let matchScore = score.overall_score;
      let matchReason = "Based on overall performance score";

      // Adjust score based on task type if provided
      if (context.taskType && persona.modelSettings?.preferredTasks) {
        const preferredTasks = persona.modelSettings.preferredTasks;
        if (Array.isArray(preferredTasks) && preferredTasks.includes(context.taskType)) {
          matchScore += 0.2;
          matchReason = `Specialized for ${context.taskType} tasks`;
        }
      }

      // Adjust score based on required capabilities
      if (context.requiredCapabilities && persona.modelSettings?.capabilities) {
        const capabilities = persona.modelSettings.capabilities;
        const matchedCapabilities = context.requiredCapabilities.filter(
          cap => capabilities.includes(cap)
        );

        if (matchedCapabilities.length > 0) {
          const capabilityBonus = 0.1 * (matchedCapabilities.length / context.requiredCapabilities.length);
          matchScore += capabilityBonus;
          matchReason = `Matches ${matchedCapabilities.length} of ${context.requiredCapabilities.length} required capabilities`;
        }
      }

      return { persona, score, matchScore, matchReason };
    });

    // Sort by match score
    scoredCandidates.sort((a, b) => b.matchScore - a.matchScore);

    // Return the best match
    const bestMatch = scoredCandidates[0];
    return {
      persona: bestMatch.persona,
      score: bestMatch.score,
      matchReason: bestMatch.matchReason
    };
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
 * Singleton instance of PersonaManager
 */
export const personaManager = new PersonaManager()
