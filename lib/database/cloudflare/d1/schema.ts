/**
 * Cloudflare D1 Database Schema
 *
 * This schema defines all tables for the Cloudflare D1 database, including:
 * - NextAuth.js authentication tables (users, accounts, sessions, verificationTokens)
 * - Application-specific tables (models, tools, agents, threads, etc.)
 *
 * Generated on 2025-05-24
 */

import {
  integer,
  sqliteTable,
  text,
  primaryKey,
  blob,
  real,
} from 'drizzle-orm/sqlite-core';
import {
  relations,
  type InferSelectModel,
  type InferInsertModel,
} from 'drizzle-orm';
import { z } from 'zod';
import { generateId } from 'ai';

// =============================================================================
// NextAuth.js Tables
// =============================================================================

/**
 * Users table for NextAuth.js authentication
 * Stores user account information and authentication details
 */
export const users = sqliteTable('users', {
  id: text('id').notNull().primaryKey(),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: integer('emailVerified'),
  image: text('image'),
  role: text('role').default('user').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

/**
 * Accounts table for NextAuth.js OAuth provider linking
 * Links users to their OAuth accounts (GitHub, Google, etc.)
 */
export const accounts = sqliteTable(
  'accounts',
  {
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('providerAccountId').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (account) => [
    primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  ]
);

/**
 * Sessions table for NextAuth.js database session strategy
 * Stores active user sessions
 */
export const sessions = sqliteTable('sessions', {
  sessionToken: text('sessionToken').notNull().primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: integer('expires').notNull(),
});

/**
 * Verification tokens table for NextAuth.js email verification
 * Used for passwordless email authentication and email verification
 */
export const verificationTokens = sqliteTable(
  'verification_tokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull().unique(),
    expires: integer('expires').notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })]
);

// =============================================================================
// Application-Specific Tables
// =============================================================================

/**
 * AI Models table
 * Stores available AI models and their configurations
 */
export const models = sqliteTable('models', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateId()),
  name: text('name').notNull(),
  provider: text('provider').notNull(),
  modelId: text('model_id').notNull(),
  capabilities: text('capabilities', { mode: 'json' }),
  maxTokens: integer('max_tokens'),
  inputCostPer1k: text('input_cost_per_1k'),
  outputCostPer1k: text('output_cost_per_1k'),
  contextWindow: integer('context_window'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at')
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer('updated_at')
    .notNull()
    .$defaultFn(() => Date.now()),
});

/**
 * Tools table
 * Stores available AI tools and their schemas
 */
export const tools = sqliteTable('tools', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateId()),
  name: text('name').notNull().unique(),
  description: text('description').notNull(),
  category: text('category').notNull(),
  schema: text('schema', { mode: 'json' }),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at')
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer('updated_at')
    .notNull()
    .$defaultFn(() => Date.now()),
});

/**
 * Agents table
 * Stores AI agent configurations and personas
 */
export const agents = sqliteTable('agents', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateId()),
  name: text('name').notNull(),
  description: text('description'),
  systemPrompt: text('system_prompt'),
  modelId: text('model_id').references(() => models.id),
  tools: text('tools', { mode: 'json' }),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at')
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer('updated_at')
    .notNull()
    .$defaultFn(() => Date.now()),
});

/**
 * Threads table
 * Stores conversation threads between users and agents
 */
export const threads = sqliteTable('threads', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateId()),
  title: text('title'),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  agentId: text('agent_id').references(() => agents.id),
  metadata: text('metadata', { mode: 'json' }),
  createdAt: integer('created_at')
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer('updated_at')
    .notNull()
    .$defaultFn(() => Date.now()),
});

/**
 * Messages table
 * Stores individual messages within threads
 */
export const messages = sqliteTable('messages', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateId()),
  threadId: text('thread_id')
    .notNull()
    .references(() => threads.id, { onDelete: 'cascade' }),
  role: text('role').notNull(), // 'user', 'assistant', 'system', 'tool'
  content: text('content'),
  toolInvocations: text('tool_invocations', { mode: 'json' }),
  metadata: text('metadata', { mode: 'json' }),
  createdAt: integer('created_at')
    .notNull()
    .$defaultFn(() => Date.now()),
});

/**
 * Workflows table
 * Stores AI workflow definitions and configurations
 */
export const workflows = sqliteTable('workflows', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateId()),
  name: text('name').notNull(),
  description: text('description'),
  definition: text('definition', { mode: 'json' }),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at')
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer('updated_at')
    .notNull()
    .$defaultFn(() => Date.now()),
});

/**
 * Networks table
 * Stores network configurations for AI integrations
 */
export const networks = sqliteTable('networks', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateId()),
  name: text('name').notNull(),
  type: text('type').notNull(),
  configuration: text('configuration', { mode: 'json' }),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at')
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer('updated_at')
    .notNull()
    .$defaultFn(() => Date.now()),
});

/**
 * App Builder Projects table
 * Stores app builder project configurations
 */
export const appBuilderProjects = sqliteTable('app_builder_projects', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateId()),
  name: text('name').notNull(),
  description: text('description'),
  configuration: text('configuration', { mode: 'json' }),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at')
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer('updated_at')
    .notNull()
    .$defaultFn(() => Date.now()),
});

/**
 * Apps table
 * Stores application configurations for AppBuilder
 */
export const apps = sqliteTable('apps', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateId()),
  name: text('name').notNull().unique(),
  description: text('description'),
  type: text('type').notNull(),
  code: text('code').notNull(),
  parametersSchema: text('parameters_schema', { mode: 'json' }),
  metadata: text('metadata', { mode: 'json' }),
  createdAt: integer('created_at')
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer('updated_at')
    .notNull()
    .$defaultFn(() => Date.now()),
});

/**
 * App Code Blocks table
 * Stores code blocks for applications
 */
export const appCodeBlocks = sqliteTable('app_code_blocks', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateId()),
  appId: text('app_id')
    .notNull()
    .references(() => apps.id, { onDelete: 'cascade' }),
  language: text('language').notNull(),
  code: text('code').notNull(),
  description: text('description'),
  order: integer('order').notNull().default(0),
  createdAt: integer('created_at')
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer('updated_at')
    .notNull()
    .$defaultFn(() => Date.now()),
});

/**
 * Integrations table
 * Stores third-party service integrations
 */
