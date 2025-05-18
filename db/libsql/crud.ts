import { drizzle } from 'drizzle-orm/libsql';
import { eq, desc, and, sql } from 'drizzle-orm';
import { WorkflowSchema, WorkflowStepSchema } from './validation';
import {
  memory_threads,
  messages,
  embeddings,
  agent_states,
  workflows,
  workflow_steps,
  apps,
  users,
  integrations,
  app_code_blocks,
  files,
  terminal_sessions,
  gqlCache,
} from './schema';
import * as validation from './validation';

// Helper for robust vector conversion
function toUint8Array(vec: unknown): Uint8Array {
  if (vec instanceof Uint8Array) return vec;
  if (
    typeof Buffer !== 'undefined' &&
    typeof Buffer.isBuffer === 'function' &&
    Buffer.isBuffer(vec)
  )
    return new Uint8Array(vec.buffer, vec.byteOffset, vec.byteLength);
  if (vec instanceof ArrayBuffer) return new Uint8Array(vec);
  if (Array.isArray(vec)) return new Uint8Array(vec);
  // Accept ArrayBufferLike (e.g., SharedArrayBuffer) as fallback
  if (
    vec &&
    typeof vec === 'object' &&
    'byteLength' in vec &&
    'byteOffset' in vec &&
    'buffer' in vec
  ) {
    try {
      return new Uint8Array(
        vec.buffer as ArrayBufferLike,
        vec.byteOffset as number,
        vec.byteLength as number
      );
    } catch {}
  }
  throw new Error('Invalid vector type');
}

export class DrizzleCrud {
  private db: ReturnType<typeof drizzle>;

  constructor(db: ReturnType<typeof drizzle>) {
    this.db = db;
  }

  async getMessages(memory_thread_id: string): Promise<validation.Message[]> {
    const rows = await this.db
      .select()
      .from(messages)
      .where(eq(messages.memory_thread_id, memory_thread_id))
      .orderBy(messages.created_at)
      .execute();

    return (
      rows.map(
        (row: typeof messages.$inferSelect) =>
          ({
            ...row,
            id: row.id.toString(),
            memory_thread_id: row.memory_thread_id.toString(),
            role: row.role.toString(),
            content: row.content.toString(),
            created_at: row.created_at.toString(),
            ...(row.tool_call_id && {
              tool_call_id: row.tool_call_id.toString(),
            }),
            ...(row.tool_name && { tool_name: row.tool_name.toString() }),
            ...(row.token_count && { token_count: Number(row.token_count) }),
            ...(row.embedding_id && {
              embedding_id: row.embedding_id.toString(),
            }),
            ...(row.metadata && { metadata: row.metadata.toString() }),
          }) as validation.Message
      ) || []
    );
  }

  // Memory Threads
  async createMemoryThread(
    data: validation.NewMemoryThread
  ): Promise<validation.MemoryThread[]> {
    const rows = await this.db
      .insert(memory_threads)
      .values(data)
      .returning()
      .execute();

    return rows.map(
      (row: typeof memory_threads.$inferSelect) =>
        ({
          ...row,
          id: row.id.toString(),
          created_at: row.created_at.toString(),
          updated_at: row.updated_at.toString(),
          ...(row.agent_id && { agent_id: row.agent_id.toString() }),
          ...(row.network_id && { network_id: row.network_id.toString() }),
          ...(row.name && { name: row.name.toString() }),
          ...(row.summary && { summary: row.summary.toString() }),
          ...(row.metadata && { metadata: row.metadata.toString() }),
        }) as validation.MemoryThread
    );
  }

  async getMemoryThread(id: string): Promise<validation.MemoryThread | null> {
    const row = await this.db
      .select()
      .from(memory_threads)
      .where(eq(memory_threads.id, id))
      .execute();

    if (!row || row.length === 0) return null;
    const memoryThread = row[0];
    const result: validation.MemoryThread = {
      id: memoryThread.id.toString(),
      agent_id: memoryThread.agent_id?.toString() ?? null,
      network_id: memoryThread.network_id?.toString() ?? null,
      name: memoryThread.name,
      summary: memoryThread.summary ?? null,
      metadata: memoryThread.metadata ?? null,
      created_at: memoryThread.created_at.toString(),
      updated_at: memoryThread.updated_at.toString(),
    };
    return result;
  }

