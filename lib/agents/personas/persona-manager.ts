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
export class PersonaManager {
  private personas: Map<string, PersonaDefinition> = new Map();
  private microPersonas: Map<string, MicroPersonaDefinition> = new Map();
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;
  public readonly personasDirectory: string;

  constructor(personasDir?: string) {
    this.personasDirectory = personasDir || path.resolve(process.cwd(), 'lib', 'agents', 'personas', 'personasData');
    fsExtra.ensureDirSync(this.personasDirectory);
  }

  private async loadPersonasFromDirectory(): Promise<void> {
    if (!fsExtra.existsSync(this.personasDirectory)) {
      console.warn(`Personas directory does not exist: ${this.personasDirectory}`);
      return;
    }
    const files = await fsExtra.readdir(this.personasDirectory);
    for (const file of files) {
      const filePath = path.join(this.personasDirectory, file);
      const stat = await fsExtra.stat(filePath);
      if (stat.isDirectory()) continue;

      try {
        const content = await fsExtra.readFile(filePath, 'utf-8');
        const data: any = file.endsWith('.json') ? JSON.parse(content) : (file.endsWith('.yaml') || file.endsWith('.yml')) ? yaml.load(content) : null;

        if (!data) {
          console.warn(`Skipping file with unsupported extension or empty content: ${file}`);
          continue;
        }

        if (data.promptFragment || data.parentPersonaId || file.startsWith('micro_') || data.microTraits) {
          const microPersona = validateMicroPersonaDefinition(data);
          this.registerMicroPersona(microPersona, false);
        } else {
          const persona = validatePersonaDefinition(data);
          this.registerPersona(persona, false);
        }
      } catch (error: any) {
        console.error(`Error loading persona from ${file}: ${error.message}`);
        if (error.errors) {
          console.error('Validation details:', JSON.stringify(error.errors, null, 2));
        }
      }
    }
  }

