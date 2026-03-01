import { useEffect, useRef, useState } from 'react'
import { MessageBubble, StreamingBubble } from './MessageBubble'
import { ChatInput } from './ChatInput'
import { TypingIndicator } from './TypingIndicator'
import { useChatStore } from '../../store/chatStore'
import { useSessionStore } from '../../store/sessionStore'
import type { Message, ChatStreamEvent } from '../../types'
import { Brain, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { sessionsApi } from '../../api/client'

export function ChatWindow() {
  const { activeSessionId, sessions } = useSessionStore()
  const { messagesBySession, streaming, fetchMessages, addMessage, setStreaming, appendStreamToken, finalizeStream, useRag, useMemory } = useChatStore()
  const bottomRef = useRef<HTMLDivElement>(null)
  const [sendError, setSendError] = useState<string | null>(null)

  const activeSession = sessions.find(s => s.id === activeSessionId)
  const messages = activeSessionId ? (messagesBySession[activeSessionId] ?? []) : []

  useEffect(() => {
    if (activeSessionId) {
      fetchMessages(activeSessionId)
    }
  }, [activeSessionId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, streaming.streamingContent])

  const sendMessage = async (content: string) => {
    if (!activeSessionId) return
    setSendError(null)

    const userMsg: Message = {
      id: crypto.randomUUID(),
      session_id: activeSessionId,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
      tokens_used: 0,
    }
    addMessage(activeSessionId, userMsg)
    setStreaming({ isStreaming: true, streamingContent: '' })

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: activeSessionId,
          content,
          use_rag: useRag,
          use_memory: useMemory,
          stream: true,
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.detail ?? 'Chat request failed')
      }

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''
      let finalMsgId = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const text = decoder.decode(value)
        const lines = text.split('\n')
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event: ChatStreamEvent = JSON.parse(line.slice(6))
            if (event.type === 'token' && event.content) {
              fullContent += event.content
              appendStreamToken(event.content)
            } else if (event.type === 'done') {
              finalMsgId = event.message_id ?? ''
            } else if (event.type === 'error') {
              throw new Error(event.content)
            }
          } catch {
          }
        }
      }

      const assistantMsg: Message = {
        id: finalMsgId || crypto.randomUUID(),
        session_id: activeSessionId,
        role: 'assistant',
        content: fullContent,
        created_at: new Date().toISOString(),
        tokens_used: 0,
      }
      finalizeStream(activeSessionId, assistantMsg)
    } catch (err) {
      setStreaming({ isStreaming: false, streamingContent: '' })
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setSendError(msg)
      toast.error(msg)
    }
  }

  const handleExport = async () => {
    if (!activeSessionId) return
    try {
      const { content, filename } = await sessionsApi.export(activeSessionId)
      const blob = new Blob([content], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Export failed')
    }
  }

  if (!activeSessionId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Brain size={32} className="text-brand-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-200 mb-2">Welcome to RAGMind</h2>
          <p className="text-gray-500 text-sm max-w-sm">Start a new conversation and teach the AI. It remembers what you tell it and learns from your documents.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-800 flex-shrink-0">
        <h1 className="font-semibold text-gray-200 truncate">{activeSession?.title ?? 'Chat'}</h1>
        <button onClick={handleExport} className="btn-ghost flex items-center gap-1.5 text-xs">
          <Download size={14} />
          Export
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && !streaming.isStreaming && (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-600 text-sm">Send a message to get started</p>
          </div>
        )}
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {streaming.isStreaming && streaming.streamingContent && (
          <StreamingBubble content={streaming.streamingContent} />
        )}
        {streaming.isStreaming && !streaming.streamingContent && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
              <Brain size={16} className="text-brand-400" />
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-2xl rounded-tl-sm px-4 py-3">
              <TypingIndicator />
            </div>
          </div>
        )}
        {sendError && (
          <div className="bg-red-900/20 border border-red-800/50 text-red-400 text-sm rounded-lg px-4 py-3">
            {sendError}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <ChatInput onSend={sendMessage} disabled={streaming.isStreaming} />
    </div>
  )
}
