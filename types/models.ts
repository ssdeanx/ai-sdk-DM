export interface Model {
  id: string
  name: string
  provider: string
  model_id: string
  base_url?: string | null
  api_key?: string
  status: "active" | "inactive"
  created_at: string
  updated_at: string
}
