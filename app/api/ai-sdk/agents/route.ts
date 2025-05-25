import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error-handler';
import { createTrace } from '@/lib/langfuse-integration';
import { generateId } from 'ai';
import { z } from 'zod';
import { getMemoryProvider } from '@/lib/memory/factory';
import { upstashLogger } from '@/lib/memory/upstash/upstash-logger';
import { AgentSchema } from '@/lib/shared/types/supabase';

// Import Upstash adapter functions
import {
  getData,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
} from '@/lib/memory/upstash/supabase-adapter';

// Utility to map API camelCase to DB snake_case for agent fields
function mapAgentApiToDb(input: any) {
  return {
    ...input,
    model_id: input.modelId,
    tool_ids: input.toolIds,
    system_prompt: input.systemPrompt,
    persona_id: input.personaId,
  };
}
function mapAgentDbToApi(input: any) {
  return {
    ...input,
    modelId: input.model_id,
    toolIds: input.tool_ids,
    systemPrompt: input.system_prompt,
    personaId: input.persona_id,
  };
}

// Helper functions for Upstash operations
/**
 * Updates an agent in Upstash
 * @/lib/memory/factory.ts
 * @param id - Agent ID
 * @param updates - Updates to apply
 * @returns Updated agent
 */
async function updateAgentInUpstash(
  id: string,
  updates: Record<string, unknown>
) {
  // First check if agent exists
  const existingAgent = await getItemById('agents', id);

  if (!existingAgent) {
    throw new Error(`Agent with ID ${id} not found`);
  }

  // Add updated_at timestamp
  const updatedData = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  // Update the agent
  return updateItem('agents', id, updatedData);
}

/**
 * Deletes an agent from Upstash
 * @/lib/memory/factory.ts
 * @param id - Agent ID
 * @returns Whether deletion was successful
 */
async function deleteAgentFromUpstash(id: string) {
  // First check if agent exists
  const existingAgent = await getItemById('agents', id);

  if (!existingAgent) {
    throw new Error(`Agent with ID ${id} not found`);
  }

  // First delete related agent_tools
  const agentTools = await getData('agent_tools', {
    filters: [{ field: 'agent_id', operator: 'eq' as const, value: id }],
  });

  for (const tool of agentTools) {
    await deleteItem(
      'agent_tools',
      getAgentToolKey(tool.agent_id, tool.tool_id)
    );
  }

  // Then delete the agent
  return deleteItem('agents', id);
}

// Helper to get composite key for agent_tools
function getAgentToolKey(agent_id: string, tool_id: string) {
  return `${agent_id}:${tool_id}`;
}

// Import LibSQL client for fallback
import { getLibSQLClient } from '@/lib/memory/db';

