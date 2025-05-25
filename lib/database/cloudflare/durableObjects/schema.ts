/**
 * Durable Object Schema Definitions
 *
 * Centralized schema definitions for all Cloudflare Durable Objects.
 * These schemas ensure type safety and validation across all DO operations.
 *
 * Generated on 2025-05-24
 */

import { z } from 'zod';

// =============================================================================
// Core Entity Schemas
// =============================================================================

/**
 * User schema
 */
export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
  avatarUrl: z.string().optional(),
  role: z.enum(['user', 'admin']).default('user'),
  status: z.enum(['active', 'inactive', 'suspended']).default('active'),
  passwordHash: z.string().optional(), // For local auth
  emailVerified: z.number().optional(), // NextAuth.js compat
  image: z.string().optional(), // NextAuth.js compat
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

/**
 * Apps schema for AppBuilder
 */
export const AppSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  type: z.string(),
  code: z.string(),
  parametersSchema: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

/**
 * App code blocks schema
 */
export const AppCodeBlockSchema = z.object({
  id: z.string(),
  appId: z.string(),
  language: z.string(),
  code: z.string(),
  description: z.string().optional(),
  order: z.number().default(0),
  createdAt: z.number(),
  updatedAt: z.number(),
});

/**
 * Integrations schema
 */
export const IntegrationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  provider: z.string(),
  name: z.string().optional(),
  config: z.record(z.unknown()).optional(),
  credentials: z.record(z.unknown()).optional(),
  status: z.enum(['active', 'inactive', 'error']).default('inactive'),
  lastSyncedAt: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

/**
 * Files schema for file tree
 */
export const FileSchema = z.object({
  id: z.string(),
  appId: z.string().optional(),
  parentId: z.string().optional(),
  name: z.string(),
  type: z.enum(['file', 'folder']),
  content: z.string().optional(),
  r2ObjectKey: z.string().optional(), // For Cloudflare R2
  r2Bucket: z.string().optional(),
  mimeType: z.string().optional(),
  size: z.number().optional(),
  userId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

/**
 * Terminal session schema
 */
export const TerminalSessionSchema = z.object({
  id: z.string(),
  appId: z.string().optional(),
  userId: z.string(),
  name: z.string().optional(),
  command: z.string().optional(),
  output: z.string().optional(),
  status: z
    .enum(['active', 'paused', 'terminated', 'error', 'pending'])
    .default('active'),
  environment: z.record(z.string()).optional(),
  workingDirectory: z.string().optional(),
  shell: z.string().default('/bin/bash'),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
  lastActivityAt: z.number().optional(),
});

/**
 * Workflow schema
 */
export const WorkflowSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  definition: z.record(z.unknown()).optional(),
  currentStepIndex: z.number().default(0),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']),
  userId: z.string().optional(),
  isActive: z.boolean().default(true),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

/**
 * AI Model schema
 */
export const ModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  providerId: z.string(),
  modelId: z.string(), // Provider's specific model ID
  maxTokens: z.number().default(8192),
  inputCostPerToken: z.number().default(0),
  outputCostPerToken: z.number().default(0),
  supportsVision: z.boolean().default(false),
  supportsFunctions: z.boolean().default(false),
  supportsStreaming: z.boolean().default(true),
  defaultTemperature: z.number().default(0.7),
  defaultTopP: z.number().default(1.0),
  defaultFrequencyPenalty: z.number().default(0.0),
  defaultPresencePenalty: z.number().default(0.0),
  contextWindow: z.number().default(8192),
  description: z.string().optional(),
  category: z.string().default('text'),
  capabilities: z.record(z.unknown()).default({}),
  baseUrl: z.string().optional(),
  apiKey: z.string().optional(),
  status: z.enum(['active', 'deprecated', 'beta']).default('active'),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

/**
 * AI Provider schema
 */
export const ProviderSchema = z.object({
  id: z.string(),
  name: z.string(),
  displayName: z.string().optional(),
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
  status: z.enum(['active', 'deprecated', 'beta']).default('active'),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

/**
 * Agent Persona schema
 */
export const AgentPersonaSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  systemPromptTemplate: z.string(),
  modelSettings: z.record(z.unknown()).optional(),
  capabilities: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
  version: z.number().default(1),
  isEnabled: z.boolean().default(true),
  createdAt: z.number(),
  updatedAt: z.number(),
});

/**
 * Agent schema
 */
export const AgentSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  modelId: z.string(),
  systemPrompt: z.string().optional(),
  personaId: z.string().optional(),
  tools: z.array(z.string()).optional(),
  userId: z.string().optional(),
  isActive: z.boolean().default(true),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

/**
 * Tool schema
 */
export const ToolSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  parametersSchema: z.record(z.unknown()),
  category: z.string().default('custom'),
  implementation: z.string().optional(),
  isEnabled: z.boolean().default(true),
  version: z.string().optional(),
  tags: z.array(z.string()).optional(),
  schema: z.record(z.unknown()).optional(),
  isActive: z.boolean().default(true),
  createdAt: z.number(),
  updatedAt: z.number(),
});

