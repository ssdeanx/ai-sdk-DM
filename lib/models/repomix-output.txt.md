This file is a merged representation of a subset of the codebase, containing specifically included files, combined into a single document by Repomix.
The content has been processed where empty lines have been removed, content has been formatted for parsing in markdown style, content has been compressed (code blocks are separated by ⋮---- delimiter).

# File Summary

## Purpose
This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
4. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Only files matching these patterns are included: lib/models
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Empty lines have been removed from all files
- Content has been formatted for parsing in markdown style
- Content has been compressed - code blocks are separated by ⋮---- delimiter
- Files are sorted by Git change count (files with more changes are at the bottom)

## Additional Info

# Directory Structure
```
lib/models/model-registry.ts
lib/models/model-service.ts
```

# Files

## File: lib/models/model-registry.ts
```typescript
/**
 * Model Registry
 *
 * This module provides a centralized registry for AI models with Zod schemas for type safety.
 * It includes model configurations, provider settings, and utility functions for model management.
 *
 * @module model-registry
 */
import { z } from 'zod';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { customProvider, wrapLanguageModel, type LanguageModelV1Middleware, type LanguageModel } from 'ai';
// --- Zod Schemas ---
/**
 * Schema for model provider
 */
⋮----
export type ModelProvider = z.infer<typeof ModelProviderSchema>;
/**
 * Schema for model capabilities
 */
⋮----
export type ModelCapabilities = z.infer<typeof ModelCapabilitiesSchema>;
/**
 * Schema for model category
 */
⋮----
export type ModelCategory = z.infer<typeof ModelCategorySchema>;
/**
 * Schema for model settings
 */
⋮----
export type ModelSettings = z.infer<typeof ModelSettingsSchema>;
/**
 * Schema for model settings input (for creating a new model)
 */
⋮----
export type ModelSettingsInput = z.infer<typeof ModelSettingsInputSchema>;
/**
 * Schema for model settings update (for updating an existing model)
 */
⋮----
export type ModelSettingsUpdate = z.infer<typeof ModelSettingsUpdateSchema>;
// --- Provider Factory Functions ---
/**
 * Creates a Google AI provider with the given API key and base URL
 *
 * @param apiKey - API key for Google AI
 * @param baseURL - Optional base URL for Google AI
 * @returns Google AI provider
 */
export function createGoogleAIProvider(apiKey?: string, baseURL?: string)
/**
 * Creates an OpenAI provider with the given API key and base URL
 *
 * @param apiKey - API key for OpenAI
 * @param baseURL - Optional base URL for OpenAI
 * @returns OpenAI provider
 */
export function createOpenAIProvider(apiKey?: string, baseURL?: string)
/**
 * Creates an Anthropic provider with the given API key and base URL
 *
 * @param apiKey - API key for Anthropic
 * @param baseURL - Optional base URL for Anthropic
 * @returns Anthropic provider
 */
export function createAnthropicProvider(apiKey?: string, baseURL?: string)
// --- Model Registry ---
/**
 * Model registry class for managing AI models
 */
export class ModelRegistry
⋮----
/**
   * Creates a new ModelRegistry instance
   * @private
   */
private constructor()
⋮----
// Initialize providers
⋮----
/**
   * Gets the singleton instance of ModelRegistry
   *
   * @returns The ModelRegistry instance
   */
public static getInstance(): ModelRegistry
/**
   * Registers a model with the registry
   *
   * @param model - Model settings
   * @returns The registered model settings
   */
public registerModel(model: ModelSettings): ModelSettings
⋮----
// Validate model settings
⋮----
// Add model to registry
⋮----
/**
   * Gets a model from the registry
   *
   * @param modelId - Model ID
   * @returns The model settings or undefined if not found
   */
public getModel(modelId: string): ModelSettings | undefined
/**
   * Gets a provider for a model
   *
   * @param modelId - Model ID
   * @returns The provider or undefined if not found
   */
public getProvider(modelId: string): any
⋮----
// Get provider
⋮----
// Create provider if not found
⋮----
/**
   * Gets a language model for a model ID
   *
   * @param modelId - Model ID
   * @returns The language model or undefined if not found
   */
public getLanguageModel(modelId: string): any
⋮----
// Get language model
⋮----
// Apply middlewares if any
⋮----
/**
   * Creates a custom provider with specified language models
   *
   * @param models - Map of model IDs to language models
   * @param fallbackProvider - Optional fallback provider
   * @returns Custom provider
   */
public createCustomProvider(models: Record<string, any>, fallbackProvider?: any): any
/**
   * Registers a middleware for a model
   *
   * @param modelId - Model ID
   * @param middleware - Middleware to register
   */
public registerMiddleware(modelId: string, middleware: LanguageModelV1Middleware): void
⋮----
// Export singleton instance
```

