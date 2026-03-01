import { NavLink } from 'react-router-dom'
import { MessageSquare, FileText, Brain, Settings, Plus, Trash2, Edit2, Check, X } from 'lucide-react'
import { useSessionStore } from '../../store/sessionStore'
import { useState } from 'react'
import { clsx } from 'clsx'

export function Sidebar() {
  const { sessions, activeSessionId, createSession, deleteSession, renameSession, setActive } = useSessionStore()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const handleNew = async () => {
    await createSession('New Chat')
  }

  const handleRenameStart = (id: string, title: string) => {
    setEditingId(id)
    setEditValue(title)
  }

  const handleRenameCommit = async () => {
    if (editingId && editValue.trim()) {
      await renameSession(editingId, editValue.trim())
    }
    setEditingId(null)
  }

  return (
    <aside className="w-64 flex flex-col bg-gray-950 border-r border-gray-800 h-full">
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
            <Brain size={16} className="text-white" />
          </div>
          <span className="font-semibold text-white text-lg">Engram</span>
        </div>
        <button onClick={handleNew} className="btn-primary w-full flex items-center justify-center gap-2 text-sm">
          <Plus size={16} />
          New Chat
        </button>
      </div>

      <nav className="p-2 border-b border-gray-800">
        {[
          { to: '/', icon: MessageSquare, label: 'Chat' },
          { to: '/documents', icon: FileText, label: 'Documents' },
          { to: '/memory', icon: Brain, label: 'Memory' },
          { to: '/settings', icon: Settings, label: 'Settings' },
        ].map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              clsx('flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-0.5',
                isActive ? 'bg-brand-900/40 text-brand-400' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              )
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="flex-1 overflow-y-auto p-2">
        <p className="text-xs text-gray-600 font-medium px-2 py-1 uppercase tracking-wide">Conversations</p>
        {sessions.length === 0 && (
          <p className="text-gray-600 text-xs px-2 py-3">No conversations yet</p>
        )}
        {sessions.map(session => (
          <div
            key={session.id}
            onClick={() => setActive(session.id)}
            className={clsx(
              'group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer text-sm transition-colors mb-0.5',
              activeSessionId === session.id ? 'bg-gray-800 text-gray-100' : 'text-gray-400 hover:bg-gray-900 hover:text-gray-200'
            )}
          >
            {editingId === session.id ? (
              <div className="flex-1 flex items-center gap-1" onClick={e => e.stopPropagation()}>
                <input
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleRenameCommit(); if (e.key === 'Escape') setEditingId(null) }}
                  className="flex-1 bg-gray-700 text-white text-xs rounded px-1.5 py-1 focus:outline-none min-w-0"
                  autoFocus
                />
                <button onClick={handleRenameCommit} className="text-green-400 hover:text-green-300"><Check size={12} /></button>
                <button onClick={() => setEditingId(null)} className="text-gray-500 hover:text-gray-300"><X size={12} /></button>
              </div>
            ) : (
              <>
                <span className="flex-1 truncate text-xs">{session.title}</span>
                <div className="hidden group-hover:flex items-center gap-1">
                  <button
                    onClick={e => { e.stopPropagation(); handleRenameStart(session.id, session.title) }}
                    className="p-0.5 text-gray-500 hover:text-gray-300"
                  >
                    <Edit2 size={11} />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); deleteSession(session.id) }}
                    className="p-0.5 text-gray-500 hover:text-red-400"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-gray-800">
        <p className="text-xs text-gray-600 text-center">Engram v2.0</p>
      </div>
    </aside>
  )
}
