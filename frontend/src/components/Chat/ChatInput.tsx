import { useState, useRef, FormEvent } from 'react'
import { Send, Database, Brain, Paperclip } from 'lucide-react'
import { clsx } from 'clsx'
import { useChatStore } from '../../store/chatStore'

interface ChatInputProps {
  onSend: (content: string) => void
  disabled: boolean
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState('')
  const { useRag, useMemory, toggleRag, toggleMemory } = useChatStore()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as FormEvent)
    }
  }

  const handleInput = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }

  return (
    <div className="border-t border-gray-800 p-4">
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={toggleRag}
          className={clsx(
            'badge gap-1 cursor-pointer transition-colors',
            useRag ? 'bg-brand-900/50 text-brand-400 border border-brand-800' : 'bg-gray-800 text-gray-500 border border-gray-700'
          )}
        >
          <Database size={11} />
          RAG
        </button>
        <button
          onClick={toggleMemory}
          className={clsx(
            'badge gap-1 cursor-pointer transition-colors',
            useMemory ? 'bg-purple-900/50 text-purple-400 border border-purple-800' : 'bg-gray-800 text-gray-500 border border-gray-700'
          )}
        >
          <Brain size={11} />
          Memory
        </button>
        <span className="text-xs text-gray-600 ml-auto">Shift+Enter for new line</span>
      </div>
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder="Ask anything... (RAGMind will remember important details)"
            rows={1}
            disabled={disabled}
            className="input w-full resize-none min-h-[42px] pr-4 py-2.5 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className="btn-primary h-[42px] w-[42px] flex items-center justify-center p-0 flex-shrink-0"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  )
}