  async getMemoryThreads(): Promise<validation.MemoryThread[]> {
    const rows = await this.db.select().from(memory_threads).execute();

    return rows.map(
      (row: typeof memory_threads.$inferSelect) =>
        ({
          ...row,
          id: row.id.toString(),
          created_at: row.created_at.toString(),
          updated_at: row.updated_at.toString(),
          ...(row.agent_id && { agent_id: row.agent_id.toString() }),
          ...(row.network_id && { network_id: row.network_id.toString() }),
          ...(row.name && { name: row.name.toString() }),
          ...(row.summary && { summary: row.summary.toString() }),
          ...(row.metadata && { metadata: row.metadata.toString() }),
        }) as validation.MemoryThread
    );
  }

  async updateMemoryThread(
    id: string,
    data: Partial<validation.NewMemoryThread>
  ): Promise<validation.MemoryThread[]> {
    const rows = await this.db
      .update(memory_threads)
      .set(data)
      .where(eq(memory_threads.id, id))
      .returning()
      .execute();

    return rows.map(
      (row: typeof memory_threads.$inferSelect) =>
        ({
          ...row,
          id: row.id.toString(),
          created_at: row.created_at.toString(),
          updated_at: row.updated_at.toString(),
          ...(row.agent_id && { agent_id: row.agent_id.toString() }),
          ...(row.network_id && { network_id: row.network_id.toString() }),
          ...(row.name && { name: row.name.toString() }),
          ...(row.summary && { summary: row.summary.toString() }),
          ...(row.metadata && { metadata: row.metadata.toString() }),
        }) as validation.MemoryThread
    );
  }

  async deleteMemoryThread(id: string): Promise<void> {
    await this.db
      .delete(memory_threads)
      .where(eq(memory_threads.id, id))
      .execute();
  }

  async deleteMessagesByThreadId(threadId: string): Promise<void> {
    await this.db
      .delete(messages)
      .where(eq(messages.memory_thread_id, threadId))
      .execute();
  }

  // Messages
  async createMessage(
    data: validation.NewMessage
  ): Promise<validation.Message> {
    const validatedData = validation.MessageSchema.parse(data);
    const result = await this.db
      .insert(messages)
      .values(validatedData)
      .returning();

    return result[0] as validation.Message;
  }

  async getMessagesByThreadId(threadId: string): Promise<validation.Message[]> {
    const parsedThreadId =
      validation.MessageSchema.shape.memory_thread_id.parse(threadId);
    const rows = await this.db
      .select()
      .from(messages)
      .where(eq(messages.memory_thread_id, parsedThreadId))
      .execute();

    return rows.map((row: typeof messages.$inferSelect) =>
      validation.MessageSchema.parse(row)
    );
  }

  async getMessage(id: string): Promise<validation.Message | null> {
    const row = await this.db
      .select()
      .from(messages)
      .where(eq(messages.id, id))
      .get();
    if (!row) return null;
    return validation.MessageSchema.parse(row);
  }

  async updateMessage(
    id: string,
    data: Partial<validation.NewMessage>
  ): Promise<validation.Message | null> {
    const currentMessage = await this.getMessage(id);
    if (!currentMessage) return null;

    const validatedData = validation.MessageSchema.parse({
      ...currentMessage,
      ...data,
      id,
    });

    const result = await this.db
      .update(messages)
      .set(validatedData)
      .where(eq(messages.id, id))
      .returning()
      .execute();
    return result[0] || null;
  }

  async deleteMessage(id: string): Promise<boolean> {
    const result = await this.db
      .delete(messages)
      .where(eq(messages.id, id))
      .execute();
    return result.rowsAffected > 0;
  }

