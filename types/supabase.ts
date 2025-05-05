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
      settings: {
        Row: {
          id: string
          category: string
          key: string
          value: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category: string
          key: string
          value: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
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
    }
  }
}
