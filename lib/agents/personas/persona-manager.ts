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
import { personaScoreManager } from './persona-score-manager';
import { AgentPersona } from '../agent.types';
import { domainPersonas, taskPersonas } from './persona-library-extended';
import * as UpstashPersonaStore from './upstash-persona-store';
import * as UpstashPersonaScore from './upstash-persona-score';
import { PersonaStreamingService } from './persona-streaming-service';
import { getMemoryProvider } from '../../memory/factory';
import { getRedisClient } from '../../memory/upstash/upstashClients';

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
  private streamingService: PersonaStreamingService;
  private useUpstash: boolean;

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
    if (this.useUpstash) {
      // Record usage in Upstash
      await UpstashPersonaScore.recordPersonaUsage(personaId, data.metadata);

      // Update score in Upstash
      const previousScore =
        await UpstashPersonaScore.loadPersonaScore(personaId);
      await UpstashPersonaScore.updatePersonaScore(personaId, {
        successfulInteraction: data.success,
        latencyMs: data.latency,
        adaptabilityFactor: data.adaptabilityFactor,
        metadata: {
          taskType: data.metadata.taskType,
          taskScore: data.success ? 1 : 0,
          previousOverallScore: previousScore?.overall_score,
        },
      });
    } else if (personaScoreManager) {
      // Use the existing score manager
      if (typeof personaScoreManager.recordPersonaUsage === 'function') {
        await personaScoreManager.recordPersonaUsage(personaId, data);
      } else {
        console.warn(
          'PersonaScoreManager does not have recordPersonaUsage method'
        );
      }
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
    if (this.useUpstash) {
      // Get current score
      const currentScore =
        await UpstashPersonaScore.loadPersonaScore(personaId);

      if (currentScore) {
        // Update user satisfaction based on rating
        await UpstashPersonaScore.updatePersonaScore(personaId, {
          userSatisfaction: rating,
        });

        // Store feedback if provided
        if (feedback) {
          const redis = getRedisClient();
          const feedbackKey = `persona:feedback:${personaId}`;
          const feedbackData = JSON.stringify({
            rating,
            feedback,
            timestamp: new Date().toISOString(),
          });

          await redis.lpush(feedbackKey, feedbackData);
          await redis.ltrim(feedbackKey, 0, 99); // Keep last 100 feedback entries
        }
      }
    } else if (personaScoreManager) {
      // Use the existing score manager
      if (typeof personaScoreManager.recordUserFeedback === 'function') {
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
  ): Promise<Array<{ persona: PersonaDefinition; score: PersonaScore }>> {
    if (this.useUpstash) {
      const redis = getRedisClient();

      // Get all persona IDs with scores
      const personaKeys = await redis.keys('persona:score:*');
      const topPersonaIds = personaKeys
        .map((key) => key.replace('persona:score:', ''))
        .slice(0, limit);

      if (!topPersonaIds || topPersonaIds.length === 0) {
        return [];
      }

      // Get persona data and scores
      const result: Array<{ persona: PersonaDefinition; score: PersonaScore }> =
        [];

      for (const personaId of topPersonaIds) {
        const [personaData, scoreData] = await Promise.all([
          UpstashPersonaStore.loadPersona(personaId),
          UpstashPersonaScore.loadPersonaScore(personaId),
        ]);

        if (personaData && scoreData) {
          result.push({ persona: personaData, score: scoreData });
        }
      }

      return result;
    } else if (personaScoreManager) {
      // Use the existing score manager
      // Get all personas first since getTopScores might not exist
      const allPersonas = Array.from(this.personas.values());
      const scoresMap = new Map<string, PersonaScore>();

      // Get scores for each persona
      for (const persona of allPersonas) {
        try {
          const scoreData = await personaScoreManager.getScore(persona.id);
          if (scoreData) {
            scoresMap.set(persona.id, scoreData as unknown as PersonaScore);
          }
        } catch (error) {
          console.warn(`Error getting score for persona ${persona.id}:`, error);
        }
      }

      // Convert to array and sort
      const scores = Array.from(scoresMap.entries())
        .map(([personaId, score]) => ({ personaId, ...score }))
        .sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0))
        .slice(0, limit);
      const result: Array<{ persona: PersonaDefinition; score: PersonaScore }> =
        [];

      for (const score of scores) {
        const persona = await this.getPersonaById(score.personaId);
        if (persona) {
          result.push({ persona, score });
        }
      }

      return result;
    }

    return [];
  } /**
   * Gets the most frequently used personas
   *
   * @param limit - Maximum number of personas to return
   * @returns Promise resolving to an array of most used personas with usage counts
   */
  public async getMostUsedPersonas(
    limit: number = 10
  ): Promise<Array<{ persona: PersonaDefinition; usageCount: number }>> {
    if (this.useUpstash) {
      const redis = getRedisClient();
      const usagePattern = 'persona:usage:*';

      // Scan for all usage keys
      const usageKeys = await redis.keys(usagePattern);

      if (!usageKeys || usageKeys.length === 0) {
        return [];
      }

      // Get total usage for each persona
      const usageCounts: Array<{ personaId: string; count: number }> = [];

      for (const key of usageKeys) {
        const personaId = key.replace('persona:usage:', '');
        const totalUsage = await redis.hget(key, 'total_usage');

        if (totalUsage) {
          usageCounts.push({
            personaId,
            count: parseInt(totalUsage as string, 10),
          });
        }
      }

      // Sort by usage count (descending)
      usageCounts.sort((a, b) => b.count - a.count);

      // Get persona data for top used personas
      const result: Array<{ persona: PersonaDefinition; usageCount: number }> =
        [];

      for (const { personaId, count } of usageCounts.slice(0, limit)) {
        const personaData = await UpstashPersonaStore.loadPersona(personaId);

        if (personaData) {
          result.push({ persona: personaData, usageCount: count });
        }
      }

      return result;
    } else if (personaScoreManager) {
      // Use the existing score manager
      // Since getMostUsed might not exist, we'll use a fallback approach
      const allPersonas = Array.from(this.personas.values());
      const usageMap = new Map<string, number>();

      // Get usage count for each persona
      for (const persona of allPersonas) {
        try {
          const scoreData = await personaScoreManager.getScore(persona.id);
          if (
            scoreData &&
            scoreData.metadata &&
            scoreData.metadata.usageCount
          ) {
            usageMap.set(persona.id, scoreData.metadata.usageCount);
          } else {
            usageMap.set(persona.id, 0); // Default to 0 if no usage data
          }
        } catch (error) {
          console.warn(`Error getting usage for persona ${persona.id}:`, error);
          usageMap.set(persona.id, 0);
        }
      }

      // Convert to array and sort
      const usageData = Array.from(usageMap.entries())
        .map(([personaId, count]) => ({ personaId, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
      const result: Array<{ persona: PersonaDefinition; usageCount: number }> =
        [];

      for (const { personaId, count } of usageData) {
        const persona = await this.getPersonaById(personaId);
        if (persona) {
          result.push({ persona, usageCount: count });
        }
      }

      return result;
    }

    return [];
  }

  /**
   * Creates a new PersonaManager instance
   *
   * @param personasDir - Optional directory for persona files
   * @param options - Optional configuration options
   */
  constructor(
    personasDir?: string,
    options: {
      useUpstash?: boolean;
    } = {}
  ) {
    this.personasDirectory =
      personasDir ||
      path.resolve(process.cwd(), 'lib', 'agents', 'personas', 'personasData');
    fsExtra.ensureDirSync(this.personasDirectory);

    // Initialize Upstash integration if specified or if MEMORY_PROVIDER is 'upstash'
    this.useUpstash =
      options.useUpstash !== undefined
        ? options.useUpstash
        : getMemoryProvider() === 'upstash';

    // Initialize streaming service
    this.streamingService = PersonaStreamingService.getInstance();

    console.log(
      `PersonaManager initialized with ${this.useUpstash ? 'Upstash' : 'file-based'} storage`
    );
  }

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
          const microPersona = validateMicroPersonaDefinition(data);
          this.registerMicroPersona(microPersona, false);
        } else {
          const persona = validatePersonaDefinition(data);
          this.registerPersona(persona, false);
        }
      } catch (error: any) {
        console.error(`Error loading persona from ${file}: ${error.message}`);
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
      this.microPersonas.clear();

      // Load built-in personas
      Object.values(basePersonas).forEach((p: PersonaDefinition) =>
        this.registerPersona(p, false)
      );
      Object.values(specializedPersonas).forEach((p: PersonaDefinition) =>
        this.registerPersona(p, false)
      );
      Object.values(domainPersonas).forEach((p: PersonaDefinition) =>
        this.registerPersona(p, false)
      );
      Object.values(taskPersonas).forEach((p: PersonaDefinition) =>
        this.registerPersona(p, false)
      );

      // Load from file system or Upstash
      if (this.useUpstash) {
        await this.loadPersonasFromUpstash();
      } else {
        await this.loadPersonasFromDirectory();
      }

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
  private async loadPersonasFromUpstash(): Promise<void> {
    try {
      console.log('Loading personas from Upstash...');

      // Use streaming service to get all personas
      const personas = await this.streamingService.getAllPersonas();

      for (const persona of personas) {
        this.personas.set(persona.id, persona);
      }

      // Use streaming service to get all micro-personas for each persona
      for (const persona of personas) {
        if (
          persona.compatibleMicroPersonas &&
          persona.compatibleMicroPersonas.length > 0
        ) {
          const microPersonas = await this.streamingService.getAllMicroPersonas(
            {
              parentPersonaId: persona.id,
            }
          );

          for (const microPersona of microPersonas) {
            this.microPersonas.set(microPersona.id, microPersona);
          }
        }
      }

      console.log(
        `Loaded ${this.personas.size} personas and ${this.microPersonas.size} micro-personas from Upstash.`
      );
    } catch (error) {
      console.error('Error loading personas from Upstash:', error);

      // Fall back to file system if Upstash fails
      console.log('Falling back to file system...');
      await this.loadPersonasFromDirectory();
    }
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

    // personaData is assumed to have a valid id due to prior validation or creation processes.
    // The Zod schema for PersonaDefinition ensures 'id' is a non-empty string.
    this.personas.set(personaData.id, personaData);

    if (saveToStorage) {
      if (this.useUpstash) {
        // Save to Upstash
        await UpstashPersonaStore.savePersona(personaData);
      } else {
        // Save to file
        await this.savePersonaToFile(personaData.id);
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

    // microPersonaData is assumed to have a valid id due to prior validation or creation processes.
    // The Zod schema for MicroPersonaDefinition ensures 'id' is a non-empty string.
    this.microPersonas.set(microPersonaData.id, microPersonaData);

    if (saveToStorage) {
      if (this.useUpstash) {
        // Save to Upstash
        await UpstashPersonaStore.saveMicroPersona(microPersonaData);
      } else {
        // Save to file
        await this.saveMicroPersonaToFile(microPersonaData.id);
      }
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

    // If not in memory and using Upstash, try to fetch from Upstash
    if (!persona && this.useUpstash) {
      persona = await UpstashPersonaStore.loadPersona(id);

      // Cache in memory if found
      if (persona) {
        this.personas.set(id, persona);
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
    let microPersona = this.microPersonas.get(id) || null;

    // If not in memory and using Upstash, try to fetch from Upstash
    if (!microPersona && this.useUpstash) {
      microPersona = await UpstashPersonaStore.loadMicroPersona(id);

      // Cache in memory if found
      if (microPersona) {
        this.microPersonas.set(id, microPersona);
      }
    }

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
    } = {}
  ): Promise<PersonaDefinition[]> {
    await this.ensureInitialized();

    if (this.useUpstash) {
      // Use streaming service to get personas with filtering
      return this.streamingService.getAllPersonas({
        tags: options.tags,
        capabilities: options.capabilities,
        limit: options.limit,
      });
    } else {
      // Get from in-memory cache
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

      // Apply limit if provided
      if (options.limit !== undefined) {
        personas = personas.slice(0, options.limit);
      }

      return personas;
    }
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

    if (this.useUpstash) {
      if (options.parentPersonaId) {
        // Get micro-personas for a specific parent
        return this.streamingService.getAllMicroPersonas({
          parentPersonaId: options.parentPersonaId,
          limit: options.limit,
        });
      } else {
        // Get all micro-personas using streaming service
        return this.streamingService.getAllMicroPersonas({
          limit: options.limit,
        });
      }
    } else {
      // Get from in-memory cache
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
    const existingPersona = this.personas.get(id);
    if (!existingPersona) return null;

    const updatedData = {
      ...existingPersona,
      ...updates,
      lastUpdatedAt: new Date().toISOString(),
    };
    const updatedPersona = validatePersonaDefinition(updatedData);
    this.personas.set(id, updatedPersona);
    await this.savePersonaToFile(id);
    return updatedPersona;
  }

  public async updateMicroPersona(
    id: string,
    updates: Partial<
      Omit<MicroPersonaDefinition, 'id' | 'createdAt' | 'parentPersonaId'>
    >
  ): Promise<MicroPersonaDefinition | null> {
    await this.ensureInitialized();
    const existingMicro = this.microPersonas.get(id);
    if (!existingMicro) return null;

    const updatedData = {
      ...existingMicro,
      ...updates,
      lastUpdatedAt: new Date().toISOString(),
    };
    const updatedMicro = validateMicroPersonaDefinition(updatedData);
    this.microPersonas.set(id, updatedMicro);
    await this.saveMicroPersonaToFile(id);
    return updatedMicro;
  }

  public async deletePersona(id: string): Promise<boolean> {
    await this.ensureInitialized();
    if (!this.personas.has(id)) return false;

    const formats: PersonaFileFormat[] = [
      PersonaFileFormat.JSON,
      PersonaFileFormat.YAML,
      PersonaFileFormat.YML,
    ];
    if (this.personas.delete(id)) {
      for (const format of formats) {
        const filePath = path.join(this.personasDirectory, `${id}.${format}`);
        if (await fsExtra.pathExists(filePath)) await fsExtra.remove(filePath);
      }

      const microsToDelete = Array.from(this.microPersonas.values()).filter(
        (mp) => mp.parentPersonaId === id
      );
      for (const micro of microsToDelete) {
        await this.deleteMicroPersona(micro.id);
      }
      return true;
    }
    return false;
  }

  public async deleteMicroPersona(id: string): Promise<boolean> {
    await this.ensureInitialized();
    if (!this.microPersonas.has(id)) {
      return false;
    }

    const deletedFromMap = this.microPersonas.delete(id);
    if (!deletedFromMap) {
      return false;
    }

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
      }
    }

    for (const persona of this.personas.values()) {
      if (
        persona.compatibleMicroPersonas &&
        persona.compatibleMicroPersonas.includes(id)
      ) {
        persona.compatibleMicroPersonas =
          persona.compatibleMicroPersonas.filter((mpId) => mpId !== id);
        persona.lastUpdatedAt = new Date().toISOString();

        try {
          await this.savePersonaToFile(persona.id);
        } catch (error) {
          console.error(
            `Error saving updated persona ${persona.id} after deleting micro-persona ${id}:`,
            error
          );
        }
      }
    }
    return true;
  }

  public async savePersonaToFile(
    personaId: string,
    format: PersonaFileFormat = PersonaFileFormat.JSON,
    customFilePath?: string
  ): Promise<string> {
    await this.ensureInitialized();
    const persona = this.personas.get(personaId);
    if (!persona) throw new Error(`Persona with ID ${personaId} not found.`);

    const effectiveFormat = format;

    let content: string;
    if (effectiveFormat === PersonaFileFormat.JSON) {
      content = JSON.stringify(persona, null, 2);
    } else {
      content = yaml.dump(persona);
    }

    let finalFilePath: string;
    if (customFilePath) {
      finalFilePath = customFilePath;
      const dir = path.dirname(finalFilePath);
      await fsExtra.ensureDir(dir);
    } else {
      const fileName = `${personaId}.${effectiveFormat}`;
      finalFilePath = path.join(this.personasDirectory, fileName);
    }

    await fsExtra.writeFile(finalFilePath, content);
    console.log(
      `Saved persona ${personaId} to ${finalFilePath} (format: ${effectiveFormat})`
    );
    return finalFilePath;
  }

  public async saveMicroPersonaToFile(
    microPersonaId: string,
    format: PersonaFileFormat = PersonaFileFormat.JSON
  ): Promise<string> {
    await this.ensureInitialized();
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

    // Initialize score manager if available
    if (personaScoreManager) {
      await personaScoreManager.init();
    }

    // Get all personas as candidates
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
    const scoreResults: (PersonaScore | null)[] = await Promise.all(
      candidatePersonas.map(async (p) => {
        if (this.useUpstash) {
          return await UpstashPersonaScore.loadPersonaScore(p.id);
        } else if (personaScoreManager) {
          return (await personaScoreManager.getScore(
            p.id
          )) as PersonaScore | null;
        }
        return null;
      })
    );

    let bestMatch: {
      persona: PersonaDefinition;
      microPersona?: MicroPersonaDefinition;
      scoreData?: PersonaScore | null;
      composedPersona: PersonaDefinition;
      matchReason: string;
      score: number;
    } | null = null;

    let highestScore = -Infinity;

    // Find the best match
    for (let i = 0; i < candidatePersonas.length; i++) {
      const p = candidatePersonas[i];
      const currentPersonaScore = scoreResults[i];
      let currentOverallScore = currentPersonaScore?.overall_score ?? 0.5;
      let matchReason = 'Highest overall score';

      // Find the best micro-persona for this persona
      let bestMicroPersona: MicroPersonaDefinition | undefined = undefined;
      let bestMicroScore = -1;

      if (p.compatibleMicroPersonas && p.compatibleMicroPersonas.length > 0) {
        for (const microId of p.compatibleMicroPersonas) {
          let micro: MicroPersonaDefinition | null = null;

          if (this.useUpstash) {
            micro = await UpstashPersonaStore.loadMicroPersona(microId);
          } else {
            micro = this.microPersonas.get(microId) || null;
          }

          if (micro) {
            let microScoreData: PersonaScore | null = null;

            if (this.useUpstash) {
              microScoreData = await UpstashPersonaScore.loadPersonaScore(
                micro.id
              );
            } else if (personaScoreManager) {
              microScoreData = (await personaScoreManager.getScore(
                micro.id
              )) as PersonaScore | null;
            }

            const microOverallScore = microScoreData?.overall_score ?? 0.5;
            if (microOverallScore > bestMicroScore) {
              bestMicroScore = microOverallScore;
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