// Define schemas for validation
const AgentQuerySchema = z.object({
  search: z.string().optional().default(''),
  limit: z.coerce.number().int().positive().default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const CreateAgentSchema = AgentSchema.pick({
  name: true,
  description: true,
  modelId: true,
  toolIds: true,
  systemPrompt: true,
} as const).extend({ toolIds: z.array(z.string()).optional().default([]) });

const UpdateAgentSchema = AgentSchema.pick({
  name: true,
  description: true,
  modelId: true,
  toolIds: true,
  systemPrompt: true,
  personaId: true,
}).partial();

const AgentParamsSchema = z.object({
  id: z.string().uuid({ message: 'Invalid agent ID format' }),
});
/**
 * GET /api/ai-sdk/agents
 *
 * Fetch all available agents with their tools and models
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);

    // Validate and parse query parameters using Zod
    const queryResult = AgentQuerySchema.safeParse({
      search: url.searchParams.get('search'),
      limit: url.searchParams.get('limit'),
      offset: url.searchParams.get('offset'),
    });

    if (!queryResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: queryResult.error.format(),
        },
        { status: 400 }
      );
    }

    const { search, limit, offset } = queryResult.data;

    // Determine which provider to use
    const provider = getMemoryProvider();

    if (provider === 'upstash') {
      try {
        // Get agents from Upstash
        const filters = search
          ? [
              { field: 'name', operator: 'ilike' as const, value: search },
              {
                field: 'description',
                operator: 'ilike' as const,
                value: search,
              },
            ]
          : undefined;

        const agents = await getData('agents', {
          filters,
          limit,
          offset,
          orderBy: { column: 'created_at', ascending: false },
        });

        // Format agents with their models and tools
        const formattedAgents = await Promise.all(
          agents.map(async (agent) => {
            // Get model details
            const model = await getItemById('models', agent.model_id);

            // Get tools for this agent
            const agentTools = await getData('agent_tools', {
              filters: [{ field: 'agent_id', operator: 'eq', value: agent.id }],
            });

            // Get tool details
            const tools = await Promise.all(
              agentTools.map(async (agentTool) => {
                const tool = await getItemById('tools', agentTool.tool_id);
                return tool
                  ? {
                      id: tool.id,
                      name: tool.name,
                      description: tool.description,
                      parametersSchema: tool.parameters_schema
                        ? typeof tool.parameters_schema === 'string'
                          ? JSON.parse(tool.parameters_schema)
                          : tool.parameters_schema
                        : {},
                    }
                  : null;
              })
            );

            // Filter out null tools
            const validTools = tools.filter(Boolean);

            return mapAgentDbToApi({
              id: agent.id,
              name: agent.name,
              description: agent.description,
              system_prompt: agent.system_prompt,
              created_at: agent.created_at,
              updated_at: agent.updated_at,
              model: model
                ? {
                    id: model.id,
                    name: model.name,
                    provider: model.provider,
                  }
                : null,
              tools: validTools,
            });
          })
        );

        // Get total count
        const allAgents = await getData('agents');
        const count = allAgents.length;

        return NextResponse.json({
          agents: formattedAgents,
          count,
          hasMore: formattedAgents.length === limit,
        });
      } catch (error) {
        // If Upstash fails, fall back to LibSQL
        await upstashLogger.error(
          'agents',
          'Upstash fallback error during agent listing',
          error instanceof Error ? error : new Error(String(error)),
          {
            operation: 'list_agents',
            timestamp: new Date().toISOString(),
            search,
            limit,
            offset,
          }
        );

        // Create trace for error with detailed logging
        await createTrace({
          name: 'upstash_fallback',
          userId: 'system',
          metadata: {
            operation: 'list_agents',
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString(),
          },
        });
      }
    }

    // Fall back to LibSQL if Upstash is not configured or failed
    const db = getLibSQLClient();

    // Query to get agents with their models and tools
    let sql = `
      SELECT
        a.id, a.name, a.description, a.system_prompt, a.created_at, a.updated_at,
        m.id as model_id, m.name as model_name, m.provider as model_provider
      FROM agents a
      JOIN models m ON a.model_id = m.id
    `;

    // Add search condition if provided
    if (search) {
      sql += ` WHERE a.name LIKE '%${search}%' OR a.description LIKE '%${search}%'`;
    }

    // Add pagination
    sql += ` ORDER BY a.created_at DESC LIMIT ${limit} OFFSET ${offset}`;

    const agentsResult = await db.execute({ sql, args: [] });

    // Format agents
    const agents = await Promise.all(
      agentsResult.rows.map(async (agent) => {
        // Get tools for this agent
        const toolsResult = await db.execute({
          sql: `
          SELECT t.id, t.name, t.description, t.parameters_schema
          FROM tools t
          JOIN agent_tools at ON t.id = at.tool_id
          WHERE at.agent_id = ?
        `,
          args: [agent.id],
        });

        return mapAgentDbToApi({
          id: agent.id,
          name: agent.name,
          description: agent.description,
          system_prompt: agent.system_prompt,
          created_at: agent.created_at,
          updated_at: agent.updated_at,
          model: {
            id: agent.model_id,
            name: agent.model_name,
            provider: agent.model_provider,
          },
          tools: toolsResult.rows.map((tool) => ({
            id: tool.id,
            name: tool.name,
            description: tool.description,
            parametersSchema:
              tool.parameters_schema &&
              typeof tool.parameters_schema === 'string'
                ? JSON.parse(tool.parameters_schema)
                : {},
          })),
        });
      })
    );

    // Get total count
    const countResult = await db.execute({
      sql: `SELECT COUNT(*) as count FROM agents`,
      args: [],
    });

    return NextResponse.json({
      agents,
      count: countResult.rows[0].count,
      hasMore: agents.length === limit,
    });
  } catch (error: unknown) {
    // Handle Upstash-specific errors
    if (error && typeof error === 'object' && 'name' in error) {
      const errorObj = error as { name: string; message?: string };
      if (
        errorObj.name === 'UpstashAdapterError' ||
        errorObj.name === 'RedisStoreError' ||
        errorObj.name === 'UpstashClientError'
      ) {
        return NextResponse.json(
          { error: `Upstash error: ${errorObj.message || 'Unknown error'}` },
          { status: 500 }
        );
      }
    }

    // Use the generic API error handler for other errors
    return handleApiError(error);
  }
}

/**
 * POST /api/ai-sdk/agents
 *
 * Create a new agent
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate request body using Zod
    const bodyResult = CreateAgentSchema.safeParse(body);

    if (!bodyResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: bodyResult.error.format() },
        { status: 400 }
      );
    }

    const { name, description, modelId, toolIds, systemPrompt } =
      bodyResult.data;

    // Determine which provider to use
    const provider = getMemoryProvider();

    if (provider === 'upstash') {
      try {
        // Check if model exists
        const model = await getItemById('models', modelId);

        if (!model) {
          return NextResponse.json(
            { error: 'Model not found' },
            { status: 404 }
          );
        }

        // Create agent
        const id = generateId();
        const now = new Date().toISOString();

        // Create the agent in Upstash
        await createItem(
          'agents',
          mapAgentApiToDb({
            id,
            name,
            description,
            modelId,
            systemPrompt,
            created_at: now,
            updated_at: now,
          })
        );

        // Add tools to agent
        for (const toolId of toolIds) {
          await createItem('agent_tools', {
            agent_id: id,
            tool_id: toolId,
            created_at: now,
          });
        }

        // Create trace for agent creation
        await createTrace({
          name: 'agent_created',
          userId: id,
          metadata: {
            agentId: id,
            name,
            modelId,
            toolCount: toolIds.length,
            provider: 'upstash',
          },
        });

        return NextResponse.json({
          id,
          name,
          description,
          systemPrompt,
          modelId,
          toolIds,
          createdAt: now,
          updatedAt: now,
        });
      } catch (error) {
        // If Upstash fails, fall back to LibSQL
        await upstashLogger.error(
          'agents',
          'Upstash fallback error during agent creation',
          error instanceof Error ? error : new Error(String(error)),
          {
            operation: 'create_agent',
            timestamp: new Date().toISOString(),
            modelId,
            name,
            toolIds,
          }
        );

        // Create trace for error with detailed logging
        await createTrace({
          name: 'upstash_fallback',
          userId: 'system',
          metadata: {
            operation: 'create_agent',
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString(),
          },
        });
      }
    }

    // Fall back to LibSQL if Upstash is not configured or failed
    const db = getLibSQLClient();

    // Get model details
    const modelResult = await db.execute({
      sql: `SELECT * FROM models WHERE id = ?`,
      args: [modelId],
    });

    if (modelResult.rows.length === 0) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }

    // Create agent
    const id = generateId();
    const now = new Date().toISOString();

    await db.execute({
      sql: `
        INSERT INTO agents (id, name, description, model_id, system_prompt, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      args: [id, name, description || '', modelId, systemPrompt, now, now],
    });

    // Add tools to agent
    for (const toolId of toolIds) {
      await db.execute({
        sql: `INSERT INTO agent_tools (agent_id, tool_id) VALUES (?, ?)`,
        args: [id, toolId],
      });
    }

    // Create trace for agent creation
    await createTrace({
      name: 'agent_created',
      userId: id,
      metadata: {
        agentId: id,
        name,
        modelId,
        toolCount: toolIds.length,
        provider: 'libsql',
      },
    });

    return NextResponse.json({
      id,
      name,
      description,
      systemPrompt,
      modelId,
      toolIds,
      createdAt: now,
      updatedAt: now,
    });
  } catch (error: unknown) {
    // Handle Upstash-specific errors
    if (error && typeof error === 'object' && 'name' in error) {
      const errorObj = error as { name: string; message?: string };
      if (
        errorObj.name === 'UpstashAdapterError' ||
        errorObj.name === 'RedisStoreError' ||
        errorObj.name === 'UpstashClientError'
      ) {
        return NextResponse.json(
          { error: `Upstash error: ${errorObj.message || 'Unknown error'}` },
          { status: 500 }
        );
      }
    }

    // Use the generic API error handler for other errors
    return handleApiError(error);
  }
}

/**
 * PATCH /api/ai-sdk/agents/:id
 *
 * Update an existing agent
 */
export async function PATCH(request: Request) {
  try {
    // Extract agent ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const id = pathParts[pathParts.length - 1];

    // Validate agent ID
    const paramsResult = AgentParamsSchema.safeParse({ id });
    if (!paramsResult.success) {
      return NextResponse.json(
        { error: 'Invalid agent ID', details: paramsResult.error.format() },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const bodyResult = UpdateAgentSchema.safeParse(body);

    if (!bodyResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: bodyResult.error.format() },
        { status: 400 }
      );
    }

    const { name, description, modelId, toolIds, systemPrompt, personaId } =
      bodyResult.data;

    // Determine which provider to use
    const provider = getMemoryProvider();
    let existingAgent;
    let useLibSQL = false;

    if (provider === 'upstash') {
      try {
        // Check if agent exists
        existingAgent = await getItemById('agents', id);

        if (!existingAgent) {
          return NextResponse.json(
            { error: 'Agent not found' },
            { status: 404 }
          );
        }

        // Prepare update data
        const updateData: Record<string, unknown> = mapAgentApiToDb({
          name,
          description,
          model_id: modelId,
          system_prompt: systemPrompt,
          persona_id: personaId,
        });
        updateData.updated_at = new Date().toISOString();

        // Update agent using the helper function
        await updateAgentInUpstash(id, updateData);

        // Handle tool associations if provided
        if (toolIds !== undefined) {
          // Get all existing tool associations
          const existingAssociations = await getData('agent_tools', {
            filters: [{ field: 'agent_id', operator: 'eq', value: id }],
          });

          // Delete existing tool associations
          for (const assoc of existingAssociations) {
            await deleteItem(
              'agent_tools',
              getAgentToolKey(assoc.agent_id, assoc.tool_id)
            );
          }

          // Add new tool associations
          if (toolIds.length > 0) {
            for (const toolId of toolIds) {
              await createItem('agent_tools', {
                agent_id: id,
                tool_id: toolId,
                created_at: new Date().toISOString(),
              });
            }
          }
        }

        // Create trace for agent update
        await createTrace({
          name: 'agent_updated',
          userId: id,
          metadata: {
            agentId: id,
            name: name || existingAgent.name,
            toolCount: toolIds?.length,
            provider: 'upstash',
          },
        });

        // Get updated agent
        const updatedAgent = await getItemById('agents', id);

        if (!updatedAgent) {
          return NextResponse.json(
            { error: 'Failed to retrieve updated agent' },
            { status: 500 }
          );
        }

        // Get tools for this agent
        const agentTools = await getData('agent_tools', {
          filters: [{ field: 'agent_id', operator: 'eq', value: id }],
        });

        const toolIdList = agentTools.map((tool) => tool.tool_id);

        // Prepare response
        return NextResponse.json({
          id,
          name: updatedAgent.name,
          description: updatedAgent.description,
          modelId: updatedAgent.model_id,
          systemPrompt: updatedAgent.system_prompt,
          personaId: updatedAgent.persona_id,
          toolIds: toolIdList,
          updatedAt: updatedAgent.updated_at,
        });
      } catch (error) {
        await upstashLogger.error(
          'agents',
          'Upstash fallback error during agent update',
          error instanceof Error ? error : new Error(String(error)),
          {
            operation: 'update_agent',
            agentId: id,
            timestamp: new Date().toISOString(),
            name,
            toolIds,
          }
        );

        // Create trace for error with detailed logging
        await createTrace({
          name: 'upstash_fallback',
          userId: id,
          metadata: {
            operation: 'update_agent',
            agentId: id,
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString(),
          },
        });

        // Fall back to LibSQL
        useLibSQL = true;
      }
    } else {
      useLibSQL = true;
    }

    // Fall back to LibSQL if needed
    if (useLibSQL) {
      const db = getLibSQLClient();

      try {
        // Check if agent exists
        const result = await db.execute({
          sql: `SELECT * FROM agents WHERE id = ?`,
          args: [id],
        });

        if (result.rows.length === 0) {
          return NextResponse.json(
            { error: 'Agent not found' },
            { status: 404 }
          );
        }

        existingAgent = result.rows[0];

        // Prepare update data
        const updateFields = [];
        const updateValues = [];

        if (name !== undefined) {
          updateFields.push('name = ?');
          updateValues.push(name);
        }

        if (description !== undefined) {
          updateFields.push('description = ?');
          updateValues.push(description);
        }

        if (modelId !== undefined) {
          updateFields.push('model_id = ?');
          updateValues.push(modelId);
        }

        if (systemPrompt !== undefined) {
          updateFields.push('system_prompt = ?');
          updateValues.push(systemPrompt);
        }

        if (personaId !== undefined) {
          updateFields.push('persona_id = ?');
          updateValues.push(personaId);
        }

        const now = new Date().toISOString();
        updateFields.push('updated_at = ?');
        updateValues.push(now);

        // Add ID to values
        updateValues.push(id);

        // Update agent
        await db.execute({
          sql: `
            UPDATE agents
            SET ${updateFields.join(', ')}
            WHERE id = ?
          `,
          args: updateValues,
        });

        // Update tool associations if provided
        if (toolIds !== undefined) {
          // Delete existing tool associations
          await db.execute({
            sql: `DELETE FROM agent_tools WHERE agent_id = ?`,
            args: [id],
          });

          // Add new tool associations
          if (toolIds.length > 0) {
            for (const toolId of toolIds) {
              await db.execute({
                sql: `INSERT INTO agent_tools (agent_id, tool_id) VALUES (?, ?)`,
                args: [id, toolId],
              });
            }
          }
        }

        // Get updated tool IDs
        const toolsResult = await db.execute({
          sql: `SELECT tool_id FROM agent_tools WHERE agent_id = ?`,
          args: [id],
        });

        const toolIdList = toolsResult.rows.map((row) => row.tool_id);

        // Create trace for agent update
        await createTrace({
          name: 'agent_updated',
          userId: id,
          metadata: {
            agentId: id,
            name: name || existingAgent.name,
            toolCount: toolIds?.length,
            provider: 'libsql',
          },
        });

        // Prepare response
        return NextResponse.json({
          id,
          name: name || existingAgent.name,
          description: description || existingAgent.description,
          modelId: modelId || existingAgent.model_id,
          systemPrompt: systemPrompt || existingAgent.system_prompt,
          personaId: personaId || existingAgent.persona_id,
          toolIds: toolIdList,
          updatedAt: now,
        });
      } catch (error) {
        throw error;
      }
    }
  } catch (error: unknown) {
    // Handle Upstash-specific errors
    if (error && typeof error === 'object' && 'name' in error) {
      const errorObj = error as { name: string; message?: string };
      if (
        errorObj.name === 'UpstashAdapterError' ||
        errorObj.name === 'RedisStoreError' ||
        errorObj.name === 'UpstashClientError'
      ) {
        return NextResponse.json(
          { error: `Upstash error: ${errorObj.message || 'Unknown error'}` },
          { status: 500 }
        );
      }
    }

    // Use the generic API error handler for other errors
    return handleApiError(error);
  }
}
/**
 * DELETE /api/ai-sdk/agents/:id
 *
 * Delete an agent
 */export async function DELETE(request: Request) {
  try {
    // Extract agent ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const id = pathParts[pathParts.length - 1];

    // Validate agent ID
    const paramsResult = AgentParamsSchema.safeParse({ id });
    if (!paramsResult.success) {
      return NextResponse.json(
        { error: 'Invalid agent ID', details: paramsResult.error.format() },
        { status: 400 }
      );
    }

    // Determine which provider to use
    const provider = getMemoryProvider();
    let useLibSQL = false;
    let success = false;

    if (provider === 'upstash') {
      try {
        // Delete agent using the helper function
        success = await deleteAgentFromUpstash(id);

        if (!success) {
          return NextResponse.json(
            { error: 'Failed to delete agent' },
            { status: 500 }
          );
        }

        // Create trace for agent deletion
        await createTrace({
          name: 'agent_deleted',
          userId: id,
          metadata: {
            agentId: id,
            timestamp: new Date().toISOString(),
            provider: 'upstash',
          },
        });

        return NextResponse.json({ success: true });
      } catch (error) {
        // If error is "not found", return 404
        if (error instanceof Error && error.message.includes('not found')) {
          return NextResponse.json(
            { error: 'Agent not found' },
            { status: 404 }
          );
        }

        await upstashLogger.error(
          'agents',
          'Upstash fallback error during agent deletion',
          error instanceof Error ? error : new Error(String(error)),
          {
            operation: 'delete_agent',
            agentId: id,
            timestamp: new Date().toISOString(),
          }
        );

        // Create trace for error with detailed logging
        await createTrace({
          name: 'upstash_fallback',
          userId: id,
          metadata: {
            operation: 'delete_agent',
            agentId: id,
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString(),
          },
        });

        // Fall back to LibSQL
        useLibSQL = true;
      }
    } else {
      useLibSQL = true;
    }

    // Fall back to LibSQL if needed
    if (useLibSQL) {
      const db = getLibSQLClient();

      try {
        // Check if agent exists
        const checkResult = await db.execute({
          sql: `SELECT id FROM agents WHERE id = ?`,
          args: [id],
        });

        if (checkResult.rows.length === 0) {
          return NextResponse.json(
            { error: 'Agent not found' },
            { status: 404 }
          );
        }

        // Delete agent tools first (foreign key constraint)
        await db.execute({
          sql: `DELETE FROM agent_tools WHERE agent_id = ?`,
          args: [id],
        });

        // Delete agent
        await db.execute({
          sql: `DELETE FROM agents WHERE id = ?`,
          args: [id],
        });

        // Create trace for agent deletion
        await createTrace({
          name: 'agent_deleted',
          userId: id,
          metadata: {
            agentId: id,
            timestamp: new Date().toISOString(),
            provider: 'libsql',
          },
        });

        return NextResponse.json({ success: true });
      } catch (error) {
        throw error;
      }
    }
  } catch (error: unknown) {
    // Handle Upstash-specific errors
    if (error && typeof error === 'object' && 'name' in error) {
      const errorObj = error as { name: string; message?: string };
      if (
        errorObj.name === 'UpstashAdapterError' ||
        errorObj.name === 'RedisStoreError' ||
        errorObj.name === 'UpstashClientError'
      ) {
        return NextResponse.json(
          { error: `Upstash error: ${errorObj.message || 'Unknown error'}` },
          { status: 500 }
        );
      }
    }

    // Use the generic API error handler for other errors
    return handleApiError(error);
  }
}