  // Embeddings CRUD (robust, deduplicated, type-safe)
  async createEmbedding(
    data: validation.NewEmbedding
  ): Promise<validation.Embedding> {
    const validatedData = validation.EmbeddingSchema.parse(data);
    const result = await this.db
      .insert(embeddings)
      .values(validatedData)
      .returning()
      .execute();
    return {
      ...result[0],
      vector: new Uint8Array(toUint8Array(result[0].vector)),
    };
  }

  async getEmbedding(id: string): Promise<validation.Embedding | null> {
    const row = await this.db
      .select()
      .from(embeddings)
      .where(eq(embeddings.id, id))
      .get();
    if (!row) return null;
    return {
      ...row,
      vector: new Uint8Array(toUint8Array(row.vector)),
    };
  }

  async updateEmbedding(
    id: string,
    data: Partial<validation.NewEmbedding>
  ): Promise<validation.Embedding | null> {
    const currentEmbedding = await this.getEmbedding(id);
    if (!currentEmbedding) return null;
    const validatedData = validation.EmbeddingSchema.parse({
      ...currentEmbedding,
      ...data,
      id,
    });
    // Store as Buffer for DB if possible
    const dbData = {
      ...validatedData,
      vector:
        typeof Buffer !== 'undefined' &&
        validatedData.vector instanceof Uint8Array
          ? Buffer.from(validatedData.vector)
          : validatedData.vector,
    };
    const result = await this.db
      .update(embeddings)
      .set(dbData)
      .where(eq(embeddings.id, id))
      .returning()
      .execute();
    if (!result[0]) return null;
    return {
      ...result[0],
      vector: new Uint8Array(toUint8Array(result[0].vector)),
    };
  }

  async deleteEmbedding(id: string): Promise<boolean> {
    const result = await this.db
      .delete(embeddings)
      .where(eq(embeddings.id, id))
      .execute();
    return result.rowsAffected > 0;
  }

  // Agent States
  async createAgentState(data: validation.NewAgentState) {
    return this.db.insert(agent_states).values(data).returning();
  }

  async getAgentState(memory_thread_id: string, agent_id: string) {
    return this.db
      .select()
      .from(agent_states)
      .where(
        and(
          eq(agent_states.memory_thread_id, memory_thread_id),
          eq(agent_states.agent_id, agent_id)
        )
      )
      .get();
  }

  /**
   * Updates an agent state by memory_thread_id and agent_id.
   * @param memory_thread_id - The memory thread ID.
   * @param agent_id - The agent ID.
   * @param data - Partial update data for the agent state.
   * @returns The updated agent state or null if not found.
   */
  async updateAgentState(
    memory_thread_id: string,
    agent_id: string,
    data: Partial<validation.NewAgentState>
  ): Promise<validation.AgentState | null> {
    const current = await this.getAgentState(memory_thread_id, agent_id);
    if (!current) return null;
    const validated = validation.AgentStateSchema.parse({
      ...current,
      ...data,
      memory_thread_id,
      agent_id,
    });
    const result = await this.db
      .update(agent_states)
      .set(validated)
      .where(
        and(
          eq(agent_states.memory_thread_id, memory_thread_id),
          eq(agent_states.agent_id, agent_id)
        )
      )
      .returning()
      .execute();
    return result[0] || null;
  }

  /**
   * Deletes an agent state by memory_thread_id and agent_id.
   * @param memory_thread_id - The memory thread ID.
   * @param agent_id - The agent ID.
   * @returns True if deleted, false otherwise.
   */
  async deleteAgentState(
    memory_thread_id: string,
    agent_id: string
  ): Promise<boolean> {
    const result = await this.db
      .delete(agent_states)
      .where(
        and(
          eq(agent_states.memory_thread_id, memory_thread_id),
          eq(agent_states.agent_id, agent_id)
        )
      )
      .execute();
    return result.rowsAffected > 0;
  }

  // Workflows
  async createWorkflow(data: validation.NewWorkflow) {
    const validatedData = WorkflowSchema.parse(data);
    const result = await this.db
      .insert(workflows)
      .values(validatedData)
      .returning();
    return result[0];
  }

