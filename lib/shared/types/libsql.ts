import * as validation from '../../../db/libsql/validation';

/**
 * LibSQL types for use throughout the project (frontend & backend).
 *
 * - Zod schemas and types: import from here for validation and type safety.
 * - If you need Drizzle types (backend only), import from '../db/libsql/schema'.
 *
 * @module types/libsql
 */

// Zod schemas (for validation)
export const MemoryThreadSchema = validation.MemoryThreadSchema;
export const MessageSchema = validation.MessageSchema;
export const EmbeddingSchema = validation.EmbeddingSchema;
export const AgentStateSchema = validation.AgentStateSchema;
export const WorkflowSchema = validation.WorkflowSchema;
export const WorkflowStepSchema = validation.WorkflowStepSchema;
export const GqlCacheSchema = validation.GqlCacheSchema;
export const AppSchema = validation.AppSchema;
export const UserSchema = validation.UserSchema;
export const IntegrationSchema = validation.IntegrationSchema;
export const AppCodeBlockSchema = validation.AppCodeBlockSchema;
export const FileSchema = validation.FileSchema;
export const TerminalSessionSchema = validation.TerminalSessionSchema;

// Types (for type safety)
export type MemoryThread = validation.MemoryThread;
export type NewMemoryThread = validation.NewMemoryThread;
export type Message = validation.Message;
export type NewMessage = validation.NewMessage;
export type Embedding = validation.Embedding;
export type NewEmbedding = validation.NewEmbedding;
export type AgentState = validation.AgentState;
export type NewAgentState = validation.NewAgentState;
export type Workflow = validation.Workflow;
export type NewWorkflow = validation.NewWorkflow;
export type WorkflowStep = validation.WorkflowStep;
export type NewWorkflowStep = validation.NewWorkflowStep;
export type GqlCache = validation.GqlCache;
export type NewGqlCache = validation.NewGqlCache;
export type App = validation.App;
export type NewApp = validation.NewApp;
export type User = validation.User;
export type NewUser = validation.NewUser;
export type Integration = validation.Integration;
export type NewIntegration = validation.NewIntegration;
export type AppCodeBlock = validation.AppCodeBlock;
export type NewAppCodeBlock = validation.NewAppCodeBlock;
export type File = validation.File;
export type NewFile = validation.NewFile;
export type TerminalSession = validation.TerminalSession;
export type NewTerminalSession = validation.NewTerminalSession;

// If you need Drizzle types (backend only), import from '../db/libsql/schema'.
// Generated on 2025-05-20
