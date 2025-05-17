import { NextResponse } from 'next/server';
import { getData, createItem, getItemById } from '@/lib/memory/supabase';
import type { Agent } from '@/types/agents';
import type { Model } from '@/types/models';
import type { Tool } from '@/types/tools';
import { handleApiError } from '@/lib/api-error-handler';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const search = url.searchParams.get('search');
    const modelId = url.searchParams.get('modelId');

    let filters = {};
    if (search) {
      filters = { search };
    }
    if (modelId) {
      filters = { ...filters, model_id: modelId };
    }

    const agents = await getData<Agent>('agents', {
      filters,
      orderBy: { column: 'created_at', ascending: false },
    });

    // Enhance agents with model and tool information
    const enhancedAgents = await Promise.all(
      agents.map(async (agent) => {
        // Get model information
        const model = await getItemById<Model>('models', agent.model_id);

        // Get tool information
        const tools = await Promise.all(
          agent.tool_ids.map(async (toolId) => {
            const tool = await getItemById<Tool>('tools', toolId);
            return tool ? tool.name : null;
          })
        ).then((toolNames) => toolNames.filter(Boolean) as string[]);

        return {
          ...agent,
          model: model?.name || 'Unknown Model',
          tools,
        };
      })
    );

    return NextResponse.json({
      agents: enhancedAgents,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate request body
    if (!body.name || !body.description || !body.modelId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Format the data to match Supabase schema
    const agentData = {
      name: body.name,
      description: body.description,
      model_id: body.modelId,
      tool_ids: body.toolIds || [],
      system_prompt: body.systemPrompt || null,
    };

    const agent = await createItem<Agent>('agents', agentData);

    // Enhance agent with model and tool information
    if (agent) {
      const model = await getItemById<Model>('models', agent.model_id);

      const tools = await Promise.all(
        agent.tool_ids.map(async (toolId) => {
          const tool = await getItemById<Tool>('tools', toolId);
          return tool ? tool.name : null;
        })
      ).then((toolNames) => toolNames.filter(Boolean) as string[]);

      return NextResponse.json({
        ...agent,
        model: model?.name || 'Unknown Model',
        tools,
      });
    }

    return NextResponse.json(
      {
        error: 'Failed to create agent',
      },
      { status: 500 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
