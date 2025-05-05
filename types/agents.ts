export interface Agent {
  id: string
  name: string
  description: string
  model_id: string
  tool_ids: string[]
  system_prompt?: string | null
  created_at: string
  updated_at: string
}
