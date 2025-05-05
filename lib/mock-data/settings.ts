export interface Setting {
  id: string
  category: string
  key: string
  value: string
  updated_at: string
}

export const mockSettings: Setting[] = [
  {
    id: "1",
    category: "api",
    key: "google_api_key",
    value: "",
    updated_at: "2023-12-01T00:00:00.000Z",
  },
  {
    id: "2",
    category: "api",
    key: "default_model_id",
    value: "1",
    updated_at: "2023-12-01T00:00:00.000Z",
  },
  {
    id: "3",
    category: "appearance",
    key: "theme",
    value: '"system"',
    updated_at: "2023-12-01T00:00:00.000Z",
  },
  {
    id: "4",
    category: "appearance",
    key: "enable_animations",
    value: "true",
    updated_at: "2023-12-01T00:00:00.000Z",
  },
  {
    id: "5",
    category: "advanced",
    key: "token_limit_warning",
    value: "3500",
    updated_at: "2023-12-01T00:00:00.000Z",
  },
  {
    id: "6",
    category: "advanced",
    key: "enable_embeddings",
    value: "true",
    updated_at: "2023-12-01T00:00:00.000Z",
  },
  {
    id: "7",
    category: "advanced",
    key: "enable_token_counting",
    value: "true",
    updated_at: "2023-12-01T00:00:00.000Z",
  },
]
