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
    }
  }
}
