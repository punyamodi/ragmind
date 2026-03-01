import { useCallback, useState } from 'react'
import { Upload, Link, X, Loader2, FileText, Globe } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { documentsApi } from '../../api/client'
import type { Document } from '../../types'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'

function formatBytes(bytes: number) {
  if (bytes === 0) return '—'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

export function DocumentManager() {
  const qc = useQueryClient()
  const [dragging, setDragging] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [urlName, setUrlName] = useState('')
  const [showUrlForm, setShowUrlForm] = useState(false)
  const [uploading, setUploading] = useState(false)

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: documentsApi.list,
  })

  const deleteMutation = useMutation({
    mutationFn: documentsApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] })
      toast.success('Document removed')
    },
    onError: () => toast.error('Delete failed'),
  })

  const uploadFile = async (file: File) => {
    setUploading(true)
    try {
      await documentsApi.upload(file)
      qc.invalidateQueries({ queryKey: ['documents'] })
      toast.success(`${file.name} ingested`)
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    Array.from(e.dataTransfer.files).forEach(uploadFile)
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files ?? []).forEach(uploadFile)
    e.target.value = ''
  }

  const handleUrlIngest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!urlInput.trim()) return
    setUploading(true)
    try {
      await documentsApi.ingestUrl(urlInput.trim(), urlName.trim() || undefined)
      qc.invalidateQueries({ queryKey: ['documents'] })
      toast.success('URL ingested')
      setUrlInput('')
      setUrlName('')
      setShowUrlForm(false)
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? 'URL ingest failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-100">Documents</h1>
        <p className="text-gray-500 text-sm mt-1">Upload files or add URLs to build your knowledge base</p>
      </div>

      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={clsx(
          'border-2 border-dashed rounded-xl p-8 text-center transition-colors',
          dragging ? 'border-brand-500 bg-brand-900/10' : 'border-gray-700 hover:border-gray-600'
        )}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={32} className="text-brand-400 animate-spin" />
            <p className="text-gray-400 text-sm">Processing document...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload size={32} className="text-gray-500" />
            <div>
              <p className="text-gray-300 font-medium">Drop files here or click to upload</p>
              <p className="text-gray-600 text-sm mt-1">PDF, TXT, MD, DOCX, CSV — max 50MB</p>
            </div>
            <label className="btn-secondary text-sm cursor-pointer">
              Browse Files
              <input type="file" className="hidden" multiple accept=".pdf,.txt,.md,.docx,.doc,.csv" onChange={handleFileInput} />
            </label>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowUrlForm(!showUrlForm)}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <Link size={15} />
          Add URL
        </button>
      </div>

      {showUrlForm && (
        <form onSubmit={handleUrlIngest} className="card p-4 space-y-3 animate-fade-in">
          <p className="text-sm font-medium text-gray-300">Ingest Web Page</p>
          <input
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            placeholder="https://example.com/article"
            className="input w-full text-sm"
          />
          <input
            value={urlName}
            onChange={e => setUrlName(e.target.value)}
            placeholder="Custom name (optional)"
            className="input w-full text-sm"
          />
          <div className="flex gap-2">
            <button type="submit" disabled={uploading || !urlInput.trim()} className="btn-primary text-sm flex items-center gap-2">
              {uploading && <Loader2 size={14} className="animate-spin" />}
              Ingest
            </button>
            <button type="button" onClick={() => setShowUrlForm(false)} className="btn-ghost text-sm">Cancel</button>
          </div>
        </form>
      )}

      <div>
        <p className="text-sm font-medium text-gray-400 mb-3">{docs.length} document{docs.length !== 1 ? 's' : ''} in knowledge base</p>
        {isLoading && (
          <div className="flex items-center gap-2 text-gray-500 text-sm"><Loader2 size={16} className="animate-spin" /> Loading...</div>
        )}
        {!isLoading && docs.length === 0 && (
          <div className="card p-6 text-center text-gray-600 text-sm">No documents yet. Upload files to start building your knowledge base.</div>
        )}
        <div className="space-y-2">
          {docs.map(doc => (
            <div key={doc.id} className="card p-4 flex items-center gap-4">
              <div className="w-9 h-9 rounded-lg bg-gray-800 flex items-center justify-center flex-shrink-0">
                {doc.source_type === 'url' ? <Globe size={18} className="text-brand-400" /> : <FileText size={18} className="text-brand-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-200 text-sm truncate">{doc.name}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-gray-500">{doc.chunk_count} chunks</span>
                  {doc.file_size_bytes > 0 && <span className="text-xs text-gray-600">{formatBytes(doc.file_size_bytes)}</span>}
                  <span className="text-xs text-gray-600">{formatDate(doc.created_at)}</span>
                  <span className={clsx('badge text-xs', doc.source_type === 'url' ? 'bg-blue-900/30 text-blue-400' : 'bg-green-900/30 text-green-400')}>
                    {doc.source_type}
                  </span>
                </div>
              </div>
              <button
                onClick={() => deleteMutation.mutate(doc.id)}
                disabled={deleteMutation.isPending}
                className="btn-danger text-xs flex items-center gap-1"
              >
                <X size={13} />
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
