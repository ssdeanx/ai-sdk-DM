import { createSupabaseClient } from "../memory/supabase"
import { BaseAgent } from "./baseAgent"

export class AgentRegistry {
  private agents: Map<string, BaseAgent> = new Map()

  /** Initialize registry by loading agents and their tools */
  public async init() {
    const supabase = createSupabaseClient()
    const { data: agents, error } = await supabase.from("agents").select("*")
    if (error) throw error

    for (const agentConfig of agents) {
      // load tools linked to this agent
      const { data: toolRows, error: toolError } = await supabase
        .from("agent_tools")
        .select("tools:tools(*)")
        .eq("agent_id", agentConfig.id)
      if (toolError) throw toolError

      const tools = toolRows.map(row => row.tools)
      const agent = new BaseAgent(agentConfig, tools)
      this.agents.set(agentConfig.id, agent)
    }
  }

  /** Get a registered agent by ID */
  public getAgent(id: string): BaseAgent {
    const agent = this.agents.get(id)
    if (!agent) throw new Error(`Agent not found: ${id}`)
    return agent
  }

  /** List all registered agents */
  public listAgents(): BaseAgent[] {
    return Array.from(this.agents.values())
  }
}

export const agentRegistry = new AgentRegistry()