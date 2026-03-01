import { useState } from 'react'
import { Brain, Search, Trash2, X, Loader2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { memoriesApi } from '../../api/client'
import type { Memory } from '../../types'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'

function MemoryCard({ memory, onDelete }: { memory: Memory; onDelete: (id: string) => void }) {
  const relevance = memory.distance != null ? Math.round((1 - memory.distance) * 100) : null

  return (
    <div className="card p-4 flex items-start gap-3 animate-fade-in">
      <div className="w-8 h-8 rounded-lg bg-purple-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Brain size={15} className="text-purple-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-200 leading-relaxed">{memory.content}</p>
        <div className="flex items-center gap-3 mt-2">
          {memory.metadata.session_id && (
            <span className="text-xs text-gray-600">Session: {memory.metadata.session_id.slice(0, 8)}...</span>
          )}
          {memory.metadata.created_at && (
            <span className="text-xs text-gray-600">
              {new Date(memory.metadata.created_at).toLocaleDateString()}
            </span>
          )}
          {relevance != null && (
            <span className={clsx(
              'badge text-xs',
              relevance >= 80 ? 'bg-green-900/30 text-green-400' : relevance >= 50 ? 'bg-yellow-900/30 text-yellow-400' : 'bg-gray-800 text-gray-500'
            )}>
              {relevance}% match
            </span>
          )}
        </div>
      </div>
      <button onClick={() => onDelete(memory.id)} className="btn-ghost p-1.5 text-gray-600 hover:text-red-400">
        <X size={14} />
      </button>
    </div>
  )
}

export function MemoryBrowser() {
  const qc = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Memory[] | null>(null)
  const [searching, setSearching] = useState(false)

  const { data: memories = [], isLoading } = useQuery({
    queryKey: ['memories'],
    queryFn: memoriesApi.list,
  })

  const deleteMutation = useMutation({
    mutationFn: memoriesApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['memories'] })
      if (searchResults) {
        setSearchResults(prev => prev?.filter(m => m.id !== deleteMutation.variables) ?? null)
      }
      toast.success('Memory deleted')
    },
  })

  const clearMutation = useMutation({
    mutationFn: memoriesApi.clearAll,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['memories'] })
      setSearchResults(null)
      toast.success('All memories cleared')
    },
  })

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) {
      setSearchResults(null)
      return
    }
    setSearching(true)
    try {
      const results = await memoriesApi.search(searchQuery.trim())
      setSearchResults(results)
    } catch {
      toast.error('Search failed')
    } finally {
      setSearching(false)
    }
  }

  const displayMemories = searchResults ?? memories

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-100">Memory</h1>
          <p className="text-gray-500 text-sm mt-1">RAGMind automatically extracts and stores facts from your conversations</p>
        </div>
        {memories.length > 0 && (
          <button
            onClick={() => clearMutation.mutate()}
            disabled={clearMutation.isPending}
            className="btn-danger text-sm flex items-center gap-2"
          >
            {clearMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Clear All
          </button>
        )}
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search memories semantically..."
            className="input w-full pl-9 text-sm"
          />
        </div>
        <button type="submit" disabled={searching} className="btn-primary text-sm flex items-center gap-2">
          {searching && <Loader2 size={14} className="animate-spin" />}
          Search
        </button>
        {searchResults != null && (
          <button type="button" onClick={() => { setSearchResults(null); setSearchQuery('') }} className="btn-ghost text-sm">
            Clear
          </button>
        )}
      </form>

      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-gray-400">
            {searchResults != null
              ? `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''} for "${searchQuery}"`
              : `${memories.length} memorized fact${memories.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 text-gray-500 text-sm"><Loader2 size={16} className="animate-spin" /> Loading...</div>
        )}

        {!isLoading && displayMemories.length === 0 && (
          <div className="card p-8 text-center">
            <Brain size={32} className="text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              {searchResults != null ? 'No matching memories found' : 'No memories yet. Start chatting and RAGMind will learn!'}
            </p>
          </div>
        )}

        <div className="space-y-2">
          {displayMemories.map(memory => (
            <MemoryCard key={memory.id} memory={memory} onDelete={id => deleteMutation.mutate(id)} />
          ))}
        </div>
      </div>
    </div>
  )
}
