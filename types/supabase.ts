export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      models: {
        Row: {
          id: string
          name: string
          provider: string
          model_id: string
          base_url: string | null
          api_key: string
          status: "active" | "inactive"
          max_tokens: number
          input_cost_per_token: number
          output_cost_per_token: number
          supports_vision: boolean
          supports_functions: boolean
          supports_streaming: boolean
          default_temperature: number
          default_top_p: number
          default_frequency_penalty: number
          default_presence_penalty: number
          context_window: number
          description: string | null
          category: string
          capabilities: Json
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          provider: string
          model_id: string
          base_url?: string | null
          api_key: string
          status?: "active" | "inactive"
          max_tokens?: number
          input_cost_per_token?: number
          output_cost_per_token?: number
          supports_vision?: boolean
          supports_functions?: boolean
          supports_streaming?: boolean
          default_temperature?: number
          default_top_p?: number
          default_frequency_penalty?: number
          default_presence_penalty?: number
          context_window?: number
          description?: string | null
          category?: string
          capabilities?: Json
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          provider?: string
          model_id?: string
          base_url?: string | null
          api_key?: string
          status?: "active" | "inactive"
          max_tokens?: number
          input_cost_per_token?: number
          output_cost_per_token?: number
          supports_vision?: boolean
          supports_functions?: boolean
          supports_streaming?: boolean
          default_temperature?: number
          default_top_p?: number
          default_frequency_penalty?: number
          default_presence_penalty?: number
          context_window?: number
          description?: string | null
          category?: string
          capabilities?: Json
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      tools: {
        Row: {
          id: string
          name: string
          description: string
          parameters_schema: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description: string
          parameters_schema: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          parameters_schema?: string
          created_at?: string
          updated_at?: string
        }
      }
      agents: {
        Row: {
          id: string
          name: string
          description: string
          model_id: string
          tool_ids: string[]
          system_prompt: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description: string
          model_id: string
          tool_ids?: string[]
          system_prompt?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          model_id?: string
          tool_ids?: string[]
          system_prompt?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      agent_tools: {
        Row: {
          agent_id: string
          tool_id: string
          created_at: string
        }
        Insert: {
          agent_id: string
          tool_id: string
          created_at?: string
        }
        Update: {
          agent_id?: string
          tool_id?: string
          created_at?: string
        }
      }
      settings: {
        Row: {
          category: string
          key: string
          value: string
          created_at: string
          updated_at: string
        }
        Insert: {
          category: string
          key: string
          value: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          category?: string
          key?: string
          value?: string
          created_at?: string
          updated_at?: string
        }
      }
      blog_posts: {
        Row: {
          id: string
          title: string
          content: string
          excerpt: string
          author: string
          image_url: string
          tags: string
          featured: boolean
          published_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          content: string
          excerpt?: string
          author?: string
          image_url?: string
          tags?: string
          featured?: boolean
          published_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          content?: string
          excerpt?: string
          author?: string
          image_url?: string
          tags?: string
          featured?: boolean
          published_at?: string
          created_at?: string
          updated_at?: string
        }
      }
      mdx_documents: {
        Row: {
          id: string
          title: string
          content: string
          excerpt: string
          user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          content: string
          excerpt?: string
          user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          content?: string
          excerpt?: string
          user_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      content: {
        Row: {
          id: string
          type: string // e.g. 'architecture', 'features', 'footer', 'hero', 'cta', 'code-examples', etc.
          title?: string
          subtitle?: string
          description?: string
          content?: string // markdown, html, or rich text
          data?: Json // JSON for structured content (e.g. stats, links, sections, code, etc.)
          image_url?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          type: string
          title?: string
          subtitle?: string
          description?: string
          content?: string
          data?: Json
          image_url?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          type?: string
          title?: string
          subtitle?: string
          description?: string
          content?: string
          data?: Json
          image_url?: string
          created_at?: string
          updated_at?: string
        }
      }
      traces: {
        Row: {
          id: string
          name: string
          startTime: string
          endTime: string
          duration: number
          status: string
          userId: string
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          startTime: string
          endTime: string
          duration: number
          status: string
          userId: string
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          startTime?: string
          endTime?: string
          duration?: number
          status?: string
          userId?: string
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      spans: {
        Row: {
          id: string
          traceId: string
          name: string
          startTime: string
          endTime: string
          duration: number
          status: string
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          traceId: string
          name: string
          startTime: string
          endTime: string
          duration: number
          status: string
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          traceId?: string
          name?: string
          startTime?: string
          endTime?: string
          duration?: number
          status?: string
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      events: {
        Row: {
          id: string
          traceId: string
          name: string
          timestamp: string
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          traceId: string
          name: string
          timestamp: string
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          traceId?: string
          name?: string
          timestamp?: string
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      system_metrics: {
        Row: {
          id: string
          timeRange: string
          timestamp: string
          cpu_usage: number
          memory_usage: number
          database_connections: number
          api_requests_per_minute: number
          average_response_time_ms: number
          active_users: number
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          timeRange: string
          timestamp: string
          cpu_usage: number
          memory_usage: number
          database_connections: number
          api_requests_per_minute: number
          average_response_time_ms: number
          active_users: number
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          timeRange?: string
          timestamp?: string
          cpu_usage?: number
          memory_usage?: number
          database_connections?: number
          api_requests_per_minute?: number
          average_response_time_ms?: number
          active_users?: number
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      model_performance: {
        Row: {
          id: string
          modelId: string
          provider: string
          displayName: string
          timestamp: string
          latency_ms: number
          tokens_per_second: number
          success_rate: number
          request_count: number
          total_tokens: number
          error_count: number
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          modelId: string
          provider: string
          displayName: string
          timestamp: string
          latency_ms: number
          tokens_per_second: number
          success_rate: number
          request_count: number
          total_tokens: number
          error_count: number
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          modelId?: string
          provider?: string
          displayName?: string
          timestamp?: string
          latency_ms?: number
          tokens_per_second?: number
          success_rate?: number
          request_count?: number
          total_tokens?: number
          error_count?: number
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      model_costs: {
        Row: {
          id: string
          modelId: string
          provider: string
          displayName: string
          costPerInputToken: number
          costPerOutputToken: number
          date: string
          cost: number
          inputTokens: number
          outputTokens: number
          requests: number
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          modelId: string
          provider: string
          displayName: string
          costPerInputToken: number
          costPerOutputToken: number
          date: string
          cost: number
          inputTokens: number
          outputTokens: number
          requests: number
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          modelId?: string
          provider?: string
          displayName?: string
          costPerInputToken?: number
          costPerOutputToken?: number
          date?: string
          cost?: number
          inputTokens?: number
          outputTokens?: number
          requests?: number
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      model_evaluations: {
        Row: {
          id: string
          modelId: string
          provider: string
          displayName: string
          version: string
          evaluationDate: string
          datasetName: string
          datasetSize: number
          overallScore: number
          previousScore: number | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          modelId: string
          provider: string
          displayName: string
          version: string
          evaluationDate: string
          datasetName: string
          datasetSize: number
          overallScore: number
          previousScore?: number | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          modelId?: string
          provider?: string
          displayName?: string
          version?: string
          evaluationDate?: string
          datasetName?: string
          datasetSize?: number
          overallScore?: number
          previousScore?: number | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      evaluation_metrics: {
        Row: {
          id: string
          evaluationId: string
          name: string
          description: string
          value: number
          threshold: number
          weight: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          evaluationId: string
          name: string
          description: string
          value: number
          threshold: number
          weight: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          evaluationId?: string
          name?: string
          description?: string
          value?: number
          threshold?: number
          weight?: number
          created_at?: string
          updated_at?: string
        }
      }
      evaluation_examples: {
        Row: {
          id: string
          evaluationId: string
          input: string
          expectedOutput: string
          actualOutput: string
          scores: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          evaluationId: string
          input: string
          expectedOutput: string
          actualOutput: string
          scores: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          evaluationId?: string
          input?: string
          expectedOutput?: string
          actualOutput?: string
          scores?: Json
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
