import { NextResponse } from "next/server"
import { getSupabaseClient } from "@/lib/memory/supabase"
import { handleApiError } from "@/lib/api-error-handler"

export async function DELETE(
  request: Request,
  { params }: { params: { id: string; agentId: string } }
) {
  try {
    const { id, agentId } = params
    
    const supabase = getSupabaseClient()
    
    // Delete the network agent
    const { error: deleteError } = await supabase
      .from("network_agents")
      .delete()
      .eq("id", agentId)
      .eq("network_id", id)
    
    if (deleteError) {
      console.error("Error removing agent from network:", deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }
    
    // Update the agent count in the network
    const { data: network, error: networkError } = await supabase.rpc("decrement_network_agent_count", {
      network_id: id,
    })
    
    if (networkError) {
      console.error("Error updating network agent count:", networkError)
      // Don't return an error here, as the agent was successfully removed
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string; agentId: string } }
) {
  try {
    const { id, agentId } = params
    const body = await request.json()
    
    // Validate required fields
    if (!body.role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }
    
    const supabase = getSupabaseClient()
    
    // Update the network agent
    const { data, error } = await supabase
      .from("network_agents")
      .update({ role: body.role, updated_at: new Date().toISOString() })
      .eq("id", agentId)
      .eq("network_id", id)
      .select()
      .single()
    
    if (error) {
      console.error("Error updating network agent:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json(data)
  } catch (error) {
    return handleApiError(error)
  }
}
