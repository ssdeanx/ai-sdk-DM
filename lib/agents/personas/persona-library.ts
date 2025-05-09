/**
 * Persona Library for Google AI Models
 *
 * This module provides a collection of pre-configured personas optimized for Google's
 * Gemini models. Each persona includes a system prompt template and model settings
 * tailored for specific use cases.
 *
 * The library can be used with the PersonaManager to create and manage agent personas.
 */

import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs if needed

// --- Enums ---

/**
 * Gemini model safety category types
 */
export enum GeminiSafetyCategory {
  HARM_CATEGORY_UNSPECIFIED = "HARM_CATEGORY_UNSPECIFIED",
  HARM_CATEGORY_HATE_SPEECH = "HARM_CATEGORY_HATE_SPEECH",
  HARM_CATEGORY_DANGEROUS_CONTENT = "HARM_CATEGORY_DANGEROUS_CONTENT",
  HARM_CATEGORY_HARASSMENT = "HARM_CATEGORY_HARASSMENT",
  HARM_CATEGORY_SEXUALLY_EXPLICIT = "HARM_CATEGORY_SEXUALLY_EXPLICIT",
  HARM_CATEGORY_CIVIC_INTEGRITY = "HARM_CATEGORY_CIVIC_INTEGRITY",
}

/**
 * Gemini model safety threshold types
 */
export enum GeminiSafetyThreshold {
  HARM_BLOCK_THRESHOLD_UNSPECIFIED = "HARM_BLOCK_THRESHOLD_UNSPECIFIED",
  BLOCK_LOW_AND_ABOVE = "BLOCK_LOW_AND_ABOVE",
  BLOCK_MEDIUM_AND_ABOVE = "BLOCK_MEDIUM_AND_ABOVE",
  BLOCK_ONLY_HIGH = "BLOCK_ONLY_HIGH",
  BLOCK_NONE = "BLOCK_NONE", // Changed from OFF to BLOCK_NONE for clarity with some APIs
}

/**
 * Gemini model capabilities
 */
export enum GeminiCapability {
  // Official Gemini capabilities
  STRUCTURED_OUTPUTS = "structured-outputs",
  CACHING = "caching",
  TUNING = "tuning",
  FUNCTION_CALLING = "function-calling",
  CODE_EXECUTION = "code-execution",
  SEARCH_GROUNDING = "search-grounding",
  IMAGE_GENERATION = "image-generation",
  AUDIO_GENERATION = "audio-generation",
  LIVE_API = "live-api",
  THINKING = "thinking",
  SYSTEM_INSTRUCTIONS = "system-instructions",
  JSON_MODE = "json-mode",
  JSON_SCHEMA = "json-schema",

  // General capabilities
  TEXT_GENERATION = "text-generation",
  TOOL_USE = "tool-use", // Alias for function-calling
  REASONING = "reasoning",
  ADVANCED_REASONING = "advanced-reasoning",
  MULTIMODAL_UNDERSTANDING = "multimodal-understanding",
  EXPLANATION = "explanation",

  // Code and technical capabilities
  CODE_GENERATION = "code-generation",
  DEBUGGING = "debugging",
  TECHNICAL_EXPLANATION = "technical-explanation",
  TECHNICAL_WRITING = "technical-writing",
  TECHNICAL_PLANNING = "technical-planning",
  SYSTEM_DESIGN = "system-design",
  ARCHITECTURE = "architecture",
  ORGANIZATION = "organization",
  SECURE_CODING = "secure-coding",
  SECURITY = "security",
  VULNERABILITY_ASSESSMENT = "vulnerability-assessment",
  DEVOPS = "devops",
  INFRASTRUCTURE = "infrastructure",
  AUTOMATION = "automation",

  // Creative capabilities
  CREATIVE_WRITING = "creative-writing",
  STORYTELLING = "storytelling",
  CONTENT_GENERATION = "content-generation",