export const integrations = sqliteTable('integrations', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(),
  name: text('name'),
  config: text('config', { mode: 'json' }),
  credentials: text('credentials', { mode: 'json' }),
  status: text('status').notNull().default('inactive'),
  lastSyncedAt: integer('last_synced_at'),
  metadata: text('metadata', { mode: 'json' }),
  createdAt: integer('created_at')
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer('updated_at')
    .notNull()
    .$defaultFn(() => Date.now()),
});

/**
 * Providers table
 * Stores AI model providers (OpenAI, Anthropic, Google, etc.)
 */
export const providers = sqliteTable('providers', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull().unique(),
  displayName: text('display_name'),
  apiKey: text('api_key'),
  baseUrl: text('base_url'),
  status: text('status').notNull().default('active'),
  metadata: text('metadata', { mode: 'json' }),
  createdAt: integer('created_at')
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer('updated_at')
    .notNull()
    .$defaultFn(() => Date.now()),
});

/**
 * Agent Personas table
 * Stores reusable agent personality templates
 */
export const agentPersonas = sqliteTable('agent_personas', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateId()),
  name: text('name').notNull().unique(),
  description: text('description').notNull(),
  systemPromptTemplate: text('system_prompt_template').notNull(),
  modelSettings: text('model_settings', { mode: 'json' }),
  capabilities: text('capabilities', { mode: 'json' }),
  tags: text('tags', { mode: 'json' }),
  version: integer('version').default(1),
  isEnabled: integer('is_enabled', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at')
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer('updated_at')
    .notNull()
    .$defaultFn(() => Date.now()),
});

/**
 * Agent Tools junction table
 * Many-to-many relationship between agents and tools
 */
export const agentTools = sqliteTable(
  'agent_tools',
  {
    agentId: text('agent_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    toolId: text('tool_id')
      .notNull()
      .references(() => tools.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at')
      .notNull()
      .$defaultFn(() => Date.now()),
  },
  (table) => [primaryKey({ columns: [table.agentId, table.toolId] })]
);

/**
 * Settings table
 * Stores application-wide configuration settings
 */
export const settings = sqliteTable(
  'settings',
  {
    category: text('category').notNull(),
    key: text('key').notNull(),
    value: text('value').notNull(),
    createdAt: integer('created_at')
      .notNull()
      .$defaultFn(() => Date.now()),
    updatedAt: integer('updated_at')
      .notNull()
      .$defaultFn(() => Date.now()),
  },
  (table) => [primaryKey({ columns: [table.category, table.key] })]
);

/**
 * Documents table
 * Stores documents for RAG and vector search
 */
export const documents = sqliteTable('documents', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateId()),
  content: text('content').notNull(),
  embedding: text('embedding'),
  sourceUrl: text('source_url'),
  documentType: text('document_type'),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  metadata: text('metadata', { mode: 'json' }),
  createdAt: integer('created_at')
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer('updated_at')
    .notNull()
    .$defaultFn(() => Date.now()),
});

/**
 * Memory Threads table
 * Stores conversation threads for AI memory
 */
export const memoryThreads = sqliteTable('memory_threads', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateId()),
  agentId: text('agent_id').references(() => agents.id, {
    onDelete: 'set null',
  }),
  networkId: text('network_id').references(() => networks.id, {
    onDelete: 'set null',
  }),
  name: text('name').notNull(),
  summary: text('summary'),
  metadata: text('metadata', { mode: 'json' }),
  createdAt: integer('created_at')
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer('updated_at')
    .notNull()
    .$defaultFn(() => Date.now()),
});

/**
 * Embeddings table
 * Stores vector embeddings for semantic search
 */
export const embeddings = sqliteTable('embeddings', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateId()),
  vector: blob('vector').notNull(),
  model: text('model'),
  dimensions: integer('dimensions'),
  createdAt: integer('created_at')
    .notNull()
    .$defaultFn(() => Date.now()),
});

/**
 * Agent States table
 * Stores persistent agent state data
 */
export const agentStates = sqliteTable(
  'agent_states',
  {
    memoryThreadId: text('memory_thread_id')
      .notNull()
      .references(() => memoryThreads.id, { onDelete: 'cascade' }),
    agentId: text('agent_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    stateData: text('state_data').notNull(),
    createdAt: integer('created_at')
      .notNull()
      .$defaultFn(() => Date.now()),
    updatedAt: integer('updated_at')
      .notNull()
      .$defaultFn(() => Date.now()),
  },
  (table) => [primaryKey({ columns: [table.memoryThreadId, table.agentId] })]
);

/**
 * Workflow Steps table
 * Stores individual steps within workflows
 */
export const workflowSteps = sqliteTable('workflow_steps', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateId()),
  workflowId: text('workflow_id')
    .notNull()
    .references(() => workflows.id, { onDelete: 'cascade' }),
  agentId: text('agent_id')
    .notNull()
    .references(() => agents.id, { onDelete: 'cascade' }),
  input: text('input'),
  threadId: text('thread_id').notNull(),
  status: text('status').notNull(),
  result: text('result'),
  error: text('error'),
  metadata: text('metadata', { mode: 'json' }),
  createdAt: integer('created_at')
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer('updated_at')
    .notNull()
    .$defaultFn(() => Date.now()),
});

/**
 * Terminal Sessions table
 * Stores terminal/shell session data
 */
export const terminalSessions = sqliteTable('terminal_sessions', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateId()),
  appId: text('app_id')
    .notNull()
    .references(() => apps.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  command: text('command').notNull(),
  output: text('output'),
  status: text('status').notNull().default('pending'),
  createdAt: integer('created_at')
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer('updated_at')
    .notNull()
    .$defaultFn(() => Date.now()),
});

/**
 * Blog Posts table
 * Stores blog content
 */
export const blogPosts = sqliteTable('blog_posts', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateId()),
  title: text('title').notNull(),
  content: text('content').notNull(),
  excerpt: text('excerpt'),
  authorId: text('author_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  imageUrl: text('image_url'),
  tags: text('tags', { mode: 'json' }),
  featured: integer('featured', { mode: 'boolean' }).default(false),
  publishedAt: integer('published_at'),
  createdAt: integer('created_at')
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer('updated_at')
    .notNull()
    .$defaultFn(() => Date.now()),
});

/**
 * MDX Documents table
 * Stores MDX documentation content
 */
