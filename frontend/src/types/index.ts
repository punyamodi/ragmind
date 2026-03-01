export interface Message {
  id: string
  session_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
  tokens_used: number
}

export interface Session {
  id: string
  title: string
  created_at: string
  updated_at: string
  message_count: number
}

export interface Document {
  id: string
  name: string
  source_type: 'file' | 'url'
  chunk_count: number
  file_size_bytes: number
  created_at: string
}

export interface Memory {
  id: string
  content: string
  metadata: Record<string, string>
  distance?: number
}

export interface Settings {
  llm_provider: 'openai' | 'ollama'
  openai_model: string
  openai_base_url: string
  ollama_base_url: string
  ollama_model: string
  temperature: number
  max_tokens: number
  streaming: boolean
  chunk_size: number
  chunk_overlap: number
  retrieval_k: number
  memory_retrieval_k: number
}

export interface HealthStatus {
  status: string
  version: string
  llm_provider: string
  vector_store: string
}

export interface ChatStreamEvent {
  type: 'token' | 'done' | 'error'
  content?: string
  message_id?: string
  memories_used?: string[]
  context_sources?: string[]
}
