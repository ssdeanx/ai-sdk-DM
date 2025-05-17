import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error-handler';
import { createTrace } from '@/lib/langfuse-integration';
import { agentRegistry } from '@/lib/agents/registry';
import { personaManager } from '@/lib/agents/personas/persona-manager';
import { getSupabaseClient } from '@/lib/memory/supabase';
import { getMemoryProvider } from '@/lib/memory/factory';
import {
  getData,
  getItemById,
  updateItem,
  deleteItem,
  createItem,
} from '@/lib/memory/upstash/supabase-adapter';
import { upstashLogger } from '@/lib/memory/upstash/upstash-logger';
import { z } from 'zod';

// Define a type for the agent from registry which might have different property names
interface RegistryAgent {
  id: string;
  name: string;
  description?: string;
  modelId?: string;
  model_id?: string;
  systemPrompt?: string;
  system_prompt?: string;
  tool_ids?: string[];
  persona_id?: string;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  [key: string]: string | string[] | undefined; // More specific type for additional properties
}
// Zod validation schemas
const ParamsSchema = z.object({
  id: z.string().uuid({ message: 'Invalid agent ID format' }),
});

const AgentUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  modelId: z.string().optional(),
  toolIds: z.array(z.string()).optional(),
  systemPrompt: z.string().optional(),
  personaId: z.string().uuid().optional(),
});

const AgentResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  modelId: z.string(),
  systemPrompt: z.string().optional(),
  toolIds: z.array(z.string()).default([]),
  personaId: z.string().optional(),
  persona: z.record(z.any()).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

