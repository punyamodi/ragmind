import { useState, useEffect } from 'react'
import { Save, Loader2, CheckCircle, Server, Key, Thermometer, Hash, Layers, Database } from 'lucide-react'
import { useSettingsStore } from '../../store/settingsStore'
import { healthApi } from '../../api/client'
import type { HealthStatus } from '../../types'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'

interface InputRowProps {
  label: string
  hint?: string
  children: React.ReactNode
}

function InputRow({ label, hint, children }: InputRowProps) {
  return (
    <div className="flex items-start gap-4 py-4 border-b border-gray-800 last:border-0">
      <div className="w-56 flex-shrink-0">
        <p className="text-sm font-medium text-gray-300">{label}</p>
        {hint && <p className="text-xs text-gray-600 mt-0.5">{hint}</p>}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  )
}

export function SettingsPanel() {
  const { settings, fetchSettings, updateSettings } = useSettingsStore()
  const [saving, setSaving] = useState(false)
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [local, setLocal] = useState(settings)

  useEffect(() => {
    if (!settings) fetchSettings()
  }, [])

  useEffect(() => {
    setLocal(settings)
  }, [settings])

  useEffect(() => {
    healthApi.check().then(setHealth).catch(() => {})
  }, [])

  const handleSave = async () => {
    if (!local) return
    setSaving(true)
    try {
      await updateSettings({ ...local, ...(apiKey ? { openai_api_key: apiKey } : {}) })
      toast.success('Settings saved')
    } catch {
      toast.error('Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (!local) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={24} className="text-brand-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-100">Settings</h1>
            <p className="text-gray-500 text-sm mt-1">Configure your AI provider, model, and retrieval parameters</p>
          </div>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2 text-sm">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Save
          </button>
        </div>

        {health && (
          <div className="card p-4 flex items-center gap-4">
            <div className={clsx('w-2.5 h-2.5 rounded-full', health.status === 'ok' ? 'bg-green-400' : 'bg-red-400')} />
            <div className="flex-1 grid grid-cols-3 gap-4 text-sm">
              <div><p className="text-gray-500 text-xs">Version</p><p className="text-gray-200">{health.version}</p></div>
              <div><p className="text-gray-500 text-xs">Provider</p><p className="text-gray-200">{health.llm_provider}</p></div>
              <div><p className="text-gray-500 text-xs">Vector Store</p><p className="text-gray-300 text-xs">{health.vector_store}</p></div>
            </div>
          </div>
        )}

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-1">
            <Server size={16} className="text-brand-400" />
            <h2 className="font-medium text-gray-200">LLM Provider</h2>
          </div>
          <p className="text-xs text-gray-600 mb-4">Choose between OpenAI or a local Ollama instance</p>

          <InputRow label="Provider">
            <div className="flex gap-2">
              {(['openai', 'ollama'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setLocal(s => s ? { ...s, llm_provider: p } : s)}
                  className={clsx('px-4 py-2 rounded-lg text-sm font-medium transition-colors border',
                    local.llm_provider === p
                      ? 'bg-brand-900/50 text-brand-400 border-brand-700'
                      : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600'
                  )}
                >
                  {p === 'openai' ? 'OpenAI' : 'Ollama'}
                </button>
              ))}
            </div>
          </InputRow>

          {local.llm_provider === 'openai' && (
            <>
              <InputRow label="API Key" hint="Stored in memory only, not persisted">
                <input
                  type="password"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="sk-... (leave blank to keep current)"
                  className="input w-full text-sm"
                />
              </InputRow>
              <InputRow label="Model">
                <input value={local.openai_model} onChange={e => setLocal(s => s ? { ...s, openai_model: e.target.value } : s)} className="input w-full text-sm" />
              </InputRow>
              <InputRow label="Base URL" hint="Change for Azure or compatible endpoints">
                <input value={local.openai_base_url} onChange={e => setLocal(s => s ? { ...s, openai_base_url: e.target.value } : s)} className="input w-full text-sm" />
              </InputRow>
            </>
          )}

          {local.llm_provider === 'ollama' && (
            <>
              <InputRow label="Ollama URL">
                <input value={local.ollama_base_url} onChange={e => setLocal(s => s ? { ...s, ollama_base_url: e.target.value } : s)} className="input w-full text-sm" />
              </InputRow>
              <InputRow label="Model">
                <input value={local.ollama_model} onChange={e => setLocal(s => s ? { ...s, ollama_model: e.target.value } : s)} className="input w-full text-sm" placeholder="llama3.2" />
              </InputRow>
            </>
          )}
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Thermometer size={16} className="text-orange-400" />
            <h2 className="font-medium text-gray-200">Generation</h2>
          </div>

          <InputRow label="Temperature" hint={`Current: ${local.temperature}`}>
            <div className="flex items-center gap-3">
              <input
                type="range" min="0" max="2" step="0.05"
                value={local.temperature}
                onChange={e => setLocal(s => s ? { ...s, temperature: parseFloat(e.target.value) } : s)}
                className="flex-1 accent-brand-500"
              />
              <span className="text-sm text-gray-300 w-8 text-right">{local.temperature}</span>
            </div>
          </InputRow>

          <InputRow label="Max Tokens">
            <input
              type="number" min="1" max="32000"
              value={local.max_tokens}
              onChange={e => setLocal(s => s ? { ...s, max_tokens: parseInt(e.target.value) } : s)}
              className="input w-32 text-sm"
            />
          </InputRow>

          <InputRow label="Streaming" hint="Stream tokens as they're generated">
            <button
              onClick={() => setLocal(s => s ? { ...s, streaming: !s.streaming } : s)}
              className={clsx('relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                local.streaming ? 'bg-brand-600' : 'bg-gray-700'
              )}
            >
              <span className={clsx('inline-block h-4 w-4 rounded-full bg-white transition-transform',
                local.streaming ? 'translate-x-6' : 'translate-x-1'
              )} />
            </button>
          </InputRow>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Database size={16} className="text-purple-400" />
            <h2 className="font-medium text-gray-200">Retrieval</h2>
          </div>

          <InputRow label="Document Chunks (K)" hint="Number of document chunks to retrieve">
            <input type="number" min="1" max="20" value={local.retrieval_k}
              onChange={e => setLocal(s => s ? { ...s, retrieval_k: parseInt(e.target.value) } : s)}
              className="input w-24 text-sm" />
          </InputRow>

          <InputRow label="Memory Recall (K)" hint="Number of memories to retrieve">
            <input type="number" min="1" max="30" value={local.memory_retrieval_k}
              onChange={e => setLocal(s => s ? { ...s, memory_retrieval_k: parseInt(e.target.value) } : s)}
              className="input w-24 text-sm" />
          </InputRow>

          <InputRow label="Chunk Size" hint="Characters per document chunk">
            <input type="number" min="100" max="4000" value={local.chunk_size}
              onChange={e => setLocal(s => s ? { ...s, chunk_size: parseInt(e.target.value) } : s)}
              className="input w-28 text-sm" />
          </InputRow>

          <InputRow label="Chunk Overlap" hint="Overlap between adjacent chunks">
            <input type="number" min="0" max="1000" value={local.chunk_overlap}
              onChange={e => setLocal(s => s ? { ...s, chunk_overlap: parseInt(e.target.value) } : s)}
              className="input w-28 text-sm" />
          </InputRow>
        </div>
      </div>
    </div>
  )
}
