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
} from 'drizzle-orm/sqlite-core';
import {
  relations,
  type InferSelectModel,
  type InferInsertModel,
} from 'drizzle-orm';
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
    .$defaultFn(() => generateId()),
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
    .$defaultFn(() => generateId()),
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
    .$defaultFn(() => generateId()),
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
  triggeredBy: text('triggered_by'), // 'user', 'schedule', 'webhook', etc.
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
    .$defaultFn(() => generateId()),
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
    .$defaultFn(() => generateId()),
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
    .$defaultFn(() => generateId()),
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

// =============================================================================
// Relations
// =============================================================================

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

// =============================================================================
// Type Exports
// =============================================================================

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

export type File = InferSelectModel<typeof files>;
export type NewFile = InferInsertModel<typeof files>;

export type Embedding = InferSelectModel<typeof embeddings>;
export type NewEmbedding = InferInsertModel<typeof embeddings>;

export type WorkflowExecution = InferSelectModel<typeof workflowExecutions>;
export type NewWorkflowExecution = InferInsertModel<typeof workflowExecutions>;

export type CacheEntry = InferSelectModel<typeof cacheEntries>;
export type NewCacheEntry = InferInsertModel<typeof cacheEntries>;