/**
 * GET /api/ai-sdk/agents/[id]
 *
 * Get details for a specific agent
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Validate params
    const paramsResult = ParamsSchema.safeParse(params);
    if (!paramsResult.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: paramsResult.error.format() },
        { status: 400 }
      );
    }

    const { id } = paramsResult.data;

    // Initialize agent registry
    await agentRegistry.init();

    // Get agent from registry
    const agent = await agentRegistry.getAgent(id);

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Cast agent to RegistryAgent type with proper type conversion
    const typedAgent = agent as unknown as RegistryAgent;

    // Get persona information if available
    let persona = null;
    const personaId = typedAgent.persona_id;

    if (personaId) {
      try {
        await personaManager.init();
        persona = await personaManager.getPersonaById(personaId);
      } catch (error) {
        await upstashLogger.error(
          'agents',
          'Failed to fetch persona for agent',
          error instanceof Error ? error : new Error(String(error)),
          { agentId: id, personaId }
        );
        await createTrace({
          name: 'persona_fetch_error',
          userId: id,
          metadata: {
            agentId: id,
            personaId,
            error: error instanceof Error ? error.message : String(error),
          },
        });
      }
    }

    // Get tool IDs
    const toolIds = typedAgent.tool_ids || [];

    // Format response with proper type handling
    const response = {
      id: typedAgent.id,
      name: typedAgent.name,
      description: typedAgent.description || '',
      modelId: typedAgent.modelId || typedAgent.model_id || '',
      systemPrompt:
        typedAgent.systemPrompt ||
        typedAgent.system_prompt ||
        typedAgent.description ||
        '',
      toolIds,
      personaId,
      persona,
      createdAt:
        typedAgent.createdAt ||
        typedAgent.created_at ||
        new Date().toISOString(),
      updatedAt:
        typedAgent.updatedAt ||
        typedAgent.updated_at ||
        new Date().toISOString(),
    };

    // Validate response
    const validatedResponse = AgentResponseSchema.parse(response);

    return NextResponse.json(validatedResponse);
  } catch (error) {
    // Handle Upstash-specific errors with detailed error messages
    if (error && typeof error === 'object' && 'name' in error) {
      const errorObj = error as {
        name: string;
        message?: string;
        code?: string;
        status?: number;
      };

      // Create a trace for the error
      await createTrace({
        name: 'agent_error',
        userId: params?.id || 'unknown',
        metadata: {
          operation: 'get_agent',
          agentId: params?.id || 'unknown',
          errorName: errorObj.name,
          errorMessage: errorObj.message || 'Unknown error',
          errorCode: errorObj.code,
          timestamp: new Date().toISOString(),
        },
      });

      // Handle specific Upstash errors
      if (errorObj.name === 'UpstashAdapterError') {
        return NextResponse.json(
          {
            error: 'Upstash adapter error',
            message: errorObj.message || 'Unknown error',
            code: errorObj.code || 'ADAPTER_ERROR',
          },
          { status: errorObj.status || 500 }
        );
      } else if (errorObj.name === 'RedisStoreError') {
        return NextResponse.json(
          {
            error: 'Redis store error',
            message: errorObj.message || 'Unknown error',
            code: errorObj.code || 'REDIS_ERROR',
          },
          { status: errorObj.status || 500 }
        );
      } else if (errorObj.name === 'UpstashClientError') {
        return NextResponse.json(
          {
            error: 'Upstash client error',
            message: errorObj.message || 'Unknown error',
            code: errorObj.code || 'CLIENT_ERROR',
          },
          { status: errorObj.status || 500 }
        );
      } else if (errorObj.name === 'ConnectionError') {
        return NextResponse.json(
          {
            error: 'Database connection error',
            message: errorObj.message || 'Failed to connect to the database',
            code: 'CONNECTION_ERROR',
          },
          { status: 503 }
        );
      } else if (errorObj.name === 'TimeoutError') {
        return NextResponse.json(
          {
            error: 'Database timeout',
            message: errorObj.message || 'Database operation timed out',
            code: 'TIMEOUT_ERROR',
          },
          { status: 504 }
        );
      }
    }

    return handleApiError(error);
  }
}

/**
 * PATCH /api/ai-sdk/agents/[id]
 *
 * Update an agent
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Validate params
    const paramsResult = ParamsSchema.safeParse(params);
    if (!paramsResult.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: paramsResult.error.format() },
        { status: 400 }
      );
    }

    const { id } = paramsResult.data;

    // Parse and validate request body
    const body = await request.json();
    const bodyResult = AgentUpdateSchema.safeParse(body);

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
        // Use Upstash adapter
        existingAgent = await getItemById('agents', id);

        if (!existingAgent) {
          await upstashLogger.warn(
            'agents',
            'Tried to update non-existent agent',
            { agentId: id }
          );
          return NextResponse.json(
            { error: 'Agent not found' },
            { status: 404 }
          );
        }

        // Prepare update data
        const updateData: Record<string, unknown> = {};
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (modelId !== undefined) updateData.model_id = modelId;
        if (systemPrompt !== undefined) updateData.system_prompt = systemPrompt;
        if (personaId !== undefined) updateData.persona_id = personaId;
        updateData.updated_at = new Date().toISOString();

        // Update agent
        await updateItem('agents', id, updateData);

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
              `${assoc.agent_id}:${assoc.tool_id}`
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

        await upstashLogger.info('agents', 'Agent updated', {
          agentId: id,
          name,
          toolIds,
          provider: 'upstash',
        });
      } catch (error) {
        await upstashLogger.error(
          'agents',
          'Upstash error during agent update',
          error instanceof Error ? error : new Error(String(error)),
          { agentId: id, name, toolIds }
        );
        // Fall back to LibSQL if Upstash fails
        // Create a trace for the error
        await createTrace({
          name: 'upstash_fallback',
          userId: id,
          metadata: {
            operation: 'update_agent',
            agentId: id,
            error: error instanceof Error ? error.message : String(error),
          },
        });

        useLibSQL = true;
      }
    } else {
      useLibSQL = true;
    }

    // Fall back to LibSQL/Supabase if needed
    if (useLibSQL || provider === 'libsql') {
      // Get Supabase client
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase: any = getSupabaseClient();
      try {
        // Check if agent exists
        const { data: agent, error: checkError } = await supabase
          .from('agents')
          .select()
          .eq('id', id)
          .single();

        if (checkError || !agent) {
          return NextResponse.json(
            { error: 'Agent not found' },
            { status: 404 }
          );
        }

        existingAgent = agent;

        // Prepare update data
        const updateData: Record<string, unknown> = {};
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (modelId !== undefined) updateData.model_id = modelId;
        if (systemPrompt !== undefined) updateData.system_prompt = systemPrompt;
        if (personaId !== undefined) updateData.persona_id = personaId;
        updateData.updated_at = new Date().toISOString();

        // Update agent
        const { error: updateError } = await supabase
          .from('agents')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        // Update tool associations if provided
        if (toolIds !== undefined) {
          // Delete existing tool associations
          const { error: deleteError } = await supabase
            .from('agent_tools')
            .delete()
            .eq('agent_id', id);

          if (deleteError) {
            throw deleteError;
          }

          // Add new tool associations
          if (toolIds.length > 0) {
            interface ToolAssociation {
              agent_id: string;
              tool_id: string;
              created_at?: string;
            }
            const toolAssociations: ToolAssociation[] = toolIds.map(
              (toolId: string) => ({
                agent_id: id,
                tool_id: toolId,
                created_at: new Date().toISOString(),
              })
            );
            const { error: insertError } = await supabase
              .from('agent_tools')
              .insert(toolAssociations);
            if (insertError) {
              throw insertError;
            }
          }
        }
      } catch (error) {
        throw error;
      }
    }

    // Reload agent in registry
    await agentRegistry.reloadAgent(id);

    // Create trace for agent update
    await createTrace({
      name: 'agent_updated',
      userId: id,
      metadata: {
        agentId: id,
        name: name || existingAgent.name,
        toolCount: toolIds?.length,
        provider,
      },
    });

    // Prepare response
    const response = {
      id,
      name: name || existingAgent.name,
      description: description || existingAgent.description,
      modelId: modelId || existingAgent.model_id,
      systemPrompt: systemPrompt || existingAgent.system_prompt,
      toolIds: toolIds || existingAgent.tool_ids || [],
      personaId: personaId || existingAgent.persona_id,
      updatedAt: new Date().toISOString(),
    };

    // Validate response
    const validatedResponse = AgentResponseSchema.parse(response);

    return NextResponse.json(validatedResponse);
  } catch (error) {
    // Handle Upstash-specific errors with detailed error messages
    if (error && typeof error === 'object' && 'name' in error) {
      const errorObj = error as {
        name: string;
        message?: string;
        code?: string;
        status?: number;
      };

      // Create a trace for the error
      await createTrace({
        name: 'agent_error',
        userId: params?.id || 'unknown',
        metadata: {
          operation: 'update_agent',
          agentId: params?.id || 'unknown',
          errorName: errorObj.name,
          errorMessage: errorObj.message || 'Unknown error',
          errorCode: errorObj.code,
          timestamp: new Date().toISOString(),
        },
      });

      // Handle specific Upstash errors
      if (errorObj.name === 'UpstashAdapterError') {
        return NextResponse.json(
          {
            error: 'Upstash adapter error',
            message: errorObj.message || 'Unknown error',
            code: errorObj.code || 'ADAPTER_ERROR',
          },
          { status: errorObj.status || 500 }
        );
      } else if (errorObj.name === 'RedisStoreError') {
        return NextResponse.json(
          {
            error: 'Redis store error',
            message: errorObj.message || 'Unknown error',
            code: errorObj.code || 'REDIS_ERROR',
          },
          { status: errorObj.status || 500 }
        );
      } else if (errorObj.name === 'UpstashClientError') {
        return NextResponse.json(
          {
            error: 'Upstash client error',
            message: errorObj.message || 'Unknown error',
            code: errorObj.code || 'CLIENT_ERROR',
          },
          { status: errorObj.status || 500 }
        );
      } else if (errorObj.name === 'ConnectionError') {
        return NextResponse.json(
          {
            error: 'Database connection error',
            message: errorObj.message || 'Failed to connect to the database',
            code: 'CONNECTION_ERROR',
          },
          { status: 503 }
        );
      } else if (errorObj.name === 'TimeoutError') {
        return NextResponse.json(
          {
            error: 'Database timeout',
            message: errorObj.message || 'Database operation timed out',
            code: 'TIMEOUT_ERROR',
          },
          { status: 504 }
        );
      }
    }

    // Use the generic API error handler for other errors
    return handleApiError(error);
  }
}

/**
 * DELETE /api/ai-sdk/agents/[id]
 *
 * Delete an agent
 */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Validate params
    const paramsResult = ParamsSchema.safeParse(params);
    if (!paramsResult.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: paramsResult.error.format() },
        { status: 400 }
      );
    }

    const { id } = paramsResult.data;

    // Determine which provider to use
    const provider = getMemoryProvider();
    let useLibSQL = false;
    let success = false;

    if (provider === 'upstash') {
      try {
        // Check if agent exists
        const existingAgent = await getItemById('agents', id);

        if (!existingAgent) {
          return NextResponse.json(
            { error: 'Agent not found' },
            { status: 404 }
          );
        }

        // Get all tool associations
        const toolAssociations = await getData('agent_tools', {
          filters: [{ field: 'agent_id', operator: 'eq', value: id }],
        });

        // Delete tool associations first (foreign key constraint)
        for (const assoc of toolAssociations) {
          await deleteItem('agent_tools', `${assoc.agent_id}:${assoc.tool_id}`);
        }

        // Delete the agent
        success = await deleteItem('agents', id);

        if (!success) {
          await upstashLogger.error(
            'agents',
            'Failed to delete agent',
            new Error('Delete returned false'),
            { agentId: id }
          );
          return NextResponse.json(
            { error: 'Failed to delete agent' },
            { status: 500 }
          );
        }

        await upstashLogger.info('agents', 'Agent deleted', {
          agentId: id,
          provider: 'upstash',
        });
      } catch (error) {
        await upstashLogger.error(
          'agents',
          'Upstash error during agent deletion',
          error instanceof Error ? error : new Error(String(error)),
          { agentId: id }
        );
        // Fall back to LibSQL if Upstash fails
        await createTrace({
          name: 'upstash_fallback',
          userId: id,
          metadata: {
            operation: 'delete_agent',
            agentId: id,
            error: error instanceof Error ? error.message : String(error),
          },
        });

        useLibSQL = true;
      }
    } else {
      useLibSQL = true;
    }

    // Fall back to LibSQL/Supabase if needed
    if (useLibSQL) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase: any = getSupabaseClient();
      try {
        // Check if agent exists first
        const checkResult = await supabase
          .from('agents')
          .select('id')
          .eq('id', id)
          .single();
        const existingAgent = checkResult.data;
        const checkError = checkResult.error;
        if (checkError || !existingAgent) {
          return NextResponse.json(
            { error: 'Agent not found' },
            { status: 404 }
          );
        }
        // Delete agent tools first (foreign key constraint)
        await supabase.from('agent_tools').delete().eq('agent_id', id);
        // Delete agent
        const deleteResult = await supabase
          .from('agents')
          .delete()
          .eq('id', id);
        const error = deleteResult.error;
        if (error) {
          throw error;
        }
        success = true;
      } catch (error) {
        throw error;
      }
    }

    // Create trace for agent deletion
    await createTrace({
      name: 'agent_deleted',
      userId: id,
      metadata: {
        agentId: id,
        timestamp: new Date().toISOString(),
        provider: useLibSQL ? 'libsql' : 'upstash',
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    // Handle Upstash-specific errors with detailed error messages
    if (error && typeof error === 'object' && 'name' in error) {
      const errorObj = error as {
        name: string;
        message?: string;
        code?: string;
        status?: number;
      };

      // Create a trace for the error
      await createTrace({
        name: 'agent_error',
        userId: params?.id || 'unknown',
        metadata: {
          operation: 'delete_agent',
          agentId: params?.id || 'unknown',
          errorName: errorObj.name,
          errorMessage: errorObj.message || 'Unknown error',
          errorCode: errorObj.code,
          timestamp: new Date().toISOString(),
        },
      });

      // Handle specific Upstash errors
      if (errorObj.name === 'UpstashAdapterError') {
        return NextResponse.json(
          {
            error: 'Upstash adapter error',
            message: errorObj.message || 'Unknown error',
            code: errorObj.code || 'ADAPTER_ERROR',
          },
          { status: errorObj.status || 500 }
        );
      } else if (errorObj.name === 'RedisStoreError') {
        return NextResponse.json(
          {
            error: 'Redis store error',
            message: errorObj.message || 'Unknown error',
            code: errorObj.code || 'REDIS_ERROR',
          },
          { status: errorObj.status || 500 }
        );
      } else if (errorObj.name === 'UpstashClientError') {
        return NextResponse.json(
          {
            error: 'Upstash client error',
            message: errorObj.message || 'Unknown error',
            code: errorObj.code || 'CLIENT_ERROR',
          },
          { status: errorObj.status || 500 }
        );
      } else if (errorObj.name === 'ConnectionError') {
        return NextResponse.json(
          {
            error: 'Database connection error',
            message: errorObj.message || 'Failed to connect to the database',
            code: 'CONNECTION_ERROR',
          },
          { status: 503 }
        );
      } else if (errorObj.name === 'TimeoutError') {
        return NextResponse.json(
          {
            error: 'Database timeout',
            message: errorObj.message || 'Database operation timed out',
            code: 'TIMEOUT_ERROR',
          },
          { status: 504 }
        );
      }
    }

    // Use the generic API error handler for other errors
    return handleApiError(error);
  }
}
