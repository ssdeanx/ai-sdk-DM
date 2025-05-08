import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-error-handler";
import { createTrace, logEvent } from "@/lib/langfuse-integration";
import { agentRegistry } from "@/lib/agents/registry";
import { personaManager } from "@/lib/agents/personas/persona-manager";
import { getSupabaseClient } from "@/lib/memory/supabase";

/**
 * GET /api/ai-sdk/agents/[id]
 * 
 * Get details for a specific agent
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Initialize agent registry if needed
    if (!agentRegistry.isInitialized()) {
      await agentRegistry.init();
    }
    
    // Get agent from registry
    const agent = await agentRegistry.getAgent(id);
    
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }
    
    // Get persona information if available
    let persona = null;
    if (agent.config.persona_id) {
      try {
        await personaManager.init();
        persona = await personaManager.getPersona(agent.config.persona_id);
      } catch (error) {
        console.error("Error fetching persona:", error);
      }
    }
    
    // Format response
    return NextResponse.json({
      id: agent.config.id,
      name: agent.config.name,
      description: agent.config.description,
      modelId: agent.config.model_id,
      systemPrompt: agent.config.system_prompt,
      toolIds: agent.config.tool_ids || [],
      personaId: agent.config.persona_id,
      persona: persona,
      createdAt: agent.config.created_at,
      updatedAt: agent.config.updated_at
    });
  } catch (error) {
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
    const { id } = params;
    const body = await request.json();
    const { name, description, modelId, toolIds, systemPrompt, personaId } = body;
    
    // Get Supabase client
    const supabase = getSupabaseClient();
    
    // Check if agent exists
    const { data: existingAgent, error: checkError } = await supabase
      .from("agents")
      .select("*")
      .eq("id", id)
      .single();
    
    if (checkError || !existingAgent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }
    
    // Prepare update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (modelId !== undefined) updateData.model_id = modelId;
    if (systemPrompt !== undefined) updateData.system_prompt = systemPrompt;
    if (personaId !== undefined) updateData.persona_id = personaId;
    updateData.updated_at = new Date().toISOString();
    
    // Update agent
    const { data: updatedAgent, error: updateError } = await supabase
      .from("agents")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();
    
    if (updateError) {
      throw updateError;
    }
    
    // Update tool associations if provided
    if (toolIds !== undefined) {
      // Delete existing tool associations
      await supabase
        .from("agent_tools")
        .delete()
        .eq("agent_id", id);
      
      // Add new tool associations
      if (toolIds.length > 0) {
        const toolAssociations = toolIds.map(toolId => ({
          agent_id: id,
          tool_id: toolId
        }));
        
        await supabase
          .from("agent_tools")
          .insert(toolAssociations);
      }
    }
    
    // Reload agent in registry
    await agentRegistry.reloadAgent(id);
    
    // Create trace for agent update
    await createTrace({
      name: "agent_updated",
      userId: id,
      metadata: {
        agentId: id,
        name: updateData.name || existingAgent.name,
        toolCount: toolIds?.length
      }
    });
    
    return NextResponse.json({
      id,
      ...updateData,
      toolIds: toolIds || existingAgent.tool_ids
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/ai-sdk/agents/[id]
 * 
 * Delete an agent
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Get Supabase client
    const supabase = getSupabaseClient();
    
    // Delete agent tools first (foreign key constraint)
    await supabase
      .from("agent_tools")
      .delete()
      .eq("agent_id", id);
    
    // Delete agent
    const { error } = await supabase
      .from("agents")
      .delete()
      .eq("id", id);
    
    if (error) {
      throw error;
    }
    
    // Log deletion
    await logEvent({
      name: "agent_deleted",
      metadata: {
        agentId: id,
        timestamp: new Date().toISOString()
      }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