export const mdxDocuments = sqliteTable('mdx_documents', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateId()),
  title: text('title').notNull(),
  content: text('content').notNull(),
  excerpt: text('excerpt'),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at')
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer('updated_at')
    .notNull()
    .$defaultFn(() => Date.now()),
});

/**
 * Content table
 * Generic content storage for various content types
 */
export const contentTable = sqliteTable('content', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateId()),
  type: text('type').notNull(),
  title: text('title'),
  subtitle: text('subtitle'),
  description: text('description'),
  contentData: text('content_data'),
  data: text('data', { mode: 'json' }),
  imageUrl: text('image_url'),
  createdAt: integer('created_at')
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer('updated_at')
    .notNull()
    .$defaultFn(() => Date.now()),
});

/**
 * GQL Cache table
 * Stores GraphQL query cache
 */
export const gqlCache = sqliteTable('gql_cache', {
  id: text('id').primaryKey(),
  query: text('query').notNull(),
  variables: text('variables'),
  response: text('response').notNull(),
  createdAt: integer('created_at')
    .notNull()
    .$defaultFn(() => Date.now()),
});

/**
 * File Tree Nodes table
 */
export const fileTreeNodes = sqliteTable('file_tree_nodes', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateId()),
  parentId: text('parent_id'),
  name: text('name').notNull(),
  type: text('type').notNull(), // 'file' or 'folder'
  order: integer('order').notNull().default(0),
  appId: text('app_id').references(() => apps.id, { onDelete: 'cascade' }),
  metadata: text('metadata', { mode: 'json' }),
  createdAt: integer('created_at')
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer('updated_at')
    .notNull()
    .$defaultFn(() => Date.now()),
});

// =============================================================================
// Cloudflare-Specific Tables for Full Stack Migration
// =============================================================================

/**
 * Files table for Cloudflare R2 integration
 * Stores file metadata and R2 object references
 */
export const files = sqliteTable('files', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  appId: text('app_id').references(() => apps.id, { onDelete: 'cascade' }),
  parentId: text('parent_id'),
  name: text('name').notNull(),
  type: text('type').notNull(), // 'file' or 'folder'
  content: text('content'),
  r2ObjectKey: text('r2_object_key'), // R2 storage key
  r2Bucket: text('r2_bucket'), // R2 bucket name
  mimeType: text('mime_type'),
  size: integer('size'),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  associatedEntity: text('associated_entity'), // 'thread', 'message', 'workflow', etc.
  associatedEntityId: text('associated_entity_id'),
  metadata: text('metadata', { mode: 'json' }),
  createdAt: integer('created_at')
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer('updated_at')
    .notNull()
    .$defaultFn(() => Date.now()),
});

/**
 * Vector Embeddings table for Cloudflare Vectorize
 * Enhanced vector storage with Vectorize integration
 */
export const vectorEmbeddings = sqliteTable('vector_embeddings', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateId()),
  entityType: text('entity_type').notNull(), // 'message', 'document', 'file', etc.
  entityId: text('entity_id').notNull(),
  vector: text('vector', { mode: 'json' }), // JSON array of numbers
  vectorizeIndex: text('vectorize_index'), // Cloudflare Vectorize index name
  vectorizeId: text('vectorize_id'), // ID in Vectorize
  model: text('model').notNull(),
  dimensions: integer('dimensions').notNull(),
  metadata: text('metadata', { mode: 'json' }),
  createdAt: integer('created_at')
    .notNull()
    .$defaultFn(() => Date.now()),
});

/**
 * Workflow Executions table
 * Tracks workflow execution state and results
 */
export const workflowExecutions = sqliteTable('workflow_executions', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateId()),
  workflowId: text('workflow_id')
    .notNull()
    .references(() => workflows.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  status: text('status').notNull(), // 'pending', 'running', 'completed', 'failed', 'cancelled'
  currentStepIndex: integer('current_step_index').default(0),
  input: text('input', { mode: 'json' }),
  output: text('output', { mode: 'json' }),
  error: text('error'),
  startedAt: integer('started_at'),
  completedAt: integer('completed_at'),
  duration: integer('duration'), // milliseconds
  triggeredBy: text('triggered_by'), // allowed: 'user', 'schedule', 'webhook', etc.
  metadata: text('metadata', { mode: 'json' }),
  createdAt: integer('created_at')
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer('updated_at')
    .notNull()
    .$defaultFn(() => Date.now()),
});

/**
 * Cache Entries table for Cloudflare KV integration
 * Tracks cache entries and their metadata
 */
export const cacheEntries = sqliteTable('cache_entries', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  key: text('key').notNull().unique(),
  namespace: text('namespace').notNull(),
  kvKey: text('kv_key'), // Actual key in Cloudflare KV
  dataType: text('data_type').notNull(), // 'json', 'text', 'binary'
  size: integer('size'),
  ttl: integer('ttl'), // Time to live in seconds
  expiresAt: integer('expires_at'),
  hitCount: integer('hit_count').default(0),
  lastAccessed: integer('last_accessed'),
  metadata: text('metadata', { mode: 'json' }),
  createdAt: integer('created_at')
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer('updated_at')
    .notNull()
    .$defaultFn(() => Date.now()),
});

/**
 * Durable Object Sessions table
 * Tracks Durable Object instances and their state
 */
export const durableObjectSessions = sqliteTable('durable_object_sessions', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  objectId: text('object_id').notNull().unique(),
  objectClass: text('object_class').notNull(), // 'ChatRoom', 'WorkflowRunner', etc.
  namespace: text('namespace').notNull(),
  state: text('state', { mode: 'json' }),
  lastActivity: integer('last_activity'),
  connectionCount: integer('connection_count').default(0),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  metadata: text('metadata', { mode: 'json' }),
  createdAt: integer('created_at')
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer('updated_at')
    .notNull()
    .$defaultFn(() => Date.now()),
});

/**
 * Worker Analytics table
 * Stores analytics and metrics for Cloudflare Workers
 */
export const workerAnalytics = sqliteTable('worker_analytics', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  workerName: text('worker_name').notNull(),
  route: text('route'),
  method: text('method'),
  statusCode: integer('status_code'),
  duration: integer('duration'), // milliseconds
  cpuTime: integer('cpu_time'), // milliseconds
  memoryUsed: integer('memory_used'), // bytes
  requestSize: integer('request_size'), // bytes
  responseSize: integer('response_size'), // bytes
  country: text('country'),
  userAgent: text('user_agent'),
  timestamp: integer('timestamp')
    .notNull()
    .$defaultFn(() => Date.now()),
  metadata: text('metadata', { mode: 'json' }),
});
/**
 * Traces table - Observability
 * Stores high-level trace information for AI model interactions
 */
