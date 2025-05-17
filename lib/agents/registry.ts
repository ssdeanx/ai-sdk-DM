import { getSupabaseClient } from '../memory/supabase';
import { BaseAgent } from './baseAgent';
import { Agent, ToolConfig, AgentHooks } from './agent.types';
import { LRUCache } from 'lru-cache';

/**
 * Registry for managing agent instances
 */
export class AgentRegistry {
  private agents: Map<string, BaseAgent> = new Map();
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  // LRU cache for agent configurations
  private agentConfigCache: LRUCache<string, Agent> = new LRUCache({
    max: 50, // Maximum number of agent configs to cache
    ttl: 300000, // 5 minutes TTL
    updateAgeOnGet: true, // Reset TTL when item is accessed
  });

  // LRU cache for agent tools
  private agentToolsCache: LRUCache<string, ToolConfig[]> = new LRUCache({
    max: 50, // Maximum number of tool sets to cache
    ttl: 300000, // 5 minutes TTL
    updateAgeOnGet: true, // Reset TTL when item is accessed
  });

  // Cache statistics
  private cacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
  };

  /**
   * Initialize registry by loading agents and their tools from Supabase
   */
  public async init(): Promise<void> {
    if (this.initialized) return;

    if (this.initPromise) {
      await this.initPromise;
      return;
    }

    this.initPromise = this.loadAgents();
    await this.initPromise;
    this.initialized = true;
  }

  /**
   * Load agents from Supabase
   */
  private async loadAgents(): Promise<void> {
    try {
      const supabase = getSupabaseClient();

      // Get all agents from Supabase
      const { data: agents, error } = await supabase.from('agents').select('*');
      if (error) throw error;

      // Clear existing agents
      this.agents.clear();

      // Load each agent and its tools
      for (const agentConfig of agents) {
        await this.loadAgent(agentConfig as Agent);
      }

      console.log(`Loaded ${this.agents.size} agents`);
    } catch (error) {
      console.error('Failed to load agents:', error);
      throw error;
    }
  }

  /**
   * Load a single agent and its tools
   *
   * @param agentConfig - Agent configuration from Supabase
   */
  private async loadAgent(agentConfig: Agent): Promise<void> {
    try {
      // Cache the agent configuration
      this.agentConfigCache.set(agentConfig.id, agentConfig);
      this.cacheStats.sets++;

      // Check if tools are in cache
      const cacheKey = `agent_tools_${agentConfig.id}`;
      let tools = this.agentToolsCache.get(cacheKey);

      if (tools) {
        this.cacheStats.hits++;
      } else {
        this.cacheStats.misses++;

        // Load tools linked to this agent from Supabase
        const supabase = getSupabaseClient();
        const { data: toolRows, error: toolError } = await supabase
          .from('agent_tools')
          .select('tools:tools(*)')
          .eq('agent_id', agentConfig.id);

        if (toolError) throw toolError;

        // Extract tool configurations
        tools = toolRows.map((row) => row.tools as unknown as ToolConfig);

        // Cache the tools
        this.agentToolsCache.set(cacheKey, tools);
        this.cacheStats.sets++;
      }

      // Create agent hooks
      const hooks: AgentHooks = {
        onStart: async (input, threadId) => {
          console.log(
            `Agent ${agentConfig.name} started with input: ${input.substring(0, 50)}...`
          );
        },
        onToolCall: async (toolName, params) => {
          console.log(`Agent ${agentConfig.name} called tool: ${toolName}`);
        },
        onFinish: async (result) => {
          console.log(
            `Agent ${agentConfig.name} finished with output: ${result.output.substring(0, 50)}...`
          );
        },
      };

      // Create and register agent
      const agent = new BaseAgent(agentConfig, tools, hooks);
      this.agents.set(agentConfig.id, agent);
    } catch (error) {
      console.error(`Failed to load agent ${agentConfig.id}:`, error);
    }
  }

  /**
   * Get a registered agent by ID
   *
   * @param id - Agent ID
   * @returns BaseAgent instance
   * @throws Error if agent not found
   */
  public async getAgent(id: string): Promise<BaseAgent> {
    await this.ensureInitialized();

    // Check if agent is already loaded
    const agent = this.agents.get(id);
    if (agent) return agent;

    // Agent not loaded, check if config is in cache
    const cachedConfig = this.agentConfigCache.get(id);
    if (cachedConfig) {
      // Load agent from cached config
      await this.loadAgent(cachedConfig);

      // Get the newly loaded agent
      const loadedAgent = this.agents.get(id);
      if (loadedAgent) return loadedAgent;
    }

    // Agent not in cache, try to load from Supabase
    try {
      await this.reloadAgent(id);

      // Get the newly loaded agent
      const loadedAgent = this.agents.get(id);
      if (loadedAgent) return loadedAgent;
    } catch (error) {
      console.error(`Failed to load agent ${id}:`, error);
    }

    throw new Error(`Agent not found: ${id}`);
  }

  /**
   * List all registered agents
   *
   * @returns Array of BaseAgent instances
   */
  public async listAgents(): Promise<BaseAgent[]> {
    await this.ensureInitialized();
    return Array.from(this.agents.values());
  }

  /**
   * Reload a specific agent from Supabase
   *
   * @param id - Agent ID to reload
   */
  public async reloadAgent(id: string): Promise<void> {
    try {
      // Clear any cached data for this agent
      this.agentConfigCache.delete(`${id}`);
      this.agentToolsCache.delete(`agent_tools_${id}`);

      // Remove from loaded agents if present
      this.agents.delete(id);

      const supabase = getSupabaseClient();

      // Get agent from Supabase
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) throw new Error(`Agent not found: ${id}`);

      // Cache the agent configuration
      const agentConfig = data as Agent;
      this.agentConfigCache.set(id, agentConfig);
      this.cacheStats.sets++;

      // Load agent and its tools
      await this.loadAgent(agentConfig);
    } catch (error) {
      console.error(`Failed to reload agent ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get cache statistics
   *
   * @returns Cache statistics
   */
  public getCacheStats(): {
    configs: { size: number; max: number };
    tools: { size: number; max: number };
    hits: number;
    misses: number;
    sets: number;
    hitRate: number;
  } {
    const totalRequests = this.cacheStats.hits + this.cacheStats.misses;
    const hitRate =
      totalRequests > 0 ? this.cacheStats.hits / totalRequests : 0;

    return {
      configs: {
        size: this.agentConfigCache.size,
        max: this.agentConfigCache.max,
      },
      tools: {
        size: this.agentToolsCache.size,
        max: this.agentToolsCache.max,
      },
      hits: this.cacheStats.hits,
      misses: this.cacheStats.misses,
      sets: this.cacheStats.sets,
      hitRate,
    };
  }

  /**
   * Clear all caches
   */
  public clearCaches(): void {
    this.agentConfigCache.clear();
    this.agentToolsCache.clear();

    // Reset statistics
    this.cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0,
    };
  }

  /**
   * Ensure the registry is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.init();
    }
  }
}

/**
 * Singleton instance of AgentRegistry
 */
export const agentRegistry = new AgentRegistry();