  // Analytical capabilities
  RESEARCH = "research",
  ANALYSIS = "analysis",
  CRITICAL_THINKING = "critical-thinking",
  DATA_ANALYSIS = "data-analysis",
  STATISTICS = "statistics",
  VISUALIZATION = "visualization",
  MACHINE_LEARNING = "machine-learning",
  DEEP_LEARNING = "deep-learning",
  AI_DEVELOPMENT = "ai-development",

  // Business & Domain Specific
  FINANCIAL_ANALYSIS = "financial-analysis",
  LEGAL_ASSISTANCE = "legal-assistance",
  MEDICAL_INFORMATION = "medical-information", // Use with caution
  EDUCATIONAL_TUTORING = "educational-tutoring",
  PROJECT_MANAGEMENT = "project-management",
}

/**
 * Gemini model ID types with their capabilities and token limits
 */
export type GeminiModelId =
  // Gemini 2.5 Pro Preview (May 2025)
  | "models/gemini-2.5-pro-preview-05-06"
  // Gemini 2.5 Flash Preview (April 2025)
  | "models/gemini-2.5-flash-preview-04-17"
  // Gemini 2.0 Flash (February 2025)
  | "models/gemini-2.0-flash"
  // Gemini 2.0 Flash Experimental (Image Generation)
  | "models/gemini-2.0-flash-exp"
  // Gemini 2.0 Flash Experimental (Image Generation - explicit name)
  | "models/gemini-2.0-flash-exp-image-generation"
  // Gemini 2.0 Flash Thinking Experimental
  | "models/gemini-2.0-flash-thinking-exp-01-21"
  // Gemini 2.0 Flash-Lite (February 2025)
  | "models/gemini-2.0-flash-lite"
  // Gemini 1.5 Flash (September 2024)
  | "models/gemini-1.5-flash"
  // Gemini 1.5 Flash-8B (October 2024)
  | "models/gemini-1.5-flash-8b"
  // Gemini 1.5 Pro (September 2024)
  | "models/gemini-1.5-pro"
  | string; // Allow custom model IDs

export const GeminiModelIdSchema = z.string().describe("A valid Gemini Model ID, e.g., 'models/gemini-1.5-pro'");

// --- Zod Schemas for Persona Definitions ---

/**
 * Zod schema for individual safety settings
 */
export const SafetySettingSchema = z.object({
  category: z.nativeEnum(GeminiSafetyCategory),
  threshold: z.nativeEnum(GeminiSafetyThreshold),
});
export type SafetySetting = z.infer<typeof SafetySettingSchema>;

/**
 * Zod schema for example dialogues
 */
export const ExampleDialogueSchema = z.object({
  user: z.string().min(1),
  assistant: z.string().min(1),
});
export type ExampleDialogue = z.infer<typeof ExampleDialogueSchema>;

/**
 * Zod schema for base persona definition
 */
export const PersonaDefinitionSchema = z.object({
  id: z.string().min(1, "ID is required").default(() => uuidv4()),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  systemPromptTemplate: z.string().min(1, "System prompt template is required"),
  modelSettings: z.record(z.any()).optional().describe("e.g., { temperature: 0.7, topP: 0.9 }"),
  traits: z.array(z.string()).optional().describe("e.g., ['concise', 'empathetic', 'technical']"),
  capabilities: z.array(z.nativeEnum(GeminiCapability)).optional(),
  safetySettings: z.array(SafetySettingSchema).optional(),
  version: z.string().optional().describe("e.g., '1.0.0'"),
  tags: z.array(z.string()).optional().describe("e.g., ['customer-support', 'developer-tool']"),
  exampleDialogues: z.array(ExampleDialogueSchema).optional(),
  knowledgeBaseIds: z.array(z.string()).optional().describe("IDs of knowledge bases to use"),
  preferredModels: z.array(GeminiModelIdSchema).optional().describe("Ordered list of preferred model IDs"),
  metadata: z.record(z.any()).optional().describe("Any other custom metadata"),
  compatibleMicroPersonas: z.array(z.string()).optional().describe("IDs of compatible micro-personas"),
  lastUpdatedAt: z.string().datetime().optional().default(() => new Date().toISOString()),
  createdAt: z.string().datetime().optional().default(() => new Date().toISOString()),
});
export type PersonaDefinition = z.infer<typeof PersonaDefinitionSchema>;