export const traces = sqliteTable('traces', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  startTime: integer('start_time').notNull(),
  endTime: integer('end_time'),
  durationMs: integer('duration_ms'),
  status: text('status').notNull(),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  sessionId: text('session_id'),
  metadata: text('metadata', { mode: 'json' }),
  createdAt: integer('created_at')
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer('updated_at')
    .notNull()
    .$defaultFn(() => Date.now()),
});

/**
 * Spans table - Observability
 * Stores detailed timing information for specific operations within a trace
 */
export const spans = sqliteTable('spans', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateId()),
  traceId: text('trace_id')
    .notNull()
    .references(() => traces.id, { onDelete: 'cascade' }),
  parentSpanId: text('parent_span_id'),
  name: text('name').notNull(),
  startTime: integer('start_time').notNull(),
  endTime: integer('end_time'),
  durationMs: integer('duration_ms'),
  status: text('status').notNull(),
  attributes: text('attributes', { mode: 'json' }),
  metadata: text('metadata', { mode: 'json' }),
  createdAt: integer('created_at')
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer('updated_at')
    .notNull()
    .$defaultFn(() => Date.now()),
});

/**
 * Events table - Observability
 * Stores discrete events that occur during a trace
 */
export const events = sqliteTable('events', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateId()),
  traceId: text('trace_id')
    .notNull()
    .references(() => traces.id, { onDelete: 'cascade' }),
  spanId: text('span_id').references(() => spans.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  timestamp: integer('timestamp').notNull(),
  attributes: text('attributes', { mode: 'json' }),
  createdAt: integer('created_at')
    .notNull()
    .$defaultFn(() => Date.now()),
});

/**
 * System Metrics table - Observability
 * Stores system health metrics like CPU usage, memory usage, etc.
 */
export const systemMetrics = sqliteTable('system_metrics', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  timeRange: text('time_range'),
  timestamp: integer('timestamp').notNull(),
  cpuUsage: real('cpu_usage'),
  memoryUsage: real('memory_usage'),
  databaseConnections: integer('database_connections'),
  apiRequestsPerMinute: integer('api_requests_per_minute'),
  averageResponseTimeMs: real('average_response_time_ms'),
  activeUsers: integer('active_users'),
  metadata: text('metadata', { mode: 'json' }),
  createdAt: integer('created_at')
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer('updated_at')
    .notNull()
    .$defaultFn(() => Date.now()),
});

/**
 * Model Performance table - Observability
 * Stores performance metrics for AI models like latency, tokens per second, etc.
 */
export const modelPerformance = sqliteTable('model_performance', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  modelId: text('model_id')
    .notNull()
    .references(() => models.id, { onDelete: 'cascade' }),
  timestamp: integer('timestamp').notNull(),
  latencyMs: real('latency_ms'),
  tokensPerSecond: real('tokens_per_second'),
  successRate: real('success_rate'),
  requestCount: integer('request_count').notNull().default(0),
  totalTokens: integer('total_tokens').notNull().default(0),
  errorCount: integer('error_count').notNull().default(0),
  metadata: text('metadata', { mode: 'json' }),
  createdAt: integer('created_at')
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer('updated_at')
    .notNull()
    .$defaultFn(() => Date.now()),
});

/**
 * Model Costs table - Observability
 * Stores cost information for AI model usage
 */
export const modelCosts = sqliteTable('model_costs', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  modelId: text('model_id')
    .notNull()
    .references(() => models.id, { onDelete: 'cascade' }),
  date: integer('date').notNull(), // Date as timestamp
  cost: real('cost').notNull().default(0.0),
  inputTokens: integer('input_tokens').notNull().default(0),
  outputTokens: integer('output_tokens').notNull().default(0),
  requests: integer('requests').notNull().default(0),
  metadata: text('metadata', { mode: 'json' }),
  createdAt: integer('created_at')
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer('updated_at')
    .notNull()
    .$defaultFn(() => Date.now()),
});

/**
 * Model Evaluations table - Observability
 * Stores evaluation results for AI models
 */
export const modelEvaluations = sqliteTable('model_evaluations', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateId()),
  modelId: text('model_id')
    .notNull()
    .references(() => models.id, { onDelete: 'cascade' }),
  version: text('version'),
  evaluationDate: integer('evaluation_date').notNull(),
  datasetName: text('dataset_name'),
  datasetSize: integer('dataset_size'),
  overallScore: real('overall_score'),
  previousScore: real('previous_score'),
  metadata: text('metadata', { mode: 'json' }),
  createdAt: integer('created_at')
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer('updated_at')
    .notNull()
    .$defaultFn(() => Date.now()),
});

/**
 * Evaluation Metrics table - Observability
 * Stores detailed metrics for model evaluations
 */
export const evaluationMetrics = sqliteTable('evaluation_metrics', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  evaluationId: text('evaluation_id')
    .notNull()
    .references(() => modelEvaluations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  value: real('value').notNull(),
  threshold: real('threshold'),
  weight: real('weight'),
  createdAt: integer('created_at')
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer('updated_at')
    .notNull()
    .$defaultFn(() => Date.now()),
});

/**
 * Evaluation Examples table - Observability
 * Stores example inputs and outputs for model evaluations
 */
export const evaluationExamples = sqliteTable('evaluation_examples', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  evaluationId: text('evaluation_id')
    .notNull()
    .references(() => modelEvaluations.id, { onDelete: 'cascade' }),
  input: text('input').notNull(),
  expectedOutput: text('expected_output'),
  actualOutput: text('actual_output'),
  scores: text('scores', { mode: 'json' }),
  metadata: text('metadata', { mode: 'json' }),
  createdAt: integer('created_at')
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer('updated_at')
    .notNull()
    .$defaultFn(() => Date.now()),
});

/**
 * Database Connections table - Infrastructure
 * Tracks database connection pools
 */
export const databaseConnections = sqliteTable('database_connections', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  connectionType: text('connection_type').notNull(),
  poolName: text('pool_name').notNull(),
  connectionUrl: text('connection_url').notNull(),
  maxConnections: integer('max_connections'),
  idleTimeoutMs: integer('idle_timeout_ms'),
  connectionTimeoutMs: integer('connection_timeout_ms'),
  status: text('status').notNull().default('active'),
  metadata: text('metadata', { mode: 'json' }),
  createdAt: integer('created_at')
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer('updated_at')
    .notNull()
    .$defaultFn(() => Date.now()),
});

