import { create } from 'zustand'
import type { Message } from '../types'
import { sessionsApi } from '../api/client'

interface StreamingState {
  isStreaming: boolean
  streamingContent: string
}

interface ChatStore {
  messagesBySession: Record<string, Message[]>
  streaming: StreamingState
  loading: boolean
  useRag: boolean
  useMemory: boolean
  fetchMessages: (sessionId: string) => Promise<void>
  addMessage: (sessionId: string, message: Message) => void
  setStreaming: (state: StreamingState) => void
  appendStreamToken: (token: string) => void
  finalizeStream: (sessionId: string, message: Message) => void
  toggleRag: () => void
  toggleMemory: () => void
  clearSession: (sessionId: string) => void
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messagesBySession: {},
  streaming: { isStreaming: false, streamingContent: '' },
  loading: false,
  useRag: true,
  useMemory: true,

  fetchMessages: async (sessionId) => {
    set({ loading: true })
    try {
      const messages = await sessionsApi.messages(sessionId)
      set(s => ({
        messagesBySession: { ...s.messagesBySession, [sessionId]: messages },
        loading: false,
      }))
    } catch {
      set({ loading: false })
    }
  },

  addMessage: (sessionId, message) => {
    set(s => ({
      messagesBySession: {
        ...s.messagesBySession,
        [sessionId]: [...(s.messagesBySession[sessionId] ?? []), message],
      },
    }))
  },

  setStreaming: (state) => set({ streaming: state }),

  appendStreamToken: (token) => {
    set(s => ({
      streaming: {
        ...s.streaming,
        streamingContent: s.streaming.streamingContent + token,
      },
    }))
  },

  finalizeStream: (sessionId, message) => {
    set(s => ({
      streaming: { isStreaming: false, streamingContent: '' },
      messagesBySession: {
        ...s.messagesBySession,
        [sessionId]: [...(s.messagesBySession[sessionId] ?? []), message],
      },
    }))
  },

  toggleRag: () => set(s => ({ useRag: !s.useRag })),
  toggleMemory: () => set(s => ({ useMemory: !s.useMemory })),

  clearSession: (sessionId) => {
    set(s => {
      const updated = { ...s.messagesBySession }
      delete updated[sessionId]
      return { messagesBySession: updated }
    })
  },
}))
