import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Session } from '../types'
import { sessionsApi } from '../api/client'

interface SessionStore {
  sessions: Session[]
  activeSessionId: string | null
  loading: boolean
  fetchSessions: () => Promise<void>
  createSession: (title?: string) => Promise<Session>
  deleteSession: (id: string) => Promise<void>
  renameSession: (id: string, title: string) => Promise<void>
  setActive: (id: string) => void
}

export const useSessionStore = create<SessionStore>()(
  persist(
    (set, get) => ({
      sessions: [],
      activeSessionId: null,
      loading: false,

      fetchSessions: async () => {
        set({ loading: true })
        try {
          const sessions = await sessionsApi.list()
          set({ sessions, loading: false })
        } catch {
          set({ loading: false })
        }
      },

      createSession: async (title) => {
        const session = await sessionsApi.create(title)
        set(s => ({ sessions: [session, ...s.sessions], activeSessionId: session.id }))
        return session
      },

      deleteSession: async (id) => {
        await sessionsApi.delete(id)
        set(s => {
          const sessions = s.sessions.filter(x => x.id !== id)
          const activeSessionId = s.activeSessionId === id
            ? (sessions[0]?.id ?? null)
            : s.activeSessionId
          return { sessions, activeSessionId }
        })
      },

      renameSession: async (id, title) => {
        const updated = await sessionsApi.update(id, title)
        set(s => ({
          sessions: s.sessions.map(x => x.id === id ? updated : x),
        }))
      },

      setActive: (id) => set({ activeSessionId: id }),
    }),
    { name: 'ragmind-sessions', partialize: s => ({ activeSessionId: s.activeSessionId }) }
  )
)