/**
 * Zod schema for micro-persona definition
 */
export const MicroPersonaDefinitionSchema = z.object({
  id: z.string().min(1, "ID is required").default(() => `micro-${uuidv4()}`),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  parentPersonaId: z.string().min(1, "Parent Persona ID is required").optional(),
  promptFragment: z.string().min(1, "Prompt fragment is required to augment or replace parts of the base prompt"),
  modelSettingsOverrides: z.record(z.any()).optional().describe("e.g., { temperature: 0.5 }"),
  tags: z.array(z.string()).optional().describe("e.g., ['humor', 'conciseness']"),
  microTraits: z.array(z.string()).optional().describe("Specific traits for this micro-persona, e.g., ['sarcastic', 'formal']"),
  conflictingMicroPersonaIds: z.array(z.string()).optional().describe("IDs of micro-personas that should not be used with this one"),
  requiredCapabilities: z.array(z.nativeEnum(GeminiCapability)).optional().describe("Capabilities specifically required or enhanced by this micro-persona"),
  metadata: z.record(z.any()).optional().describe("Any other custom metadata for the micro-persona"),
  version: z.string().optional().describe("e.g., '1.0.0'"), // Added version field
  // Overrides for specific fields of the base persona
  overrides: z.object({
    systemPromptTemplate: z.string().optional().describe("Completely replaces the base system prompt if provided"),
    modelSettings: z.record(z.any()).optional().describe("Merges with and overrides base model settings"),
    traits: z.array(z.string()).optional().describe("Adds to or replaces base traits"),
    capabilities: z.array(z.nativeEnum(GeminiCapability)).optional().describe("Adds to or replaces base capabilities"),
    safetySettings: z.array(SafetySettingSchema).optional().describe("Replaces base safety settings"),
    tags: z.array(z.string()).optional().describe("Adds to or replaces base tags"),
    exampleDialogues: z.array(ExampleDialogueSchema).optional().describe("Replaces base example dialogues"),
    knowledgeBaseIds: z.array(z.string()).optional().describe("Adds to or replaces base knowledge base IDs"),
    preferredModels: z.array(GeminiModelIdSchema).optional().describe("Replaces base preferred models"),
    metadata: z.record(z.any()).optional().describe("Merges with and overrides base metadata"),
  }).optional(),
  lastUpdatedAt: z.string().datetime().optional().default(() => new Date().toISOString()),
  createdAt: z.string().datetime().optional().default(() => new Date().toISOString()),
});
export type MicroPersonaDefinition = z.infer<typeof MicroPersonaDefinitionSchema>;

// --- Validation Functions ---

/**
 * Validates persona definition data.
 * @param data - The data to validate.
 * @returns The validated persona definition.
 * @throws ZodError if validation fails.
 */
export function validatePersonaDefinition(data: unknown): PersonaDefinition {
  const result = PersonaDefinitionSchema.safeParse(data);
  if (!result.success) {
    console.error("PersonaDefinition validation failed:", result.error.flatten().fieldErrors);
    throw result.error;
  }
  return result.data;
}

/**
 * Validates micro-persona definition data.
 * @param data - The data to validate.
 * @returns The validated micro-persona definition.
 * @throws ZodError if validation fails.
 */
export function validateMicroPersonaDefinition(data: unknown): MicroPersonaDefinition {
  const result = MicroPersonaDefinitionSchema.safeParse(data);
  if (!result.success) {
    console.error("MicroPersonaDefinition validation failed:", result.error.flatten().fieldErrors);
    throw result.error;
  }
  return result.data;
}