  async getWorkflow(id: string) {
    const row = await this.db
      .select()
      .from(workflows)
      .where(eq(workflows.id, id))
      .get();
    if (!row) return null;
    return row;
  }

  /**
   * Lists all workflows.
   * @returns Array of Workflow.
   */
  async listWorkflows(): Promise<validation.Workflow[]> {
    const rows = await this.db.select().from(workflows).execute();
    return rows.map((row: typeof workflows.$inferSelect) =>
      validation.WorkflowSchema.parse(row)
    );
  }

  /**
   * Updates a workflow by ID.
   * @param id - The workflow ID.
   * @param data - Partial update data for the workflow.
   * @returns The updated Workflow or null if not found.
   */
  async updateWorkflow(
    id: string,
    data: Partial<validation.NewWorkflow>
  ): Promise<validation.Workflow | null> {
    const row = await this.getWorkflow(id);
    if (!row) return null;
    const validated = validation.WorkflowSchema.parse({
      ...row,
      ...data,
      id,
    });
    const result = await this.db
      .update(workflows)
      .set(validated)
      .where(eq(workflows.id, id))
      .returning()
      .execute();
    return result[0] || null;
  }

  /**
   * Deletes a workflow by ID.
   * @param id - The workflow ID.
   * @returns True if deleted, false otherwise.
   */
  async deleteWorkflow(id: string): Promise<boolean> {
    const result = await this.db
      .delete(workflows)
      .where(eq(workflows.id, id))
      .execute();
    return result.rowsAffected > 0;
  }

  // Workflow Steps
  async createWorkflowStep(data: validation.NewWorkflowStep) {
    const validatedData = WorkflowStepSchema.parse(data);
    const result = await this.db
      .insert(workflow_steps)
      .values(validatedData)
      .returning();
    return result[0] as validation.WorkflowStep;
  }

  async getWorkflowSteps(workflowId: string) {
    const rows = await this.db
      .select()
      .from(workflow_steps)
      .where(eq(workflow_steps.workflow_id, workflowId))
      .orderBy(workflow_steps.id);
    return rows.map(
      (row) => WorkflowStepSchema.parse(row) as validation.WorkflowStep
    );
  }

  /**
   * Gets a workflow step by ID.
   * @param id - The workflow step ID.
   * @returns The WorkflowStep or null if not found.
   */
  async getWorkflowStep(id: string): Promise<validation.WorkflowStep | null> {
    const row = await this.db
      .select()
      .from(workflow_steps)
      .where(eq(workflow_steps.id, id))
      .get();
    if (!row) return null;
    return validation.WorkflowStepSchema.parse(row);
  }

  /**
   * Lists all workflow steps for a workflow.
   * @param workflowId - The workflow ID.
   * @returns Array of WorkflowStep.
   */
  async listWorkflowSteps(
    workflowId: string
  ): Promise<validation.WorkflowStep[]> {
    const rows = await this.db
      .select()
      .from(workflow_steps)
      .where(eq(workflow_steps.workflow_id, workflowId))
      .orderBy(workflow_steps.id)
      .execute();
    return rows.map((row: typeof workflow_steps.$inferSelect) =>
      validation.WorkflowStepSchema.parse(row)
    );
  }

  /**
   * Updates a workflow step by ID.
   * @param id - The workflow step ID.
   * @param data - Partial update data for the workflow step.
   * @returns The updated WorkflowStep or null if not found.
   */
  async updateWorkflowStep(
    id: string,
    data: Partial<validation.NewWorkflowStep>
  ): Promise<validation.WorkflowStep | null> {
    const row = await this.getWorkflowStep(id);
    if (!row) return null;
    const validated = validation.WorkflowStepSchema.parse({
      ...row,
      ...data,
      id,
    });
    const result = await this.db
      .update(workflow_steps)
      .set(validated)
      .where(eq(workflow_steps.id, id))
      .returning()
      .execute();
    return result[0] || null;
  }

  /**
   * Deletes a workflow step by ID.
   * @param id - The workflow step ID.
   * @returns True if deleted, false otherwise.
   */
  async deleteWorkflowStep(id: string): Promise<boolean> {
    const result = await this.db
      .delete(workflow_steps)
      .where(eq(workflow_steps.id, id))
      .execute();
    return result.rowsAffected > 0;
  }