/**
 * Database Transactions table - Infrastructure
 * Tracks database transaction execution
 */
export const databaseTransactions = sqliteTable('database_transactions', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  connectionId: text('connection_id').references(() => databaseConnections.id, {
    onDelete: 'set null',
  }),
  transactionType: text('transaction_type'),
  startTime: integer('start_time').notNull(),
  endTime: integer('end_time'),
  durationMs: integer('duration_ms'),
  status: text('status').notNull().default('in_progress'),
  queryCount: integer('query_count').notNull().default(0),
  errorMessage: text('error_message'),
  metadata: text('metadata', { mode: 'json' }),
  createdAt: integer('created_at')
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer('updated_at')
    .notNull()
    .$defaultFn(() => Date.now()),
});

/**
 * Database Queries table - Infrastructure
 * Tracks individual database query execution
 */
export const databaseQueries = sqliteTable('database_queries', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  transactionId: text('transaction_id').references(
    () => databaseTransactions.id,
    { onDelete: 'cascade' }
  ),
  queryText: text('query_text').notNull(),
  queryType: text('query_type'),
  executionTimeMs: integer('execution_time_ms'),
  rowCount: integer('row_count'),
  status: text('status').notNull(),
  errorMessage: text('error_message'),
  createdAt: integer('created_at')
    .notNull()
    .$defaultFn(() => Date.now()),
});

/**
 * Scheduled Tasks table - Infrastructure
 * Stores scheduled task definitions
 */
export const scheduledTasks = sqliteTable('scheduled_tasks', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  description: text('description'),
  cronExpression: text('cron_expression').notNull(),
  jobName: text('job_name').notNull().unique(),
  sqlCommand: text('sql_command').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  lastRunAt: integer('last_run_at'),
  nextRunAt: integer('next_run_at'),
  runCount: integer('run_count').notNull().default(0),
  errorCount: integer('error_count').notNull().default(0),
  lastError: text('last_error'),
  metadata: text('metadata', { mode: 'json' }),
  createdAt: integer('created_at')
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer('updated_at')
    .notNull()
    .$defaultFn(() => Date.now()),
});

/**
 * Scheduled Task Runs table - Infrastructure
 * Tracks execution history of scheduled tasks
 */
export const scheduledTaskRuns = sqliteTable('scheduled_task_runs', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  taskId: text('task_id')
    .notNull()
    .references(() => scheduledTasks.id, { onDelete: 'cascade' }),
  startTime: integer('start_time').notNull(),
  endTime: integer('end_time'),
  durationMs: integer('duration_ms'),
  status: text('status').notNull(),
  resultSummary: text('result_summary'),
  errorMessage: text('error_message'),
  metadata: text('metadata', { mode: 'json' }),
  createdAt: integer('created_at')
    .notNull()
    .$defaultFn(() => Date.now()),
});

/**
 * Tasks table
 * Used by agent networks to coordinate multi-agent training or distributed jobs
 */
export const tasks = sqliteTable('tasks', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateId()),
  networkId: text('network_id').references(() => networks.id, {
    onDelete: 'cascade',
  }),
  agentId: text('agent_id').references(() => agents.id, {
    onDelete: 'set null',
  }),
  name: text('name').notNull(),
  description: text('description'),
  status: text('status').notNull().default('pending'), // pending, running, completed, failed
  input: text('input', { mode: 'json' }),
  output: text('output', { mode: 'json' }),
  error: text('error'),
  metadata: text('metadata', { mode: 'json' }),
  createdAt: integer('created_at')
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer('updated_at')
    .notNull()
    .$defaultFn(() => Date.now()),
});

// =============================================================================
// Relations
// =============================================================================