/**
 * Workflow step schema
 */
export const WorkflowStepSchema = z.object({
  id: z.string(),
  workflowId: z.string(),
  agentId: z.string(),
  stepIndex: z.number().optional(),
  input: z.string().optional(),
  threadId: z.string().optional(),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'skipped']),
  result: z.string().optional(),
  output: z.record(z.unknown()).optional(),
  error: z.string().optional(),
  startedAt: z.number().optional(),
  completedAt: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

/**
 * Agent Tools junction schema
 */
export const AgentToolSchema = z.object({
  agentId: z.string(),
  toolId: z.string(),
  createdAt: z.number(),
});

/**
 * Settings schema
 */
export const SettingSchema = z.object({
  category: z.string(),
  key: z.string(),
  value: z.string(),
  type: z.enum(['string', 'number', 'boolean', 'json']).default('string'),
  description: z.string().optional(),
  isPublic: z.boolean().default(false),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

/**
 * Blog post schema
 */
export const BlogPostSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  excerpt: z.string().optional(),
  authorId: z.string().optional(),
  imageUrl: z.string().optional(),
  tags: z.array(z.string()).optional(),
  featured: z.boolean().default(false),
  publishedAt: z.number().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

/**
 * MDX document schema
 */
export const MdxDocumentSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  excerpt: z.string().optional(),
  userId: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

/**
 * Generic content schema
 */
export const ContentSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  contentData: z.string().optional(),
  data: z.record(z.unknown()).optional(),
  imageUrl: z.string().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

/**
 * Memory thread schema
 */
export const MemoryThreadSchema = z.object({
  id: z.string(),
  agentId: z.string().optional(),
  networkId: z.string().optional(),
  userId: z.string().optional(),
  name: z.string(),
  summary: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

/**
 * Chat message schema
 */
export const ChatMessageSchema = z.object({
  id: z.string(),
  threadId: z.string(),
  memoryThreadId: z.string().optional(), // For LibSQL compat
  userId: z.string(),
  role: z.enum(['user', 'assistant', 'system', 'tool']),
  content: z.string(),
  toolCallId: z.string().optional(),
  toolName: z.string().optional(),
  tokenCount: z.number().optional(),
  embeddingId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  toolCalls: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        args: z.record(z.unknown()),
      })
    )
    .optional(),
  toolInvocations: z.record(z.unknown()).optional(),
  attachments: z
    .array(
      z.object({
        type: z.string(),
        content: z.string(),
        name: z.string().optional(),
        size: z.number().optional(),
      })
    )
    .optional(),
  deletedAt: z.number().optional(),
  isDeleted: z.boolean().default(false),
  createdAt: z.number(),
  updatedAt: z.number().optional(),
});

/**
 * Embedding schema
 */
export const EmbeddingSchema = z.object({
  id: z.string(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  vector: z.array(z.number()).optional(), // JSON array for Durable Objects
  vectorBlob: z.string().optional(), // Base64 blob for compatibility
  model: z.string().optional(),
  dimensions: z.number().optional(),
  vectorizeIndex: z.string().optional(),
  vectorizeId: z.string().optional(),
  associatedEntity: z.string().optional(),
  associatedEntityId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.number(),
  updatedAt: z.number().optional(),
});

/**
 * Agent state schema
 */
export const AgentStateSchema = z.object({
  memoryThreadId: z.string(),
  agentId: z.string(),
  stateData: z.string(), // JSON string
  state: z.record(z.unknown()).optional(),
  lastActivity: z.number().optional(),
  connectionCount: z.number().default(0),
  isActive: z.boolean().default(true),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

/**
 * GQL Cache schema
 */
export const GqlCacheSchema = z.object({
  id: z.string(),
  query: z.string(),
  variables: z.string().optional(),
  response: z.string(), // JSON string
  createdAt: z.number(),
});

/**
 * Document schema for RAG/Vector Store
 */
export const DocumentSchema = z.object({
  id: z.string(),
  content: z.string(),
  embedding: z.string().optional(),
  sourceUrl: z.string().optional(),
  documentType: z.string().optional(),
  userId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

// =============================================================================
// Observability & Monitoring Schemas
// =============================================================================

/**
 * Trace schema for observability
 */
export const TraceSchema = z.object({
  id: z.string(),
  name: z.string(),
  startTime: z.number(),
  endTime: z.number().optional(),
  durationMs: z.number().optional(),
  status: z.enum(['success', 'error', 'running']),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

/**
 * Span schema for observability
 */
export const SpanSchema = z.object({
  id: z.string(),
  traceId: z.string(),
  parentSpanId: z.string().optional(),
  name: z.string(),
  startTime: z.number(),
  endTime: z.number().optional(),
  durationMs: z.number().optional(),
  status: z.enum(['success', 'error']),
  attributes: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

/**
 * Event schema for observability
 */
export const EventSchema = z.object({
  id: z.string(),
  traceId: z.string(),
  spanId: z.string().optional(),
  name: z.string(),
  timestamp: z.number(),
  attributes: z.record(z.unknown()).optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

/**
 * System metrics schema
 */
export const SystemMetricsSchema = z.object({
  id: z.string(),
  timeRange: z.string().optional(),
  timestamp: z.number(),
  cpuUsage: z.number().optional(),
  memoryUsage: z.number().optional(),
  databaseConnections: z.number().optional(),
  apiRequestsPerMinute: z.number().optional(),
  averageResponseTimeMs: z.number().optional(),
  activeUsers: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

/**
 * Model performance schema
 */
export const ModelPerformanceSchema = z.object({
  id: z.string(),
  modelId: z.string(),
  timestamp: z.number(),
  latencyMs: z.number().optional(),
  tokensPerSecond: z.number().optional(),
  successRate: z.number().optional(),
  requestCount: z.number().default(0),
  totalTokens: z.number().default(0),
  errorCount: z.number().default(0),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

/**
 * Model costs schema
 */
export const ModelCostsSchema = z.object({
  id: z.string(),
  modelId: z.string(),
  date: z.number(),
  cost: z.number().default(0),
  inputTokens: z.number().default(0),
  outputTokens: z.number().default(0),
  requests: z.number().default(0),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

/**
 * Model evaluation schema
 */
export const ModelEvaluationSchema = z.object({
  id: z.string(),
  modelId: z.string(),
  version: z.string().optional(),
  evaluationDate: z.number(),
  datasetName: z.string().optional(),
  datasetSize: z.number().optional(),
  overallScore: z.number().optional(),
  previousScore: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

/**
 * Evaluation metrics schema
 */
export const EvaluationMetricsSchema = z.object({
  id: z.string(),
  evaluationId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  value: z.number(),
  threshold: z.number().optional(),
  weight: z.number().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

/**
 * Persona scores schema
 */
export const PersonaScoresSchema = z.object({
  id: z.string(),
  personaId: z.string(),
  usageCount: z.number().default(0),
  successRate: z.number().default(0),
  averageLatencyMs: z.number().default(0),
  userSatisfaction: z.number().default(0),
  adaptabilityScore: z.number().default(0),
  overallScore: z.number().default(0),
  lastUsedAt: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

/**
 * Evaluation examples schema
 */
export const EvaluationExamplesSchema = z.object({
  id: z.string(),
  evaluationId: z.string(),
  input: z.string(),
  expectedOutput: z.string().optional(),
  actualOutput: z.string().optional(),
  scores: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

// =============================================================================
// Database & Infrastructure Schemas
// =============================================================================

/**
 * Database connection schema
 */
export const DatabaseConnectionSchema = z.object({
  id: z.string(),
  connectionType: z.enum(['session', 'transaction', 'direct', 'drizzle']),
  poolName: z.string(),
  connectionUrl: z.string(),
  maxConnections: z.number().optional(),
  idleTimeoutMs: z.number().optional(),
  connectionTimeoutMs: z.number().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

/**
 * Database transaction schema
 */
export const DatabaseTransactionSchema = z.object({
  id: z.string(),
  connectionId: z.string().optional(),
  transactionType: z.enum(['read', 'write', 'mixed']).optional(),
  startTime: z.number(),
  endTime: z.number().optional(),
  durationMs: z.number().optional(),
  status: z
    .enum(['in_progress', 'committed', 'rolled_back', 'failed'])
    .default('in_progress'),
  queryCount: z.number().default(0),
  errorMessage: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

/**
 * Database query schema
 */
export const DatabaseQuerySchema = z.object({
  id: z.string(),
  transactionId: z.string().optional(),
  queryText: z.string(),
  queryType: z
    .enum(['select', 'insert', 'update', 'delete', 'other'])
    .optional(),
  executionTimeMs: z.number().optional(),
  rowCount: z.number().optional(),
  status: z.enum(['completed', 'failed']),
  errorMessage: z.string().optional(),
  createdAt: z.number(),
});

/**
 * Scheduled task schema
 */
export const ScheduledTaskSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  cronExpression: z.string(),
  jobName: z.string(),
  sqlCommand: z.string(),
  isActive: z.boolean().default(true),
  lastRunAt: z.number().optional(),
  nextRunAt: z.number().optional(),
  runCount: z.number().default(0),
  errorCount: z.number().default(0),
  lastError: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

/**
 * Scheduled task run schema
 */
export const ScheduledTaskRunSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  startTime: z.number(),
  endTime: z.number().optional(),
  durationMs: z.number().optional(),
  status: z.enum(['running', 'completed', 'failed']),
  resultSummary: z.string().optional(),
  errorMessage: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.number(),
});

// =============================================================================
// App Builder & Workflow Schemas
// =============================================================================

/**
 * App Builder session schema
 */
export const AppBuilderSessionSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  userId: z.string(),
  name: z.string(),
  status: z.enum(['active', 'paused', 'completed', 'archived']),
  config: z
    .object({
      framework: z.string().optional(),
      language: z.string().optional(),
      features: z.array(z.string()).optional(),
    })
    .optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

/**
 * App Builder project schema
 */
export const AppBuilderProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  framework: z.string().optional(),
  template: z.string().optional(),
  userId: z.string(),
  isPublic: z.boolean().default(false),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

/**
 * Workflow instance schema
 */
export const WorkflowInstanceSchema = z.object({
  id: z.string(),
  workflowId: z.string(),
  userId: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']),
  input: z.record(z.unknown()).optional(),
  output: z.record(z.unknown()).optional(),
  error: z.string().optional(),
  currentStepIndex: z.number().default(0),
  metadata: z.record(z.unknown()).optional(),
  startedAt: z.number().optional(),
  completedAt: z.number().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

/**
 * Workflow execution schema
 */
export const WorkflowExecutionSchema = z.object({
  id: z.string(),
  workflowId: z.string(),
  userId: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']),
  currentStepIndex: z.number().default(0),
  input: z.record(z.unknown()).optional(),
  output: z.record(z.unknown()).optional(),
  error: z.string().optional(),
  startedAt: z.number().optional(),
  completedAt: z.number().optional(),
  duration: z.number().optional(),
  triggeredBy: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

// =============================================================================
// Terminal & Command Execution Schemas
// =============================================================================

/**
 * Command execution schema for terminal sessions
 */
export const CommandExecutionSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  command: z.string(),
  args: z.array(z.string()).optional(),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']),
  exitCode: z.number().optional(),
  output: z.string().optional(),
  error: z.string().optional(),
  startedAt: z.number(),
  completedAt: z.number().optional(),
  duration: z.number().optional(),
  timestamp: z.number().optional(),
});

/**
 * Terminal output schema for streaming terminal output
 */
export const TerminalOutputSchema = z.object({
  sessionId: z.string(),
  type: z.enum(['stdout', 'stderr', 'system']),
  content: z.string(),
  timestamp: z.number(),
});

/**
 * Terminal input schema for terminal input handling
 */
export const TerminalInputSchema = z.object({
  input: z.string(),
});

/**
 * Terminal command schema
 */
export const TerminalCommandSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  command: z.string(),
  args: z.array(z.string()).optional(),
  output: z.string().optional(),
  exitCode: z.number().optional(),
  error: z.string().optional(),
  timestamp: z.number(),
  duration: z.number().optional(),
});

// =============================================================================
// Collaboration & Real-time Schemas
// =============================================================================

/**
 * Document collaboration schema
 */
export const DocumentCollaborationSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  userId: z.string(),
  title: z.string(),
  content: z.string(),
  version: z.number().default(1),
  status: z.enum(['draft', 'published', 'archived']),
  permissions: z
    .object({
      read: z.array(z.string()).default([]),
      write: z.array(z.string()).default([]),
      admin: z.array(z.string()).default([]),
    })
    .optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

/**
 * Document operation schema
 */
export const DocumentOperationSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  userId: z.string(),
  type: z.enum(['insert', 'delete', 'replace', 'format']),
  position: z.number(),
  content: z.string().optional(),
  length: z.number().optional(),
  timestamp: z.number(),
});

/**
 * Integration session schema
 */
export const IntegrationSessionSchema = z.object({
  id: z.string(),
  integrationId: z.string(),
  userId: z.string(),
  provider: z.string(),
  status: z.enum(['connecting', 'connected', 'disconnected', 'error']),
  config: z.record(z.unknown()).optional(),
  credentials: z.record(z.unknown()).optional(),
  lastSyncAt: z.number().optional(),
  error: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

// =============================================================================
// Cloudflare-Specific Schemas
// =============================================================================

/**
 * Cache entry schema for CacheCoordinatorDO
 */
export const CacheEntrySchema = z.object({
  id: z.string().optional(),
  key: z.string(),
  namespace: z.string().optional(),
  kvKey: z.string().optional(),
  value: z.unknown(),
  dataType: z.enum(['json', 'text', 'binary']).optional(),
  size: z.number().optional(),
  ttl: z.number().optional(),
  expiresAt: z.number().optional(),
  hitCount: z.number().default(0),
  lastAccessed: z.number().optional(),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

/**
 * Cache stats schema
 */
export const CacheStatsSchema = z.object({
  totalEntries: z.number(),
  totalSize: z.number(),
  hitCount: z.number(),
  missCount: z.number(),
  evictionCount: z.number(),
  lastAccessed: z.number().optional(),
});

/**
 * Cache invalidation schema
 */
export const CacheInvalidationSchema = z.object({
  id: z.string(),
  type: z.enum(['key', 'tag', 'pattern', 'all']),
  target: z.string().optional(),
  reason: z.string().optional(),
  requestedBy: z.string(),
  timestamp: z.number(),
});

/**
 * Durable Object session schema
 */
export const DurableObjectSessionSchema = z.object({
  id: z.string(),
  objectId: z.string(),
  objectClass: z.string(),
  namespace: z.string(),
  state: z.record(z.unknown()).optional(),
  lastActivity: z.number().optional(),
  connectionCount: z.number().default(0),
  isActive: z.boolean().default(true),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

/**
 * Worker analytics schema
 */
export const WorkerAnalyticsSchema = z.object({
  id: z.string(),
  workerName: z.string(),
  route: z.string().optional(),
  method: z.string().optional(),
  statusCode: z.number().optional(),
  duration: z.number().optional(),
  cpuTime: z.number().optional(),
  memoryUsed: z.number().optional(),
  timestamp: z.number(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.number(),
});

/**
 * Vector embedding schema for Vectorize
 */
export const VectorEmbeddingSchema = z.object({
  id: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  vector: z.array(z.number()).optional(),
  vectorizeIndex: z.string().optional(),
  vectorizeId: z.string().optional(),
  model: z.string(),
  dimensions: z.number(),
  associatedEntity: z.string().optional(),
  associatedEntityId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

/**
 * Network schema for AI integrations
 */
export const NetworkSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  configuration: z.record(z.unknown()).optional(),
  userId: z.string().optional(),
  isActive: z.boolean().default(true),
  createdAt: z.number(),
  updatedAt: z.number(),
});

// =============================================================================
// Helper Schemas
// =============================================================================

/**
 * Typing indicator schema
 */
export const TypingIndicatorSchema = z.object({
  userId: z.string(),
  isTyping: z.boolean(),
  timestamp: z.number(),
});

/**
 * User presence schema
 */
export const UserPresenceSchema = z.object({
  userId: z.string(),
  status: z.enum(['online', 'away', 'offline']),
  lastSeen: z.number(),
});

/**
 * Code update schema for App Builder
 */
export const CodeUpdateSchema = z.object({
  blockId: z.string(),
  content: z.string(),
  language: z.string().optional(),
  userId: z.string(),
  timestamp: z.number(),
});

/**
 * Preview state schema for App Builder
 */
export const PreviewStateSchema = z.object({
  url: z.string().optional(),
  status: z.enum(['building', 'ready', 'error']),
  error: z.string().optional(),
  timestamp: z.number(),
});

// NextAuth.js specific schemas (missing from earlier implementation)
export const AccountSchema = z.object({
  userId: z.string(),
  type: z.string(),
  provider: z.string(),
  providerAccountId: z.string(),
  refresh_token: z.string().optional(),
  access_token: z.string().optional(),
  expires_at: z.number().optional(),
  token_type: z.string().optional(),
  scope: z.string().optional(),
  id_token: z.string().optional(),
  session_state: z.string().optional(),
});

export const SessionSchema = z.object({
  sessionToken: z.string(),
  userId: z.string(),
  expires: z.number(),
});

export const VerificationTokenSchema = z.object({
  identifier: z.string(),
  token: z.string(),
  expires: z.number(),
});

// =============================================================================
// Type Exports
// =============================================================================

export type User = z.infer<typeof UserSchema>;
export type App = z.infer<typeof AppSchema>;
export type AppCodeBlock = z.infer<typeof AppCodeBlockSchema>;
export type Integration = z.infer<typeof IntegrationSchema>;
export type File = z.infer<typeof FileSchema>;
export type TerminalSession = z.infer<typeof TerminalSessionSchema>;
export type Workflow = z.infer<typeof WorkflowSchema>;
export type Model = z.infer<typeof ModelSchema>;
export type Provider = z.infer<typeof ProviderSchema>;
export type AgentPersona = z.infer<typeof AgentPersonaSchema>;
export type Agent = z.infer<typeof AgentSchema>;
export type Tool = z.infer<typeof ToolSchema>;
export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;
export type AgentTool = z.infer<typeof AgentToolSchema>;
export type Setting = z.infer<typeof SettingSchema>;
export type BlogPost = z.infer<typeof BlogPostSchema>;
export type MdxDocument = z.infer<typeof MdxDocumentSchema>;
export type Content = z.infer<typeof ContentSchema>;
export type MemoryThread = z.infer<typeof MemoryThreadSchema>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type Embedding = z.infer<typeof EmbeddingSchema>;
export type AgentState = z.infer<typeof AgentStateSchema>;
export type GqlCache = z.infer<typeof GqlCacheSchema>;
export type Document = z.infer<typeof DocumentSchema>;
export type Trace = z.infer<typeof TraceSchema>;
export type Span = z.infer<typeof SpanSchema>;
export type Event = z.infer<typeof EventSchema>;
export type SystemMetrics = z.infer<typeof SystemMetricsSchema>;
export type ModelPerformance = z.infer<typeof ModelPerformanceSchema>;
export type ModelCosts = z.infer<typeof ModelCostsSchema>;
export type ModelEvaluation = z.infer<typeof ModelEvaluationSchema>;
export type EvaluationMetrics = z.infer<typeof EvaluationMetricsSchema>;
export type PersonaScores = z.infer<typeof PersonaScoresSchema>;
export type EvaluationExamples = z.infer<typeof EvaluationExamplesSchema>;
export type DatabaseConnection = z.infer<typeof DatabaseConnectionSchema>;
export type DatabaseTransaction = z.infer<typeof DatabaseTransactionSchema>;
export type DatabaseQuery = z.infer<typeof DatabaseQuerySchema>;
export type ScheduledTask = z.infer<typeof ScheduledTaskSchema>;
export type ScheduledTaskRun = z.infer<typeof ScheduledTaskRunSchema>;
export type AppBuilderSession = z.infer<typeof AppBuilderSessionSchema>;
export type AppBuilderProject = z.infer<typeof AppBuilderProjectSchema>;
export type WorkflowInstance = z.infer<typeof WorkflowInstanceSchema>;
export type WorkflowExecution = z.infer<typeof WorkflowExecutionSchema>;
export type CommandExecution = z.infer<typeof CommandExecutionSchema>;
export type TerminalOutput = z.infer<typeof TerminalOutputSchema>;
export type TerminalInput = z.infer<typeof TerminalInputSchema>;
export type TerminalCommand = z.infer<typeof TerminalCommandSchema>;
export type DocumentCollaboration = z.infer<typeof DocumentCollaborationSchema>;
export type DocumentOperation = z.infer<typeof DocumentOperationSchema>;
export type IntegrationSession = z.infer<typeof IntegrationSessionSchema>;
export type CacheEntry = z.infer<typeof CacheEntrySchema>;
export type CacheStats = z.infer<typeof CacheStatsSchema>;
export type CacheInvalidation = z.infer<typeof CacheInvalidationSchema>;
export type DurableObjectSession = z.infer<typeof DurableObjectSessionSchema>;
export type WorkerAnalytics = z.infer<typeof WorkerAnalyticsSchema>;
export type VectorEmbedding = z.infer<typeof VectorEmbeddingSchema>;
export type Network = z.infer<typeof NetworkSchema>;
export type TypingIndicator = z.infer<typeof TypingIndicatorSchema>;
export type UserPresence = z.infer<typeof UserPresenceSchema>;
export type CodeUpdate = z.infer<typeof CodeUpdateSchema>;
export type PreviewState = z.infer<typeof PreviewStateSchema>;

// NextAuth.js types (missing from earlier implementation)
export type Account = z.infer<typeof AccountSchema>;
export type Session = z.infer<typeof SessionSchema>;
export type VerificationToken = z.infer<typeof VerificationTokenSchema>;

// =============================================================================
// Validation Functions
// =============================================================================

export function validateUser(data: unknown): User {
  return UserSchema.parse(data);
}

export function validateApp(data: unknown): App {
  return AppSchema.parse(data);
}

export function validateAppCodeBlock(data: unknown): AppCodeBlock {
  return AppCodeBlockSchema.parse(data);
}

export function validateIntegration(data: unknown): Integration {
  return IntegrationSchema.parse(data);
}

export function validateFile(data: unknown): File {
  return FileSchema.parse(data);
}

export function validateTerminalSession(data: unknown): TerminalSession {
  return TerminalSessionSchema.parse(data);
}

export function validateWorkflow(data: unknown): Workflow {
  return WorkflowSchema.parse(data);
}

export function validateModel(data: unknown): Model {
  return ModelSchema.parse(data);
}

export function validateProvider(data: unknown): Provider {
  return ProviderSchema.parse(data);
}

export function validateAgentPersona(data: unknown): AgentPersona {
  return AgentPersonaSchema.parse(data);
}

export function validateAgent(data: unknown): Agent {
  return AgentSchema.parse(data);
}

export function validateTool(data: unknown): Tool {
  return ToolSchema.parse(data);
}

export function validateWorkflowStep(data: unknown): WorkflowStep {
  return WorkflowStepSchema.parse(data);
}

export function validateAgentTool(data: unknown): AgentTool {
  return AgentToolSchema.parse(data);
}

export function validateSetting(data: unknown): Setting {
  return SettingSchema.parse(data);
}

export function validateBlogPost(data: unknown): BlogPost {
  return BlogPostSchema.parse(data);
}

export function validateMdxDocument(data: unknown): MdxDocument {
  return MdxDocumentSchema.parse(data);
}

export function validateContent(data: unknown): Content {
  return ContentSchema.parse(data);
}

export function validateMemoryThread(data: unknown): MemoryThread {
  return MemoryThreadSchema.parse(data);
}

export function validateChatMessage(data: unknown): ChatMessage {
  return ChatMessageSchema.parse(data);
}

export function validateEmbedding(data: unknown): Embedding {
  return EmbeddingSchema.parse(data);
}

export function validateAgentState(data: unknown): AgentState {
  return AgentStateSchema.parse(data);
}

export function validateGqlCache(data: unknown): GqlCache {
  return GqlCacheSchema.parse(data);
}

export function validateDocument(data: unknown): Document {
  return DocumentSchema.parse(data);
}

export function validateTrace(data: unknown): Trace {
  return TraceSchema.parse(data);
}

export function validateSpan(data: unknown): Span {
  return SpanSchema.parse(data);
}

export function validateEvent(data: unknown): Event {
  return EventSchema.parse(data);
}

export function validateSystemMetrics(data: unknown): SystemMetrics {
  return SystemMetricsSchema.parse(data);
}

export function validateModelPerformance(data: unknown): ModelPerformance {
  return ModelPerformanceSchema.parse(data);
}

export function validateModelCosts(data: unknown): ModelCosts {
  return ModelCostsSchema.parse(data);
}

export function validateModelEvaluation(data: unknown): ModelEvaluation {
  return ModelEvaluationSchema.parse(data);
}

export function validateEvaluationMetrics(data: unknown): EvaluationMetrics {
  return EvaluationMetricsSchema.parse(data);
}

export function validatePersonaScores(data: unknown): PersonaScores {
  return PersonaScoresSchema.parse(data);
}

export function validateEvaluationExamples(data: unknown): EvaluationExamples {
  return EvaluationExamplesSchema.parse(data);
}

export function validateDatabaseConnection(data: unknown): DatabaseConnection {
  return DatabaseConnectionSchema.parse(data);
}

export function validateDatabaseTransaction(
  data: unknown
): DatabaseTransaction {
  return DatabaseTransactionSchema.parse(data);
}

export function validateDatabaseQuery(data: unknown): DatabaseQuery {
  return DatabaseQuerySchema.parse(data);
}

export function validateScheduledTask(data: unknown): ScheduledTask {
  return ScheduledTaskSchema.parse(data);
}

export function validateScheduledTaskRun(data: unknown): ScheduledTaskRun {
  return ScheduledTaskRunSchema.parse(data);
}

export function validateAppBuilderSession(data: unknown): AppBuilderSession {
  return AppBuilderSessionSchema.parse(data);
}

export function validateAppBuilderProject(data: unknown): AppBuilderProject {
  return AppBuilderProjectSchema.parse(data);
}

export function validateWorkflowInstance(data: unknown): WorkflowInstance {
  return WorkflowInstanceSchema.parse(data);
}

export function validateWorkflowExecution(data: unknown): WorkflowExecution {
  return WorkflowExecutionSchema.parse(data);
}

export function validateCommandExecution(data: unknown): CommandExecution {
  return CommandExecutionSchema.parse(data);
}

export function validateTerminalOutput(data: unknown): TerminalOutput {
  return TerminalOutputSchema.parse(data);
}

export function validateTerminalInput(data: unknown): TerminalInput {
  return TerminalInputSchema.parse(data);
}

export function validateTerminalCommand(data: unknown): TerminalCommand {
  return TerminalCommandSchema.parse(data);
}

export function validateDocumentCollaboration(
  data: unknown
): DocumentCollaboration {
  return DocumentCollaborationSchema.parse(data);
}

export function validateDocumentOperation(data: unknown): DocumentOperation {
  return DocumentOperationSchema.parse(data);
}

export function validateIntegrationSession(data: unknown): IntegrationSession {
  return IntegrationSessionSchema.parse(data);
}

export function validateCacheEntry(data: unknown): CacheEntry {
  return CacheEntrySchema.parse(data);
}

export function validateCacheStats(data: unknown): CacheStats {
  return CacheStatsSchema.parse(data);
}

export function validateCacheInvalidation(data: unknown): CacheInvalidation {
  return CacheInvalidationSchema.parse(data);
}

export function validateDurableObjectSession(
  data: unknown
): DurableObjectSession {
  return DurableObjectSessionSchema.parse(data);
}

export function validateWorkerAnalytics(data: unknown): WorkerAnalytics {
  return WorkerAnalyticsSchema.parse(data);
}

export function validateVectorEmbedding(data: unknown): VectorEmbedding {
  return VectorEmbeddingSchema.parse(data);
}

export function validateNetwork(data: unknown): Network {
  return NetworkSchema.parse(data);
}

export function validateTypingIndicator(data: unknown): TypingIndicator {
  return TypingIndicatorSchema.parse(data);
}

export function validateUserPresence(data: unknown): UserPresence {
  return UserPresenceSchema.parse(data);
}

export function validateCodeUpdate(data: unknown): CodeUpdate {
  return CodeUpdateSchema.parse(data);
}

export function validatePreviewState(data: unknown): PreviewState {
  return PreviewStateSchema.parse(data);
}

export function validateAccount(data: unknown): Account {
  return AccountSchema.parse(data);
}

export function validateSession(data: unknown): Session {
  return SessionSchema.parse(data);
}

export function validateVerificationToken(data: unknown): VerificationToken {
  return VerificationTokenSchema.parse(data);
}

// Generated on 2025-05-24