// --- Composition Function ---

/**
 * Composes a full persona from a base persona and an optional micro-persona.
 * If a micro-persona is provided, its overrides and specific fields are merged
 * with the base persona to create a new, specialized persona definition.
 *
 * @param basePersona - The base persona definition.
 * @param microPersona - The micro-persona definition (optional).
 * @returns The composed PersonaDefinition.
 */
export function composePersona(
  basePersonaInput: PersonaDefinition,
  microPersonaInput?: MicroPersonaDefinition,
): PersonaDefinition {
  // Ensure inputs are validated copies to prevent accidental mutation of original library objects
  const basePersona = validatePersonaDefinition(JSON.parse(JSON.stringify(basePersonaInput)));
  
  if (!microPersonaInput) {
    return basePersona;
  }
  const microPersona = validateMicroPersonaDefinition(JSON.parse(JSON.stringify(microPersonaInput)));

  const composed: PersonaDefinition = { ...basePersona };

  // ID and Name composition
  composed.id = microPersona.id; // Micro-persona ID becomes the composed ID
  composed.name = `${basePersona.name} (${microPersona.name})`;

  // Description composition
  let microDesc = microPersona.description ? `\nMicro-Context: ${microPersona.description}` : '';
  composed.description = `${basePersona.description || ''}${microDesc}`;


  // Apply overrides first
  if (microPersona.overrides) {
    if (microPersona.overrides.systemPromptTemplate) {
      composed.systemPromptTemplate = microPersona.overrides.systemPromptTemplate;
    } else if (microPersona.promptFragment) {
      // Append fragment if no full override
      composed.systemPromptTemplate = `${composed.systemPromptTemplate}\n\n${microPersona.promptFragment}`;
    }
    composed.modelSettings = { ...composed.modelSettings, ...microPersona.overrides.modelSettings };
    composed.traits = microPersona.overrides.traits ? Array.from(new Set([...(composed.traits || []), ...microPersona.overrides.traits])) : composed.traits;
    composed.capabilities = microPersona.overrides.capabilities ? Array.from(new Set([...(composed.capabilities || []), ...microPersona.overrides.capabilities])) : composed.capabilities;
    composed.safetySettings = microPersona.overrides.safetySettings || composed.safetySettings;
    composed.tags = microPersona.overrides.tags ? Array.from(new Set([...(composed.tags || []), ...microPersona.overrides.tags])) : composed.tags;
    composed.exampleDialogues = microPersona.overrides.exampleDialogues || composed.exampleDialogues;
    composed.knowledgeBaseIds = microPersona.overrides.knowledgeBaseIds ? Array.from(new Set([...(composed.knowledgeBaseIds || []), ...microPersona.overrides.knowledgeBaseIds])) : composed.knowledgeBaseIds;
    composed.preferredModels = microPersona.overrides.preferredModels || composed.preferredModels;
    composed.metadata = { ...composed.metadata, ...microPersona.overrides.metadata };
  } else if (microPersona.promptFragment) {
    // If no overrides object, but promptFragment exists, append it.
     composed.systemPromptTemplate = `${composed.systemPromptTemplate}\n\n${microPersona.promptFragment}`;
  }
  
  // Apply direct micro-persona fields (if not handled by overrides or if overrides don't exist)
  if (microPersona.modelSettingsOverrides && (!microPersona.overrides || !microPersona.overrides.modelSettings)) {
     composed.modelSettings = { ...composed.modelSettings, ...microPersona.modelSettingsOverrides };
  }
  if (microPersona.microTraits) {
    composed.traits = Array.from(new Set([...(composed.traits || []), ...microPersona.microTraits]));
  }
  if (microPersona.tags && (!microPersona.overrides || !microPersona.overrides.tags)) {
     composed.tags = Array.from(new Set([...(composed.tags || []), ...microPersona.tags]));
  }
   if (microPersona.requiredCapabilities && (!microPersona.overrides || !microPersona.overrides.capabilities)) {
    composed.capabilities = Array.from(new Set([...(composed.capabilities || []), ...microPersona.requiredCapabilities]));
  }


  // Update metadata
  composed.metadata = {
    ...composed.metadata,
    basePersonaId: basePersona.id,
    microPersonaId: microPersona.id,
    ...(microPersona.metadata || {}),
  };
  
  composed.lastUpdatedAt = new Date().toISOString();

  return validatePersonaDefinition(composed); // Validate the final composed structure
}


