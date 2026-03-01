import { ChatWindow } from '../components/Chat/ChatWindow'
import { useSessionStore } from '../store/sessionStore'
import { useEffect } from 'react'

export function ChatPage() {
  const { fetchSessions, sessions, activeSessionId, createSession } = useSessionStore()

  useEffect(() => {
    fetchSessions()
  }, [])

  useEffect(() => {
    if (sessions.length > 0 && !activeSessionId) {
      useSessionStore.getState().setActive(sessions[0].id)
    }
  }, [sessions, activeSessionId])

  return <ChatWindow />
}