export const tasksRelations = relations(tasks, ({ one }) => ({
  network: one(networks, {
    fields: [tasks.networkId],
    references: [networks.id],
  }),
  agent: one(agents, {
    fields: [tasks.agentId],
    references: [agents.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  agents: many(agents),
  threads: many(threads),
  workflows: many(workflows),
  networks: many(networks),
  appBuilderProjects: many(appBuilderProjects),
  files: many(files),
  workflowExecutions: many(workflowExecutions),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const threadsRelations = relations(threads, ({ one, many }) => ({
  user: one(users, {
    fields: [threads.userId],
    references: [users.id],
  }),
  agent: one(agents, {
    fields: [threads.agentId],
    references: [agents.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  thread: one(threads, {
    fields: [messages.threadId],
    references: [threads.id],
  }),
}));

export const agentsRelations = relations(agents, ({ one, many }) => ({
  user: one(users, {
    fields: [agents.userId],
    references: [users.id],
  }),
  model: one(models, {
    fields: [agents.modelId],
    references: [models.id],
  }),
  threads: many(threads),
}));

export const workflowsRelations = relations(workflows, ({ one, many }) => ({
  user: one(users, {
    fields: [workflows.userId],
    references: [users.id],
  }),
  executions: many(workflowExecutions),
}));

export const filesRelations = relations(files, ({ one }) => ({
  user: one(users, {
    fields: [files.userId],
    references: [users.id],
  }),
}));

export const workflowExecutionsRelations = relations(
  workflowExecutions,
  ({ one }) => ({
    workflow: one(workflows, {
      fields: [workflowExecutions.workflowId],
      references: [workflows.id],
    }),
    user: one(users, {
      fields: [workflowExecutions.userId],
      references: [users.id],
    }),
  })
);

// Observability Relations
export const tracesRelations = relations(traces, ({ one, many }) => ({
  user: one(users, {
    fields: [traces.userId],
    references: [users.id],
  }),
  spans: many(spans),
  events: many(events),
}));

export const spansRelations = relations(spans, ({ one, many }) => ({
  trace: one(traces, {
    fields: [spans.traceId],
    references: [traces.id],
  }),
  parentSpan: one(spans, {
    fields: [spans.parentSpanId],
    references: [spans.id],
  }),
  childSpans: many(spans),
  events: many(events),
}));

export const eventsRelations = relations(events, ({ one }) => ({
  trace: one(traces, {
    fields: [events.traceId],
    references: [traces.id],
  }),
  span: one(spans, {
    fields: [events.spanId],
    references: [spans.id],
  }),
}));

export const modelPerformanceRelations = relations(
  modelPerformance,
  ({ one }) => ({
    model: one(models, {
      fields: [modelPerformance.modelId],
      references: [models.id],
    }),
  })
);

export const modelCostsRelations = relations(modelCosts, ({ one }) => ({
  model: one(models, {
    fields: [modelCosts.modelId],
    references: [models.id],
  }),
}));

export const modelEvaluationsRelations = relations(
  modelEvaluations,
  ({ one, many }) => ({
    model: one(models, {
      fields: [modelEvaluations.modelId],
      references: [models.id],
    }),
    metrics: many(evaluationMetrics),
    examples: many(evaluationExamples),
  })
);

export const evaluationMetricsRelations = relations(
  evaluationMetrics,
  ({ one }) => ({
    evaluation: one(modelEvaluations, {
      fields: [evaluationMetrics.evaluationId],
      references: [modelEvaluations.id],
    }),
  })
);

export const evaluationExamplesRelations = relations(
  evaluationExamples,
  ({ one }) => ({
    evaluation: one(modelEvaluations, {
      fields: [evaluationExamples.evaluationId],
      references: [modelEvaluations.id],
    }),
  })
);

// Infrastructure Relations
export const databaseTransactionsRelations = relations(
  databaseTransactions,
  ({ one, many }) => ({
    connection: one(databaseConnections, {
      fields: [databaseTransactions.connectionId],
      references: [databaseConnections.id],
    }),
    queries: many(databaseQueries),
  })
);

export const databaseQueriesRelations = relations(
  databaseQueries,
  ({ one }) => ({
    transaction: one(databaseTransactions, {
      fields: [databaseQueries.transactionId],
      references: [databaseTransactions.id],
    }),
  })
);

export const scheduledTasksRelations = relations(
  scheduledTasks,
  ({ many }) => ({
    runs: many(scheduledTaskRuns),
  })
);

export const scheduledTaskRunsRelations = relations(
  scheduledTaskRuns,
  ({ one }) => ({
    task: one(scheduledTasks, {
      fields: [scheduledTaskRuns.taskId],
      references: [scheduledTasks.id],
    }),
  })
);

// =========================
// TYPE EXPORTS
// =========================
export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;
export type Account = InferSelectModel<typeof accounts>;
export type NewAccount = InferInsertModel<typeof accounts>;
export type Session = InferSelectModel<typeof sessions>;
export type NewSession = InferInsertModel<typeof sessions>;
export type VerificationToken = InferSelectModel<typeof verificationTokens>;
export type NewVerificationToken = InferInsertModel<typeof verificationTokens>;
export type Model = InferSelectModel<typeof models>;
export type NewModel = InferInsertModel<typeof models>;
export type Tool = InferSelectModel<typeof tools>;
export type NewTool = InferInsertModel<typeof tools>;
export type Agent = InferSelectModel<typeof agents>;
export type NewAgent = InferInsertModel<typeof agents>;
export type Thread = InferSelectModel<typeof threads>;
export type NewThread = InferInsertModel<typeof threads>;
export type Message = InferSelectModel<typeof messages>;
export type NewMessage = InferInsertModel<typeof messages>;
export type Workflow = InferSelectModel<typeof workflows>;
export type NewWorkflow = InferInsertModel<typeof workflows>;
export type Network = InferSelectModel<typeof networks>;
export type NewNetwork = InferInsertModel<typeof networks>;
export type AppBuilderProject = InferSelectModel<typeof appBuilderProjects>;
export type NewAppBuilderProject = InferInsertModel<typeof appBuilderProjects>;
export type App = InferSelectModel<typeof apps>;
export type NewApp = InferInsertModel<typeof apps>;
export type AppCodeBlock = InferSelectModel<typeof appCodeBlocks>;
export type NewAppCodeBlock = InferInsertModel<typeof appCodeBlocks>;
export type Integration = InferSelectModel<typeof integrations>;
export type NewIntegration = InferInsertModel<typeof integrations>;
export type Provider = InferSelectModel<typeof providers>;
export type NewProvider = InferInsertModel<typeof providers>;
export type AgentPersona = InferSelectModel<typeof agentPersonas>;
export type NewAgentPersona = InferInsertModel<typeof agentPersonas>;
export type AgentTool = InferSelectModel<typeof agentTools>;
export type NewAgentTool = InferInsertModel<typeof agentTools>;
export type Setting = InferSelectModel<typeof settings>;
export type NewSetting = InferInsertModel<typeof settings>;
export type Document = InferSelectModel<typeof documents>;
export type NewDocument = InferInsertModel<typeof documents>;
export type MemoryThread = InferSelectModel<typeof memoryThreads>;
export type NewMemoryThread = InferInsertModel<typeof memoryThreads>;
export type Embedding = InferSelectModel<typeof embeddings>;
export type NewEmbedding = InferInsertModel<typeof embeddings>;
export type AgentState = InferSelectModel<typeof agentStates>;
export type NewAgentState = InferInsertModel<typeof agentStates>;
export type WorkflowStep = InferSelectModel<typeof workflowSteps>;
export type NewWorkflowStep = InferInsertModel<typeof workflowSteps>;
export type TerminalSession = InferSelectModel<typeof terminalSessions>;
export type NewTerminalSession = InferInsertModel<typeof terminalSessions>;
export type BlogPost = InferSelectModel<typeof blogPosts>;
export type NewBlogPost = InferInsertModel<typeof blogPosts>;
export type MdxDocument = InferSelectModel<typeof mdxDocuments>;
export type NewMdxDocument = InferInsertModel<typeof mdxDocuments>;
export type Content = InferSelectModel<typeof contentTable>;
export type NewContent = InferInsertModel<typeof contentTable>;
export type GqlCache = InferSelectModel<typeof gqlCache>;
export type NewGqlCache = InferInsertModel<typeof gqlCache>;
export type File = InferSelectModel<typeof files>;
export type NewFile = InferInsertModel<typeof files>;
export type VectorEmbedding = InferSelectModel<typeof vectorEmbeddings>;
export type NewVectorEmbedding = InferInsertModel<typeof vectorEmbeddings>;
export type WorkflowExecution = InferSelectModel<typeof workflowExecutions>;
export type NewWorkflowExecution = InferInsertModel<typeof workflowExecutions>;
export type CacheEntry = InferSelectModel<typeof cacheEntries>;
export type NewCacheEntry = InferInsertModel<typeof cacheEntries>;
export type DurableObjectSession = InferSelectModel<
  typeof durableObjectSessions
>;
export type NewDurableObjectSession = InferInsertModel<
  typeof durableObjectSessions
>;
export type WorkerAnalytics = InferSelectModel<typeof workerAnalytics>;
export type NewWorkerAnalytics = InferInsertModel<typeof workerAnalytics>;
export type Trace = InferSelectModel<typeof traces>;
export type NewTrace = InferInsertModel<typeof traces>;
export type FileTreeNode = InferSelectModel<typeof fileTreeNodes>;
export type NewFileTreeNode = InferInsertModel<typeof fileTreeNodes>;
export type Span = InferSelectModel<typeof spans>;
export type NewSpan = InferInsertModel<typeof spans>;
export type Event = InferSelectModel<typeof events>;
export type NewEvent = InferInsertModel<typeof events>;
export type Task = InferSelectModel<typeof tasks>;
export type NewTask = InferInsertModel<typeof tasks>;

// =========================
// VALIDATION FUNCTIONS (Zod)
// =========================
// Example for users table:

export function validateUser(data: unknown): User {
  return UserSchema.parse(data);
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
export function validateModel(data: unknown): Model {
  return ModelSchema.parse(data);
}
export function validateTool(data: unknown): Tool {
  return ToolSchema.parse(data);
}
export function validateAgent(data: unknown): Agent {
  return AgentSchema.parse(data);
}
export function validateThread(data: unknown): Thread {
  return ThreadSchema.parse(data);
}
export function validateMessage(data: unknown): Message {
  return MessageSchema.parse(data);
}
export function validateWorkflow(data: unknown): Workflow {
  return WorkflowSchema.parse(data);
}
export function validateNetwork(data: unknown): Network {
  return NetworkSchema.parse(data);
}
export function validateAppBuilderProject(data: unknown): AppBuilderProject {
  return AppBuilderProjectSchema.parse(data);
}
export function validateApp(data: unknown): App {
  return AppSchema.parse(data);
}
export function validateAppCodeBlock(data: unknown): AppCodeBlock {
  const parsed = AppCodeBlockSchema.parse(data);
  return {
    ...parsed,
    order: parsed.order ?? 0,
  };
}
export function validateIntegration(data: unknown): Integration {
  const parsed = IntegrationSchema.parse(data);
  return {
    ...parsed,
    status: parsed.status ?? '',
  };
}
export function validateProvider(data: unknown): Provider {
  return ProviderSchema.parse(data);
}
export function validateAgentPersona(data: unknown): AgentPersona {
  return AgentPersonaSchema.parse(data);
}
export function validateAgentTool(data: unknown): AgentTool {
  return AgentToolSchema.parse(data);
}
export function validateSetting(data: unknown): Setting {
  return SettingSchema.parse(data);
}
export function validateDocument(data: unknown): Document {
  return DocumentSchema.parse(data);
}
export function validateMemoryThread(data: unknown): MemoryThread {
  return MemoryThreadSchema.parse(data);
}
export function validateEmbedding(data: unknown): Embedding {
  return EmbeddingSchema.parse(data);
}
export function validateAgentState(data: unknown): AgentState {
  return AgentStateSchema.parse(data);
}
export function validateWorkflowStep(data: unknown): WorkflowStep {
  return WorkflowStepSchema.parse(data);
}
export function validateTerminalSession(data: unknown): TerminalSession {
  return TerminalSessionSchema.parse(data);
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
export function validateGqlCache(data: unknown): GqlCache {
  return GqlCacheSchema.parse(data);
}
export function validateFile(data: unknown): File {
  return FileSchema.parse(data);
}
export function validateVectorEmbedding(data: unknown): VectorEmbedding {
  return VectorEmbeddingSchema.parse(data);
}
export function validateWorkflowExecution(data: unknown): WorkflowExecution {
  return WorkflowExecutionSchema.parse(data);
}
export function validateCacheEntry(data: unknown): CacheEntry {
  return CacheEntrySchema.parse(data);
}
export function validateDurableObjectSession(
  data: unknown
): DurableObjectSession {
  return DurableObjectSessionSchema.parse(data);
}
export function validateWorkerAnalytics(data: unknown): WorkerAnalytics {
  return WorkerAnalyticsSchema.parse(data);
}
export function validateTrace(data: unknown): Trace {
  return TraceSchema.parse(data);
}

// Zod schemas for all tables
export const UserSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string().email(),
  emailVerified: z.number().nullable(),
  image: z.string().nullable(),
  role: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export const AccountSchema = z.object({
  userId: z.string(),
  type: z.string(),
  provider: z.string(),
  providerAccountId: z.string(),
  refresh_token: z.string().nullable(),
  access_token: z.string().nullable(),
  expires_at: z.number().nullable(),
  token_type: z.string().nullable(),
  scope: z.string().nullable(),
  id_token: z.string().nullable(),
  session_state: z.string().nullable(),
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
export const ModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  provider: z.string(),
  modelId: z.string(),
  capabilities: z.string().nullable(),
  maxTokens: z.number().nullable(),
  inputCostPer1k: z.string().nullable(),
  outputCostPer1k: z.string().nullable(),
  contextWindow: z.number().nullable(),
  isActive: z.boolean().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export const ToolSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  schema: z.string().nullable(),
  isActive: z.boolean().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export const AgentSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  systemPrompt: z.string().nullable(),
  modelId: z.string().nullable(),
  tools: z.string().nullable(),
  userId: z.string().nullable(),
  isActive: z.boolean().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export const ThreadSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  userId: z.string(),
  agentId: z.string().nullable(),
  metadata: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export const MessageSchema = z.object({
  id: z.string(),
  threadId: z.string(),
  role: z.string(),
  content: z.string().nullable(),
  toolInvocations: z.string().nullable(),
  metadata: z.string().nullable(),
  createdAt: z.number(),
});
export const WorkflowSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  definition: z.string().nullable(),
  userId: z.string().nullable(),
  isActive: z.boolean().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export const NetworkSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  configuration: z.string().nullable(),
  userId: z.string().nullable(),
  isActive: z.boolean().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export const AppBuilderProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  configuration: z.string().nullable(),
  userId: z.string().nullable(),
  isActive: z.boolean().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export const AppSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  type: z.string(),
  code: z.string(),
  parametersSchema: z.string().nullable(),
  metadata: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export const AppCodeBlockSchema = z.object({
  id: z.string(),
  appId: z.string(),
  language: z.string(),
  code: z.string(),
  description: z.string().nullable(),
  order: z.number().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export const IntegrationSchema = z.object({
  id: z.string(),
  userId: z.string().nullable(),
  provider: z.string(),
  name: z.string().nullable(),
  config: z.string().nullable(),
  credentials: z.string().nullable(),
  status: z.string().nullable(),
  lastSyncedAt: z.number().nullable(),
  metadata: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export const ProviderSchema = z.object({
  id: z.string(),
  name: z.string(),
  displayName: z.string().nullable(),
  apiKey: z.string().nullable(),
  baseUrl: z.string().nullable(),
  status: z.string(),
  metadata: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export const AgentPersonaSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  systemPromptTemplate: z.string(),
  modelSettings: z.string().nullable(),
  capabilities: z.string().nullable(),
  tags: z.string().nullable(),
  version: z.number().nullable(),
  isEnabled: z.boolean().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export const AgentToolSchema = z.object({
  agentId: z.string(),
  toolId: z.string(),
  createdAt: z.number(),
});
export const SettingSchema = z.object({
  category: z.string(),
  key: z.string(),
  value: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export const DocumentSchema = z.object({
  id: z.string(),
  content: z.string(),
  embedding: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  documentType: z.string().nullable(),
  userId: z.string().nullable(),
  metadata: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export const MemoryThreadSchema = z.object({
  id: z.string(),
  agentId: z.string().nullable(),
  networkId: z.string().nullable(),
  name: z.string(),
  summary: z.string().nullable(),
  metadata: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export const EmbeddingSchema = z.object({
  id: z.string(),
  vector: z.instanceof(Uint8Array),
  model: z.string().nullable(),
  dimensions: z.number().nullable(),
  createdAt: z.number(),
});
export const AgentStateSchema = z.object({
  memoryThreadId: z.string(),
  agentId: z.string(),
  stateData: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export const WorkflowStepSchema = z.object({
  id: z.string(),
  workflowId: z.string(),
  agentId: z.string(),
  input: z.string().nullable(),
  threadId: z.string(),
  status: z.string(),
  result: z.string().nullable(),
  error: z.string().nullable(),
  metadata: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export const TerminalSessionSchema = z.object({
  id: z.string(),
  appId: z.string(),
  userId: z.string(),
  command: z.string(),
  output: z.string().nullable(),
  status: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export const BlogPostSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  excerpt: z.string().nullable(),
  authorId: z.string().nullable(),
  imageUrl: z.string().nullable(),
  tags: z.string().nullable(),
  featured: z.boolean().nullable(),
  publishedAt: z.number().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export const MdxDocumentSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  excerpt: z.string().nullable(),
  userId: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export const ContentSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string().nullable(),
  subtitle: z.string().nullable(),
  description: z.string().nullable(),
  contentData: z.string().nullable(),
  data: z.string().nullable(),
  imageUrl: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export const GqlCacheSchema = z.object({
  id: z.string(),
  query: z.string(),
  variables: z.string().nullable(),
  response: z.string(),
  createdAt: z.number(),
});
export const FileSchema = z.object({
  id: z.string(),
  appId: z.string().nullable(),
  parentId: z.string().nullable(),
  name: z.string(),
  type: z.string(),
  content: z.string().nullable(),
  r2ObjectKey: z.string().nullable(),
  r2Bucket: z.string().nullable(),
  mimeType: z.string().nullable(),
  size: z.number().nullable(),
  userId: z.string().nullable(),
  associatedEntity: z.string().nullable(),
  associatedEntityId: z.string().nullable(),
  metadata: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export const VectorEmbeddingSchema = z.object({
  id: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  vector: z.string(),
  vectorizeIndex: z.string().nullable(),
  vectorizeId: z.string().nullable(),
  model: z.string(),
  dimensions: z.number(),
  metadata: z.string().nullable(),
  createdAt: z.number(),
});
export const WorkflowExecutionSchema = z.object({
  id: z.string(),
  workflowId: z.string(),
  userId: z.string(),
  status: z.string(),
  currentStepIndex: z.number().nullable(),
  input: z.string().nullable(),
  output: z.string().nullable(),
  error: z.string().nullable(),
  startedAt: z.number().nullable(),
  completedAt: z.number().nullable(),
  duration: z.number().nullable(),
  triggeredBy: z.string().nullable(),
  metadata: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export const CacheEntrySchema = z.object({
  id: z.string(),
  key: z.string(),
  namespace: z.string(),
  kvKey: z.string().nullable(),
  dataType: z.string(),
  size: z.number().nullable(),
  ttl: z.number().nullable(),
  expiresAt: z.number().nullable(),
  hitCount: z.number().nullable(),
  lastAccessed: z.number().nullable(),
  metadata: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export const DurableObjectSessionSchema = z.object({
  id: z.string(),
  objectId: z.string(),
  objectClass: z.string(),
  namespace: z.string(),
  state: z.string().nullable(),
  lastActivity: z.number().nullable(),
  connectionCount: z.number().nullable(),
  isActive: z.boolean().nullable(),
  metadata: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export const WorkerAnalyticsSchema = z.object({
  id: z.string(),
  workerName: z.string(),
  route: z.string().nullable(),
  method: z.string().nullable(),
  statusCode: z.number().nullable(),
  duration: z.number().nullable(),
  cpuTime: z.number().nullable(),
  memoryUsed: z.number().nullable(),
  requestSize: z.number().nullable(),
  responseSize: z.number().nullable(),
  country: z.string().nullable(),
  userAgent: z.string().nullable(),
  timestamp: z.number(),
  metadata: z.string().nullable(),
});
export const TraceSchema = z.object({
  id: z.string(),
  name: z.string(),
  startTime: z.number(),
  endTime: z.number().nullable(),
  durationMs: z.number().nullable(),
  status: z.string(),
  userId: z.string().nullable(),
  sessionId: z.string().nullable(),
  metadata: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export const FileTreeNodeSchema = z.object({
  id: z.string(),
  parentId: z.string().nullable(),
  name: z.string(),
  type: z.string(),
  order: z.number(),
  appId: z.string().nullable(),
  metadata: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export function validateFileTreeNode(data: unknown): FileTreeNode {
  return FileTreeNodeSchema.parse(data);
}