// --- Zod Schemas for Persona Scoring ---

/**
 * Zod schema for persona score.
 * This structure would typically be stored in a database.
 */
export const PersonaScoreSchema = z.object({
  id: z.string().min(1).default(() => uuidv4()), // Score record ID
  persona_id: z.string().min(1), // ID of the PersonaDefinition or MicroPersonaDefinition
  usage_count: z.number().int().min(0).default(0),
  success_count: z.number().int().min(0).default(0), // Number of successful interactions
  failure_count: z.number().int().min(0).default(0), // Number of failed interactions
  success_rate: z.number().min(0).max(1).default(0), // Calculated: success_count / (success_count + failure_count)
  average_latency_ms: z.number().min(0).default(0).describe("Average response latency in milliseconds"),
  user_satisfaction_avg: z.number().min(0).max(5).default(0).describe("Average user satisfaction score (e.g., 1-5 scale)"),
  user_feedback_count: z.number().int().min(0).default(0), // How many times feedback was given
  adaptability_score: z.number().min(0).max(1).default(0).describe("Score indicating how well persona adapts to different contexts/tasks"),
  cost_per_interaction_avg: z.number().min(0).default(0).optional().describe("Average cost if token/cost tracking is implemented"),
  token_usage_avg: z.object({
    prompt_tokens: z.number().int().min(0).default(0),
    completion_tokens: z.number().int().min(0).default(0),
    total_tokens: z.number().int().min(0).default(0),
  }).optional().default({ prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }),
  overall_score: z.number().default(0).describe("Calculated overall performance score"),
  last_used_at: z.string().datetime().optional(),
  last_scored_at: z.string().datetime().optional(),
  metadata: z.record(z.any()).optional().describe("Additional metadata for scoring, e.g., version tested"),
  created_at: z.string().datetime().default(() => new Date().toISOString()),
  updated_at: z.string().datetime().default(() => new Date().toISOString()),
});
export type PersonaScore = z.infer<typeof PersonaScoreSchema>;

/**
 * Zod schema for score update data.
 */
export const ScoreUpdateDataSchema = z.object({
  successfulInteraction: z.boolean().optional(), // True if the interaction was successful
  latencyMs: z.number().int().min(0).optional(),
  userSatisfaction: z.number().min(0).max(5).optional(),
  adaptabilityFactor: z.number().min(-1).max(1).optional().describe("A factor indicating positive (1) or negative (-1) adaptation, or neutral (0)"),
  cost: z.number().min(0).optional(),
  tokens: z.object({
    prompt: z.number().int().min(0),
    completion: z.number().int().min(0),
  }).optional(),
  metadata: z.record(z.any()).optional(),
});
export type ScoreUpdateData = z.infer<typeof ScoreUpdateDataSchema>;

// --- Pre-defined Personas ---

