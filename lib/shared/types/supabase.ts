import { z } from 'zod';
import {
  UserSchema,
  AppSchema,
  AppCodeBlockSchema,
  IntegrationSchema,
  FileSchema,
  TerminalSessionSchema,
  WorkflowSchema,
  ModelSchema,
  ProviderSchema,
  AgentPersonaSchema,
  AgentSchema,
  ToolSchema,
  WorkflowStepSchema,
  AgentToolSchema,
  SettingSchema,
  BlogPostSchema,
  MdxDocumentSchema,
} from '../../../db/supabase/validation';

// Supabase types derived from Zod schemas
export type User = z.infer<typeof UserSchema>;
export type NewUser = z.infer<typeof UserSchema>;

export type App = z.infer<typeof AppSchema>;
export type NewApp = z.infer<typeof AppSchema>;

export type AppCodeBlock = z.infer<typeof AppCodeBlockSchema>;
export type NewAppCodeBlock = z.infer<typeof AppCodeBlockSchema>;

export type Integration = z.infer<typeof IntegrationSchema>;
export type NewIntegration = z.infer<typeof IntegrationSchema>;

export type File = z.infer<typeof FileSchema>;
export type NewFile = z.infer<typeof FileSchema>;

export type TerminalSession = z.infer<typeof TerminalSessionSchema>;
export type NewTerminalSession = z.infer<typeof TerminalSessionSchema>;

export type Workflow = z.infer<typeof WorkflowSchema>;
export type NewWorkflow = z.infer<typeof WorkflowSchema>;

export type Model = z.infer<typeof ModelSchema>;
export type NewModel = z.infer<typeof ModelSchema>;

export type Provider = z.infer<typeof ProviderSchema>;
export type NewProvider = z.infer<typeof ProviderSchema>;

export type AgentPersona = z.infer<typeof AgentPersonaSchema>;
export type NewAgentPersona = z.infer<typeof AgentPersonaSchema>;

export type Agent = z.infer<typeof AgentSchema>;
export type NewAgent = z.infer<typeof AgentSchema>;

export type Tool = z.infer<typeof ToolSchema>;
export type NewTool = z.infer<typeof ToolSchema>;

export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;
export type NewWorkflowStep = z.infer<typeof WorkflowStepSchema>;

export type AgentTool = z.infer<typeof AgentToolSchema>;
export type NewAgentTool = z.infer<typeof AgentToolSchema>;

export type Setting = z.infer<typeof SettingSchema>;
export type NewSetting = z.infer<typeof SettingSchema>;

export type BlogPost = z.infer<typeof BlogPostSchema>;
export type NewBlogPost = z.infer<typeof BlogPostSchema>;

export type MdxDocument = z.infer<typeof MdxDocumentSchema>;
export type NewMdxDocument = z.infer<typeof MdxDocumentSchema>;

// Export all Zod schemas for use in routes and validation
export {
  UserSchema,
  AppSchema,
  AppCodeBlockSchema,
  IntegrationSchema,
  FileSchema,
  TerminalSessionSchema,
  WorkflowSchema,
  ModelSchema,
  ProviderSchema,
  AgentPersonaSchema,
  AgentSchema,
  ToolSchema,
  WorkflowStepSchema,
  AgentToolSchema,
  SettingSchema,
  BlogPostSchema,
  MdxDocumentSchema,
};