  // Apps
  async createApp(data: validation.NewApp): Promise<validation.App> {
    const validatedData = validation.AppSchema.parse(data);
    const result = await this.db.insert(apps).values(validatedData).returning();
    return result[0];
  }

  async getApp(id: string): Promise<validation.App | null> {
    const row = await this.db.select().from(apps).where(eq(apps.id, id)).get();
    if (!row) return null;
    return row;
  }

  async listApps(): Promise<validation.App[]> {
    const rows = await this.db.select().from(apps).execute();
    return rows.map((row: typeof apps.$inferSelect) =>
      validation.AppSchema.parse(row)
    );
  }

  async updateApp(
    id: string,
    data: Partial<validation.NewApp>
  ): Promise<validation.App | null> {
    const current = await this.getApp(id);
    if (!current) return null;
    const validated = validation.AppSchema.parse({ ...current, ...data, id });
    const result = await this.db
      .update(apps)
      .set(validated)
      .where(eq(apps.id, id))
      .returning()
      .execute();
    return result[0] || null;
  }

  async deleteApp(id: string): Promise<boolean> {
    const result = await this.db.delete(apps).where(eq(apps.id, id)).execute();
    return result.rowsAffected > 0;
  }

  // Users
  async createUser(data: validation.NewUser): Promise<validation.User> {
    const validatedData = validation.UserSchema.parse(data);
    const result = await this.db
      .insert(users)
      .values(validatedData)
      .returning();
    return result[0];
  }

  async getUser(id: string): Promise<validation.User | null> {
    const row = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .get();
    if (!row) return null;
    return row;
  }

  async listUsers(): Promise<validation.User[]> {
    const rows = await this.db.select().from(users).execute();
    return rows.map((row: typeof users.$inferSelect) =>
      validation.UserSchema.parse(row)
    );
  }

  async updateUser(
    id: string,
    data: Partial<validation.NewUser>
  ): Promise<validation.User | null> {
    const current = await this.getUser(id);
    if (!current) return null;
    const validated = validation.UserSchema.parse({ ...current, ...data, id });
    const result = await this.db
      .update(users)
      .set(validated)
      .where(eq(users.id, id))
      .returning()
      .execute();
    return result[0] || null;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await this.db
      .delete(users)
      .where(eq(users.id, id))
      .execute();
    return result.rowsAffected > 0;
  }

  // Integrations
  async createIntegration(
    data: validation.NewIntegration
  ): Promise<validation.Integration> {
    const validatedData = validation.IntegrationSchema.parse(data);
    const result = await this.db
      .insert(integrations)
      .values(validatedData)
      .returning();
    return result[0];
  }

  async getIntegration(id: string): Promise<validation.Integration | null> {
    const row = await this.db
      .select()
      .from(integrations)
      .where(eq(integrations.id, id))
      .get();
    if (!row) return null;
    return row;
  }

  async getIntegrationsByUserId(
    userId: string
  ): Promise<validation.Integration[]> {
    const rows = await this.db
      .select()
      .from(integrations)
      .where(eq(integrations.user_id, userId))
      .execute();
    return rows.map((row) => validation.IntegrationSchema.parse(row));
  }

  async updateIntegration(
    id: string,
    data: Partial<validation.NewIntegration>
  ): Promise<validation.Integration | null> {
    const currentIntegration = await this.getIntegration(id);
    if (!currentIntegration) return null;

    const validatedData = validation.IntegrationSchema.parse({
      ...currentIntegration,
      ...data,
      id,
    });

    const result = await this.db
      .update(integrations)
      .set(validatedData)
      .where(eq(integrations.id, id))
      .returning()
      .execute();
    return result[0] || null;
  }

  async deleteIntegration(id: string): Promise<void> {
    await this.db.delete(integrations).where(eq(integrations.id, id));
  }