export const basePersonas: Record<string, PersonaDefinition> = {
  neutralAssistant: validatePersonaDefinition({
    id: 'neutral-assistant',
    name: 'Neutral Assistant',
    description: 'A general-purpose AI assistant that provides neutral and objective responses.',
    systemPromptTemplate: 'You are a helpful and neutral AI assistant. Provide clear and concise answers. Respond factually and avoid expressing personal opinions unless explicitly asked for a subjective viewpoint clearly marked as such.',
    modelSettings: { temperature: 0.7, topP: 0.9 },
    traits: ['neutral', 'objective', 'clear', 'concise', 'factual'],
    preferredModels: ['models/gemini-1.5-flash', 'models/gemini-2.0-flash-lite'],
    version: '1.1.0',
    tags: ['general', 'assistant', 'factual'],
    capabilities: [GeminiCapability.TEXT_GENERATION, GeminiCapability.EXPLANATION],
  }),
  creativeWriter: validatePersonaDefinition({
    id: 'creative-writer',
    name: 'Creative Writer',
    description: 'An AI assistant specialized in generating creative content, stories, and scripts.',
    systemPromptTemplate: 'You are a highly creative AI writer. Generate imaginative and engaging content based on the user\'s request. Emphasize storytelling, vivid descriptions, and emotional depth. Feel free to explore unconventional ideas.',
    modelSettings: { temperature: 0.9, topP: 0.95 },
    traits: ['creative', 'imaginative', 'storyteller', 'expressive', 'artistic'],
    preferredModels: ['models/gemini-1.5-pro', 'models/gemini-2.5-pro-preview-05-06'],
    version: '1.1.0',
    tags: ['writing', 'creative', 'content-generation', 'storytelling'],
    capabilities: [GeminiCapability.CREATIVE_WRITING, GeminiCapability.STORYTELLING, GeminiCapability.TEXT_GENERATION],
    exampleDialogues: [
      { user: 'Write a short story about a dragon who loves to bake.', assistant: 'In a cozy cavern, warmed by his own gentle flames, lived Ignis, a dragon with a peculiar passion: baking. His massive claws, surprisingly deft, kneaded dough with the rhythm of an ancient song, and his fiery breath was carefully controlled to produce the perfect golden crust on his famous sunberry scones...' }
    ]
  }),
  technicalExpert: validatePersonaDefinition({
    id: 'technical-expert',
    name: 'Technical Expert',
    description: 'An AI assistant providing in-depth technical explanations and analysis.',
    systemPromptTemplate: 'You are a seasoned technical expert with deep knowledge in your domain. Provide precise, accurate, and detailed explanations. Cite sources or methodologies where appropriate. Break down complex topics into understandable components.',
    modelSettings: { temperature: 0.5, topP: 0.9 },
    traits: ['technical', 'analytical', 'precise', 'knowledgeable', 'methodical'],
    preferredModels: ['models/gemini-1.5-pro', 'models/gemini-2.5-pro-preview-05-06'],
    version: '1.0.0',
    tags: ['technical', 'expert', 'analysis', 'explanation'],
    capabilities: [GeminiCapability.TECHNICAL_EXPLANATION, GeminiCapability.ANALYSIS, GeminiCapability.ADVANCED_REASONING],
  }),
};

