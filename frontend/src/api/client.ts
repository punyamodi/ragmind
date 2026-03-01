import axios from 'axios'
import type { Session, Message, Document, Memory, Settings, HealthStatus } from '../types'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

export const sessionsApi = {
  list: () => api.get<Session[]>('/sessions').then(r => r.data),
  create: (title?: string) => api.post<Session>('/sessions', { title: title ?? 'New Chat' }).then(r => r.data),
  get: (id: string) => api.get<Session>(`/sessions/${id}`).then(r => r.data),
  update: (id: string, title: string) => api.patch<Session>(`/sessions/${id}`, { title }).then(r => r.data),
  delete: (id: string) => api.delete(`/sessions/${id}`).then(r => r.data),
  messages: (id: string) => api.get<Message[]>(`/sessions/${id}/messages`).then(r => r.data),
  export: (id: string) => api.post<{ content: string; filename: string }>(`/sessions/${id}/export`).then(r => r.data),
}

export const chatApi = {
  send: (sessionId: string, content: string, useRag = true, useMemory = true, stream = false) =>
    api.post('/chat', { session_id: sessionId, content, use_rag: useRag, use_memory: useMemory, stream }).then(r => r.data),
}

export const documentsApi = {
  list: () => api.get<Document[]>('/documents').then(r => r.data),
  upload: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<Document>('/documents', form, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)
  },
  ingestUrl: (url: string, name?: string) => api.post<Document>('/documents/url', { url, name }).then(r => r.data),
  delete: (id: string) => api.delete(`/documents/${id}`).then(r => r.data),
}

export const memoriesApi = {
  list: () => api.get<Memory[]>('/memories').then(r => r.data),
  search: (query: string, k = 10) => api.post<Memory[]>('/memories/search', { query, k }).then(r => r.data),
  delete: (id: string) => api.delete(`/memories/${id}`).then(r => r.data),
  clearAll: () => api.delete('/memories').then(r => r.data),
}

export const settingsApi = {
  get: () => api.get<Settings>('/settings').then(r => r.data),
  update: (data: Partial<Settings> & { openai_api_key?: string }) => api.patch<Settings>('/settings', data).then(r => r.data),
}

export const healthApi = {
  check: () => api.get<HealthStatus>('/health').then(r => r.data),
}

export default api