  // App Code Blocks
  async createAppCodeBlock(data: validation.NewAppCodeBlock) {
    const validatedData = validation.AppCodeBlockSchema.parse(data);
    const result = await this.db
      .insert(app_code_blocks)
      .values(validatedData)
      .returning();

    return result[0] as validation.AppCodeBlock;
  }

  async getAppCodeBlock(id: string): Promise<validation.AppCodeBlock | null> {
    const row = await this.db
      .select()
      .from(app_code_blocks)
      .where(eq(app_code_blocks.id, id))
      .get();
    if (!row) return null;
    return row;
  }

  async getAppCodeBlocks(appId: string) {
    const rows = await this.db
      .select()
      .from(app_code_blocks)
      .where(eq(app_code_blocks.app_id, appId))
      .orderBy(app_code_blocks.order)
      .execute();
    return rows.map((row: typeof app_code_blocks.$inferSelect) =>
      validation.AppCodeBlockSchema.parse(row)
    );
  }

  /**
   * Lists all app code blocks for a given app ID.
   * @param appId - The app ID.
   * @returns Array of AppCodeBlock.
   */
  async listAppCodeBlocks(appId: string): Promise<validation.AppCodeBlock[]> {
    const rows = await this.db
      .select()
      .from(app_code_blocks)
      .where(eq(app_code_blocks.app_id, appId))
      .orderBy(app_code_blocks.order)
      .execute();
    return rows.map((row: typeof app_code_blocks.$inferSelect) =>
      validation.AppCodeBlockSchema.parse(row)
    );
  }

  /**
   * Updates an app code block by ID.
   * @param id - The code block ID.
   * @param data - Partial update data for the code block.
   * @returns The updated AppCodeBlock or null if not found.
   */
  async updateAppCodeBlock(
    id: string,
    data: Partial<validation.NewAppCodeBlock>
  ): Promise<validation.AppCodeBlock | null> {
    const current = await this.getAppCodeBlock(id);
    if (!current) return null;
    const validated = validation.AppCodeBlockSchema.parse({
      ...current,
      ...data,
      id,
    });
    const result = await this.db
      .update(app_code_blocks)
      .set(validated)
      .where(eq(app_code_blocks.id, id))
      .returning()
      .execute();
    return result[0] || null;
  }

  /**
   * Deletes an app code block by ID.
   * @param id - The code block ID.
   * @returns True if deleted, false otherwise.
   */
  async deleteAppCodeBlock(id: string): Promise<boolean> {
    const result = await this.db
      .delete(app_code_blocks)
      .where(eq(app_code_blocks.id, id))
      .execute();
    return result.rowsAffected > 0;
  }

  // Files
  async createFile(data: validation.NewFile): Promise<validation.File> {
    const validatedData = validation.FileSchema.parse(data);
    const result = await this.db
      .insert(files)
      .values(validatedData)
      .returning()
      .execute();
    return result[0];
  }

  async getFilesByAppId(appId: string): Promise<validation.File[]> {
    return this.db
      .select()
      .from(files)
      .where(eq(files.app_id, appId))
      .execute()
      .then((rows) => rows.map((row) => validation.FileSchema.parse(row)));
  }

  async getFile(id: string): Promise<validation.File | null> {
    const row = await this.db
      .select()
      .from(files)
      .where(eq(files.id, id))
      .get();
    if (!row) return null;
    return validation.FileSchema.parse(row);
  }

  async updateFile(
    id: string,
    data: Partial<validation.NewFile>
  ): Promise<validation.File | null> {
    const currentFile = await this.getFile(id);
    if (!currentFile) return null;

    const validatedData = validation.FileSchema.parse({
      ...currentFile,
      ...data,
      id,
    });

    const result = await this.db
      .update(files)
      .set(validatedData)
      .where(eq(files.id, id))
      .returning()
      .execute();
    return result[0] || null;
  }

  async deleteFile(id: string): Promise<boolean> {
    const result = await this.db
      .delete(files)
      .where(eq(files.id, id))
      .execute();
    return result.rowsAffected > 0;
  }

