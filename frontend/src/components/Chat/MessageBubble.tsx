import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { clsx } from 'clsx'
import type { Message } from '../../types'
import { User, Brain } from 'lucide-react'

interface MessageBubbleProps {
  message: Message
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  return (
    <div className={clsx('flex gap-3 animate-slide-in', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div className={clsx(
        'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
        isUser ? 'bg-brand-600' : 'bg-gray-700'
      )}>
        {isUser ? <User size={16} className="text-white" /> : <Brain size={16} className="text-brand-400" />}
      </div>
      <div className={clsx('max-w-[75%] flex flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
        <div className={clsx(
          'px-4 py-3 rounded-2xl text-sm leading-relaxed',
          isUser
            ? 'bg-brand-600 text-white rounded-tr-sm'
            : 'bg-gray-800 text-gray-100 rounded-tl-sm border border-gray-700'
        )}>
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose-dark text-sm">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>
        <span className="text-xs text-gray-600">{formatTime(message.created_at)}</span>
      </div>
    </div>
  )
}

interface StreamingBubbleProps {
  content: string
}

export function StreamingBubble({ content }: StreamingBubbleProps) {
  return (
    <div className="flex gap-3 animate-slide-in">
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-gray-700">
        <Brain size={16} className="text-brand-400" />
      </div>
      <div className="max-w-[75%] px-4 py-3 rounded-2xl rounded-tl-sm bg-gray-800 border border-gray-700 text-sm leading-relaxed">
        <div className="prose-dark text-sm">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || '\u200b'}</ReactMarkdown>
        </div>
        <span className="inline-block w-0.5 h-4 bg-brand-400 ml-0.5 animate-pulse align-middle" />
      </div>
    </div>
  )
}