## File: lib/models/model-service.ts
```typescript
/**
 * Model Service
 *
 * This module provides services for managing AI models with Supabase and Upstash integration.
 * It includes functions for CRUD operations on models and model configurations.
 *
 * @module model-service
 */
import { getData, getItemById, createItem, updateItem, deleteItem } from '../memory/upstash/supabase-adapter';
import { upstashLogger } from '../memory/upstash/upstash-logger';
import { ModelSettings, ModelSettingsInput, ModelSettingsUpdate } from '../../types/model-settings';
import { ModelSettingsSchema } from './model-registry';
import { generateId } from 'ai';
import { modelRegistry } from './model-registry';
import { z } from 'zod';
// Define Zod schema for database options
⋮----
// Define Zod schema for Supabase model
⋮----
// Helper to convert filters from Record<string, any> to FilterOptions[]
function convertFilters(filters?: Record<string, unknown>): Array<
// Helper to wrap errors for logger
function toLoggerError(err: unknown): Error |
// Helper to normalize provider field to valid ModelProvider
function normalizeProvider(model: Record<string, unknown>): void
// Type guard to validate provider
function isValidProvider(provider: unknown): provider is 'google' | 'openai' | 'anthropic'
// --- Error Handling ---
/**
 * Error class for model service operations
 */
export class ModelServiceError extends Error
⋮----
/**
   * Creates a new ModelServiceError
   *
   * @param message - Error message
   * @param cause - Optional cause of the error
   */
constructor(message: string, public cause?: unknown)
⋮----
// --- Model Service Functions ---
/**
 * Gets all models from the database
 *
 * @param options - Optional filtering and sorting options
 * @returns Promise resolving to an array of models
 * @throws ModelServiceError if fetching fails
 */
export async function getAllModels(options?: z.infer<typeof DatabaseOptionsSchema>): Promise<ModelSettings[]>
⋮----
// Convert filters to correct format for QueryOptions
⋮----
/**
 * Gets a model by ID
 *
 * @param id - Model ID
 * @returns Promise resolving to the model or null if not found
 * @throws ModelServiceError if fetching fails
 */
export async function getModelById(id: string): Promise<ModelSettings | null>
/**
 * Gets a model by model_id (e.g., "gpt-4", "gemini-1.5-pro")
 *
 * @param modelId - Model ID string
 * @returns Promise resolving to the model or null if not found
 * @throws ModelServiceError if fetching fails
 */
export async function getModelByModelId(modelId: string): Promise<ModelSettings | null>
/**
 * Creates a new model
 *
 * @param model - Model data
 * @returns Promise resolving to the created model
 * @throws ModelServiceError if creation fails
 */
export async function createModel(model: ModelSettingsInput): Promise<ModelSettings>
⋮----
// Patch: convert only DB string fields to string
⋮----
/**
 * Updates a model
 *
 * @param id - Model ID
 * @param updates - Model updates
 * @returns Promise resolving to the updated model
 * @throws ModelServiceError if update fails
 */
export async function updateModel(id: string, updates: ModelSettingsUpdate): Promise<ModelSettings>
⋮----
// Patch: Only allow valid ModelProvider values
⋮----
/**
 * Deletes a model
 *
 * @param id - Model ID
 * @returns Promise resolving to true if successful
 * @throws ModelServiceError if deletion fails
 */
export async function deleteModel(id: string): Promise<boolean>
/**
 * Gets a language model for a model ID
 *
 * @param modelId - Model ID
 * @returns Promise resolving to the language model
 * @throws ModelServiceError if model not found
 */
export async function getLanguageModel(modelId: string): Promise<any>
```