  // Terminal Sessions
  async createTerminalSession(
    data: validation.NewTerminalSession
  ): Promise<validation.TerminalSession> {
    const validatedData = validation.TerminalSessionSchema.parse(data);
    const result = await this.db
      .insert(terminal_sessions)
      .values(validatedData)
      .returning();
    return result[0];
  }

  async getTerminalSession(
    id: string
  ): Promise<validation.TerminalSession | null> {
    const row = await this.db
      .select()
      .from(terminal_sessions)
      .where(eq(terminal_sessions.id, id))
      .get();
    if (!row) return null;
    return validation.TerminalSessionSchema.parse(row);
  }

  async getTerminalSessionsByAppId(
    appId: string
  ): Promise<validation.TerminalSession[]> {
    const rows = await this.db
      .select()
      .from(terminal_sessions)
      .where(eq(terminal_sessions.app_id, sql<string>`${appId}`))
      .orderBy(desc(terminal_sessions.created_at))
      .execute();
    return rows.map((row) => validation.TerminalSessionSchema.parse(row));
  }

  async updateTerminalSession(
    id: string,
    data: Partial<validation.NewTerminalSession>
  ): Promise<validation.TerminalSession | null> {
    const currentSession = await this.getTerminalSession(id);
    if (!currentSession) return null;

    const validatedData = validation.TerminalSessionSchema.parse({
      ...currentSession,
      ...data,
      id,
    });

    const result = await this.db
      .update(terminal_sessions)
      .set(validatedData)
      .where(eq(terminal_sessions.id, id))
      .returning()
      .execute();
    return result[0] || null;
  }

  async deleteTerminalSession(id: string): Promise<boolean> {
    const result = await this.db
      .delete(terminal_sessions)
      .where(eq(terminal_sessions.id, id))
      .execute();
    return result.rowsAffected > 0;
  }

  // GqlCache CRUD
  /**
   * Creates a new GqlCache entry.
   * @param data - The new GqlCache data.
   * @returns The created GqlCache.
   */
  async createGqlCache(
    data: validation.NewGqlCache
  ): Promise<validation.GqlCache> {
    const validatedData = validation.GqlCacheSchema.parse(data);
    const result = await this.db
      .insert(gqlCache)
      .values(validatedData)
      .returning()
      .execute();
    return result[0];
  }

  /**
   * Gets a GqlCache entry by ID.
   * @param id - The GqlCache ID.
   * @returns The GqlCache or null if not found.
   */
  async getGqlCache(id: string): Promise<validation.GqlCache | null> {
    const row = await this.db
      .select()
      .from(gqlCache)
      .where(eq(gqlCache.id, id))
      .get();
    if (!row) return null;
    return validation.GqlCacheSchema.parse(row);
  }

  /**
   * Lists all GqlCache entries.
   * @returns Array of GqlCache.
   */
  async listGqlCache(): Promise<validation.GqlCache[]> {
    const rows = await this.db.select().from(gqlCache).execute();
    return rows.map((row: typeof gqlCache.$inferSelect) =>
      validation.GqlCacheSchema.parse(row)
    );
  }

  /**
   * Updates a GqlCache entry by ID.
   * @param id - The GqlCache ID.
   * @param data - Partial update data for the GqlCache.
   * @returns The updated GqlCache or null if not found.
   */
  async updateGqlCache(
    id: string,
    data: Partial<validation.NewGqlCache>
  ): Promise<validation.GqlCache | null> {
    const current = await this.getGqlCache(id);
    if (!current) return null;
    const validated = validation.GqlCacheSchema.parse({
      ...current,
      ...data,
      id,
    });
    const result = await this.db
      .update(gqlCache)
      .set(validated)
      .where(eq(gqlCache.id, id))
      .returning()
      .execute();
    return result[0] || null;
  }

  /**
   * Deletes a GqlCache entry by ID.
   * @param id - The GqlCache ID.
   * @returns True if deleted, false otherwise.
   */
  async deleteGqlCache(id: string): Promise<boolean> {
    const result = await this.db
      .delete(gqlCache)
      .where(eq(gqlCache.id, id))
      .execute();
    return result.rowsAffected > 0;
  }
}