  public async init(forceUpdate: boolean = false): Promise<void> {
    if (this.initialized && !forceUpdate && !this.initPromise) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      this.personas.clear();
      this.microPersonas.clear();

      Object.values(basePersonas).forEach((p: PersonaDefinition) => this.registerPersona(p, false));
      Object.values(specializedPersonas).forEach((p: PersonaDefinition) => this.registerPersona(p, false));
      Object.values(domainPersonas).forEach((p: PersonaDefinition) => this.registerPersona(p, false));
      Object.values(taskPersonas).forEach((p: PersonaDefinition) => this.registerPersona(p, false));

      await this.loadPersonasFromDirectory();

      this.initialized = true;
      this.initPromise = null;
      console.log(`PersonaManager initialized. Loaded ${this.personas.size} personas and ${this.microPersonas.size} micro-personas.`);
    })();
    return this.initPromise;
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized && !this.initPromise) {
      await this.init();
    } else if (this.initPromise) {
      await this.initPromise;
    }
  }

  public async registerPersona(personaData: PersonaDefinition, saveToFile: boolean = true): Promise<PersonaDefinition> {
    await this.ensureInitialized();
    // personaData is assumed to have a valid id due to prior validation or creation processes.
    // The Zod schema for PersonaDefinition ensures 'id' is a non-empty string.
    this.personas.set(personaData.id, personaData);
    if (saveToFile) {
      await this.savePersonaToFile(personaData.id);
    }
    return personaData;
  }

  public async registerMicroPersona(microPersonaData: MicroPersonaDefinition, saveToFile: boolean = true): Promise<MicroPersonaDefinition> {
    await this.ensureInitialized();
    // microPersonaData is assumed to have a valid id due to prior validation or creation processes.
    // The Zod schema for MicroPersonaDefinition ensures 'id' is a non-empty string.
    this.microPersonas.set(microPersonaData.id, microPersonaData);
    if (saveToFile) {
      await this.saveMicroPersonaToFile(microPersonaData.id);
    }
    return microPersonaData;
  }

  public async getPersonaById(id: string): Promise<PersonaDefinition | null> {
    await this.ensureInitialized();
    return this.personas.get(id) || null;
  }

  public async getMicroPersonaById(id: string): Promise<MicroPersonaDefinition | null> {
    await this.ensureInitialized();
    return this.microPersonas.get(id) || null;
  }

  public async listPersonas(): Promise<PersonaDefinition[]> {
    await this.ensureInitialized();
    return Array.from(this.personas.values());
  }

  public async listMicroPersonas(): Promise<MicroPersonaDefinition[]> {
    await this.ensureInitialized();
    return Array.from(this.microPersonas.values());
  }

  public async createPersona(personaData: Omit<PersonaDefinition, 'id' | 'createdAt' | 'lastUpdatedAt' | 'version'> & { version?: string }, saveToFile: boolean = true): Promise<PersonaDefinition> {
    const newPersona: PersonaDefinition = validatePersonaDefinition({
      ...personaData,
      id: uuidv4(),
      version: personaData.version || '1.0.0',
      createdAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
    });
    return this.registerPersona(newPersona, saveToFile);
  }

  public async createMicroPersona(microPersonaData: Omit<MicroPersonaDefinition, 'id' | 'createdAt' | 'lastUpdatedAt' | 'version'> & { version?: string }, saveToFile: boolean = true): Promise<MicroPersonaDefinition> {
    const newMicroPersona: MicroPersonaDefinition = validateMicroPersonaDefinition({
      ...microPersonaData,
      id: `micro_${uuidv4()}`,
      version: microPersonaData.version || '1.0.0',
      createdAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
    });
    return this.registerMicroPersona(newMicroPersona, saveToFile);
  }

  public async updatePersona(id: string, updates: Partial<Omit<PersonaDefinition, 'id' | 'createdAt'>>): Promise<PersonaDefinition | null> {
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

  public async updateMicroPersona(id: string, updates: Partial<Omit<MicroPersonaDefinition, 'id' | 'createdAt' | 'parentPersonaId'>>): Promise<MicroPersonaDefinition | null> {
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

    const formats: PersonaFileFormat[] = [PersonaFileFormat.JSON, PersonaFileFormat.YAML, PersonaFileFormat.YML];
    if (this.personas.delete(id)) {
      for (const format of formats) {
        const filePath = path.join(this.personasDirectory, `${id}.${format}`);
        if (await fsExtra.pathExists(filePath)) await fsExtra.remove(filePath);
      }

      const microsToDelete = Array.from(this.microPersonas.values()).filter(mp => mp.parentPersonaId === id);
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

    const formats: PersonaFileFormat[] = [PersonaFileFormat.JSON, PersonaFileFormat.YAML, PersonaFileFormat.YML];
    for (const format of formats) {
      const filePath = path.join(this.personasDirectory, `${id}.${format}`);
      try {
        if (await fsExtra.pathExists(filePath)) {
          await fsExtra.remove(filePath);
        }
      } catch (error) {
        console.error(`Error removing file ${filePath} for micro-persona ${id}:`, error);
      }
    }

    for (const persona of this.personas.values()) {
      if (persona.compatibleMicroPersonas && persona.compatibleMicroPersonas.includes(id)) {
        persona.compatibleMicroPersonas = persona.compatibleMicroPersonas.filter(mpId => mpId !== id);
        persona.lastUpdatedAt = new Date().toISOString();

        try {
          await this.savePersonaToFile(persona.id);
        } catch (error) {
          console.error(`Error saving updated persona ${persona.id} after deleting micro-persona ${id}:`, error);
        }
      }
    }
    return true;
  }

  public async savePersonaToFile(personaId: string, format: PersonaFileFormat = PersonaFileFormat.JSON, customFilePath?: string): Promise<string> {
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
    console.log(`Saved persona ${personaId} to ${finalFilePath} (format: ${effectiveFormat})`);
    return finalFilePath;
  }

  public async saveMicroPersonaToFile(microPersonaId: string, format: PersonaFileFormat = PersonaFileFormat.JSON): Promise<string> {
    await this.ensureInitialized();
    const microPersona = this.microPersonas.get(microPersonaId);
    if (!microPersona) throw new Error(`Micro-persona with ID ${microPersonaId} not found.`);

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
    const composed = microPersona ? composePersona(basePersona, microPersona) : basePersona;
    let prompt = composed.systemPromptTemplate;

    if (composed.traits) {
      prompt = prompt.replace(/\{\{traits\}\}/g, composed.traits.join(', '));
    }
    if (microPersona && microPersona.microTraits) {
      prompt = prompt.replace(/\{\{microTraits\}\}/g, microPersona.microTraits.join(', '));
    }
    if (dynamicContext) {
      for (const key in dynamicContext) {
        prompt = prompt.replace(new RegExp(`\\{\\{dynamicContext.${key}\\}\\}`, 'g'), dynamicContext[key]);
      }
    }

    Object.entries(composed).forEach(([key, value]) => {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        prompt = prompt.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
      }
    });
    if (microPersona) {
      Object.entries(microPersona).forEach(([key, value]) => {
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          prompt = prompt.replace(new RegExp(`\\{\\{microPersona.${key}\\}\\}`, 'g'), String(value));
        }
      });
    }
    return prompt;
  }

  public async getPersonaRecommendation(options: {
    taskType?: string;
    userPreferences?: Record<string, any>;
    requiredCapabilities?: GeminiCapability[];
    userId?: string;
  }): Promise<{ persona: PersonaDefinition; microPersona?: MicroPersonaDefinition; scoreData?: PersonaScore | null; composedPersona: PersonaDefinition } | null> {
    await this.ensureInitialized();
    if (personaScoreManager) {
      await personaScoreManager.init();
    }

    let candidatePersonas = Array.from(this.personas.values());

    if (options.requiredCapabilities && options.requiredCapabilities.length > 0) {
      candidatePersonas = candidatePersonas.filter(p =>
        options.requiredCapabilities!.every(cap => p.capabilities?.includes(cap))
      );
    }

    if (options.taskType) {
      candidatePersonas = candidatePersonas.filter(p =>
        p.tags?.includes(`task:${options.taskType}`) || p.tags?.includes(options.taskType!)
      );
    }

    if (candidatePersonas.length === 0) return null;

    const scoreResults: (unknown | null)[] = await Promise.all(
      candidatePersonas.map(p => personaScoreManager ? personaScoreManager.getScore(p.id) : Promise.resolve(null))
    );

    let bestMatch: { persona: PersonaDefinition; microPersona?: MicroPersonaDefinition; scoreData?: PersonaScore | null; composedPersona: PersonaDefinition } | null = null;
    let highestScore = -Infinity;

    for (let i = 0; i < candidatePersonas.length; i++) {
      const p = candidatePersonas[i];
      const currentPersonaScore: PersonaScore | null = scoreResults[i] as PersonaScore | null;
      let currentOverallScore = currentPersonaScore?.overall_score ?? 0.5;

      let bestMicroPersona: MicroPersonaDefinition | undefined = undefined;
      let bestMicroScore = -1;

      if (p.compatibleMicroPersonas && p.compatibleMicroPersonas.length > 0) {
        for (const microId of p.compatibleMicroPersonas) {
          const micro = this.microPersonas.get(microId);
          if (micro) {
            const microScoreDataUnk = personaScoreManager ? await personaScoreManager.getScore(micro.id) : null;
            const microScoreData = microScoreDataUnk as PersonaScore | null;
            const microOverallScore = microScoreData?.overall_score ?? 0.5;
            if (microOverallScore > bestMicroScore) {
              bestMicroScore = microOverallScore;
              bestMicroPersona = micro;
            }
          }
        }
      }

      if (bestMicroPersona && bestMicroScore > -1) {
        currentOverallScore = (currentOverallScore + bestMicroScore) / 2;
      }

      if (currentOverallScore > highestScore) {
        highestScore = currentOverallScore;
        const composed = bestMicroPersona ? composePersona(p, bestMicroPersona) : p;
        bestMatch = { persona: p, microPersona: bestMicroPersona, scoreData: currentPersonaScore, composedPersona: composed };
      }
    }
    return bestMatch;
  }

  public getAgentPersona(personaDef: PersonaDefinition, microDef?: MicroPersonaDefinition, dynamicContext?: Record<string, string>): AgentPersona {
    const composed = microDef ? composePersona(personaDef, microDef) : personaDef;

    const agentCapabilities: AgentPersona['capabilities'] = {};
    if (composed.capabilities) {
      for (const cap of composed.capabilities) {
        switch (cap) {
          case GeminiCapability.TEXT_GENERATION: agentCapabilities.text = true; break;
          case GeminiCapability.MULTIMODAL_UNDERSTANDING:
            agentCapabilities.vision = true;
            agentCapabilities.audio = true;
            break;
          case GeminiCapability.FUNCTION_CALLING:
          case GeminiCapability.TOOL_USE:
            agentCapabilities.functions = true; break;
          case GeminiCapability.JSON_MODE: agentCapabilities.json_mode = true; break;
          case GeminiCapability.TUNING: agentCapabilities.fine_tuning = true; break;
          case GeminiCapability.THINKING: agentCapabilities.thinking = true; break;
          case GeminiCapability.SEARCH_GROUNDING: agentCapabilities.search_grounding = true; break;
          case GeminiCapability.CACHING: agentCapabilities.cached_content = true; break;
          case GeminiCapability.CODE_EXECUTION: agentCapabilities.code_execution = true; break;
          case GeminiCapability.STRUCTURED_OUTPUTS: agentCapabilities.structured_output = true; break;
          case GeminiCapability.IMAGE_GENERATION: agentCapabilities.image_generation = true; break;
          case GeminiCapability.AUDIO_GENERATION: agentCapabilities.audio_generation = true; break;
        }
      }
    }

    return {
      id: composed.id,
      name: composed.name,
      description: composed.description || '',
      systemPromptTemplate: this.generateSystemPrompt(personaDef, microDef, dynamicContext),
      modelSettings: composed.modelSettings || {},
      capabilities: Object.keys(agentCapabilities).length > 0 ? agentCapabilities : undefined,
    };
  }
}

export const personaManager = new PersonaManager();
