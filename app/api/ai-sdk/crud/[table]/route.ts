import { NextRequest, NextResponse } from 'next/server';
import {
  getData,
  createItem,
  updateItem,
  deleteItem,
} from '@/lib/memory/upstash/supabase-adapter';
import { z } from 'zod';
import {
  AppSchema,
  IntegrationSchema,
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
} from '@/lib/shared/types/supabase';
import {
  MemoryThreadSchema,
  MessageSchema,
  EmbeddingSchema,
  AgentStateSchema,
  GqlCacheSchema,
  FileSchema,
  TerminalSessionSchema,
} from '@/lib/shared/types/libsql';

// Allowed tables for CRUD (expand as needed)
const ALLOWED_TABLES = [
  'apps',
  'integrations',
  'workflows',
  'models',
  'providers',
  'agent_personas',
  'agents',
  'tools',
  'workflow_steps',
  'agent_tools',
  'settings',
  'blog_posts',
  'mdx_documents',
  'memory_threads',
  'messages',
  'embeddings',
  'agent_states',
  'gql_cache',
  'files',
  'terminal_sessions',
];

// Table to Zod schema mapping (source of truth: types files)
const TABLE_SCHEMAS: Record<string, z.ZodTypeAny> = {
  apps: AppSchema,
  integrations: IntegrationSchema,
  workflows: WorkflowSchema,
  models: ModelSchema,
  providers: ProviderSchema,
  agent_personas: AgentPersonaSchema,
  agents: AgentSchema,
  tools: ToolSchema,
  workflow_steps: WorkflowStepSchema,
  agent_tools: AgentToolSchema,
  settings: SettingSchema,
  blog_posts: BlogPostSchema,
  mdx_documents: MdxDocumentSchema,
  memory_threads: MemoryThreadSchema,
  messages: MessageSchema,
  embeddings: EmbeddingSchema,
  agent_states: AgentStateSchema,
  gql_cache: GqlCacheSchema,
  files: FileSchema,
  terminal_sessions: TerminalSessionSchema,
};

function getTableName(param: string): string {
  if (!ALLOWED_TABLES.includes(param)) {
    throw new Error('Table not allowed');
  }
  return param;
}

function getTableSchema(table: string) {
  const schema = TABLE_SCHEMAS[table];
  if (!schema) throw new Error(`No Zod schema for table: ${table}`);
  return schema;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { table: string } }
) {
  try {
    const table = getTableName(params.table);
    const data = await getData(table);
    const schema = getTableSchema(table);
    const validated = z.array(schema).safeParse(data);
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json({ [table]: validated.data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { table: string } }
) {
  try {
    const table = getTableName(params.table);
    const schema = getTableSchema(table);
    const body = await req.json();
    const now = new Date().toISOString();
    // Remove id, created_at, updated_at from input before validation
    const rest = { ...body };
    delete rest.id;
    delete rest.created_at;
    delete rest.updated_at;
    const parsed = schema.parse(rest);
    const item = await createItem(table, {
      ...parsed,
      created_at: now,
      updated_at: now,
    });
    const validated = schema.safeParse(item);
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(validated.data, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { table: string } }
) {
  try {
    const table = getTableName(params.table);
    const schema = getTableSchema(table);
    const url = new URL(req.url);
    const id = url.pathname.split('/').pop();
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const body = await req.json();
    // For PUT, allow partial update: only validate present fields
    let parsed;
    if (schema instanceof z.ZodObject) {
      parsed = schema.partial().parse(body);
    } else {
      parsed = schema.parse(body);
    }
    const updated = await updateItem(table, id, {
      ...parsed,
      updated_at: new Date().toISOString(),
    });
    const validated = schema.safeParse(updated);
    if (!validated.success)
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.errors },
        { status: 400 }
      );
    return NextResponse.json(validated.data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { table: string } }
) {
  try {
    const table = getTableName(params.table);
    const url = new URL(req.url);
    const id = url.pathname.split('/').pop();
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const result = await deleteItem(table, id);
    if (!result)
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    );
  }
}
// Generated on 2025-05-18 - CRUD now fully synced with validation schemas for all core tables.