export const specializedPersonas: Record<string, PersonaDefinition> = {
  codeHelper: validatePersonaDefinition({
    id: 'code-helper',
    name: 'Code Helper',
    description: 'An AI assistant that helps with programming questions, debugging, and code generation across multiple languages.',
    systemPromptTemplate: 'You are an expert AI programming assistant. Provide accurate code examples, explain complex concepts clearly, and help debug issues. Prioritize correctness, efficiency, and adherence to best practices. When asked for code, provide it in the requested language, and if not specified, ask for clarification or choose a common language suitable for the task. Explain your code clearly.',
    modelSettings: { temperature: 0.5, topP: 0.85 },
    traits: ['technical', 'precise', 'helpful', 'coder', 'debugger'],
    preferredModels: ['models/gemini-1.5-pro', 'models/gemini-2.5-pro-preview-05-06'],
    version: '1.1.0',
    tags: ['programming', 'developer-tool', 'code', 'debugging', 'software-engineering'],
    capabilities: [
      GeminiCapability.CODE_GENERATION,
      GeminiCapability.DEBUGGING,
      GeminiCapability.TECHNICAL_EXPLANATION,
      GeminiCapability.FUNCTION_CALLING, // For potential tool use like running code snippets
      GeminiCapability.SYSTEM_INSTRUCTIONS,
      GeminiCapability.JSON_MODE, // For structured output if needed
    ],
    safetySettings: [
        { category: GeminiSafetyCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: GeminiSafetyThreshold.BLOCK_MEDIUM_AND_ABOVE }
    ],
    exampleDialogues: [
        { user: "How do I sort a list of dictionaries in Python by a specific key?", assistant: "You can sort a list of dictionaries in Python using the `sorted()` function with a `lambda` function as the `key`. For example, to sort by the 'age' key: `sorted_list = sorted(my_list, key=lambda x: x['age'])`."}
    ]
  }),
  customerSupportAgent: validatePersonaDefinition({
    id: 'customer-support-agent',
    name: 'Customer Support Agent',
    description: 'A friendly and empathetic AI agent for handling customer inquiries and support with a focus on resolution.',
    systemPromptTemplate: 'You are a friendly, patient, and highly helpful customer support agent. Your primary goal is to resolve customer issues effectively and efficiently. Listen carefully to customer concerns, provide clear, step-by-step solutions, and maintain a positive and empathetic tone throughout the interaction. If you cannot resolve an issue, explain why and clearly state the next steps or how to escalate the issue.',
    modelSettings: { temperature: 0.75, topP: 0.9 },
    traits: ['empathetic', 'patient', 'helpful', 'clear-communicator', 'problem-solver'],
    preferredModels: ['models/gemini-1.5-flash', 'models/gemini-2.0-flash'],
    version: '1.1.0',
    tags: ['customer-support', 'service', 'communication', 'problem-solving'],
    capabilities: [GeminiCapability.TEXT_GENERATION, GeminiCapability.EXPLANATION, GeminiCapability.FUNCTION_CALLING], // FUNCTION_CALLING for tools like order lookup
    safetySettings: [
      { category: GeminiSafetyCategory.HARM_CATEGORY_HARASSMENT, threshold: GeminiSafetyThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: GeminiSafetyCategory.HARM_CATEGORY_HATE_SPEECH, threshold: GeminiSafetyThreshold.BLOCK_MEDIUM_AND_ABOVE }
    ],
    exampleDialogues: [
        { user: "My order hasn't arrived yet, it's three days late!", assistant: "I'm so sorry to hear your order is delayed! I understand how frustrating that can be. Could you please provide me with your order number so I can check its status for you right away?"}
    ]
  }),
  researchAnalyst: validatePersonaDefinition({
    id: 'research-analyst',
    name: 'Research Analyst',
    description: 'An AI assistant for conducting research, summarizing information, and identifying key insights from various data sources.',
    systemPromptTemplate: 'You are a meticulous and insightful research analyst. Your task is to gather, synthesize, and analyze information from provided sources or by using available tools. Identify key findings, trends, and potential biases. Present your analysis in a clear, structured, and objective manner. Always cite your sources if information is retrieved externally.',
    modelSettings: { temperature: 0.6, topP: 0.9 },
    traits: ['analytical', 'meticulous', 'objective', 'insightful', 'researcher'],
    preferredModels: ['models/gemini-1.5-pro', 'models/gemini-2.5-pro-preview-05-06'],
    version: '1.0.0',
    tags: ['research', 'analysis', 'data', 'insights', 'reporting'],
    capabilities: [
        GeminiCapability.RESEARCH,
        GeminiCapability.ANALYSIS,
        GeminiCapability.CRITICAL_THINKING,
        GeminiCapability.TEXT_GENERATION,
        GeminiCapability.SEARCH_GROUNDING, // If model supports direct search
        GeminiCapability.FUNCTION_CALLING, // For custom search tools
    ],
  })
};

const personaLibrary = {
  basePersonas,
  specializedPersonas,
};

export default personaLibrary;
