'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { CloudUpload, File, Loader2, Trash2 } from 'lucide-react'
import type { SessionFile } from '@/types/session'

interface FileSharePanelProps {
  files?: SessionFile[]
  initialFiles?: SessionFile[]
  onUpload?: (files: FileList | null) => void
  onRemove?: (fileId: string) => void
  uploading?: boolean
  uploadError?: string | null
  loading?: boolean
}

export default function FileSharePanel({
  files,
  initialFiles = [],
  onUpload,
  onRemove,
  uploading = false,
  uploadError = null,
  loading = false,
}: FileSharePanelProps) {
  const isControlled = Array.isArray(files)
  const [internalFiles, setInternalFiles] = useState<SessionFile[]>(initialFiles)

  useEffect(() => {
    if (!isControlled) {
      setInternalFiles(initialFiles)
    }
  }, [initialFiles, isControlled])

  const displayedFiles = files ?? internalFiles

  const handleFiles = useCallback(
    (incoming: FileList | null) => {
      if (!incoming || uploading) return
      onUpload?.(incoming)

      if (!isControlled) {
        const mapped: SessionFile[] = Array.from(incoming).map((file) => ({
          id: `${file.name}-${file.size}-${Date.now()}`,
          fileName: file.name,
          fileSize: file.size,
          uploadedAt: new Date().toISOString(),
          uploadedBy: 'You',
        }))
        setInternalFiles((prev) => [...mapped, ...prev])
      }
    },
    [isControlled, onUpload, uploading]
  )

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      event.stopPropagation()
      handleFiles(event.dataTransfer.files)
    },
    [handleFiles]
  )

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(event.target.files)
    },
    [handleFiles]
  )

  const removeFile = useCallback(
    (fileId: string) => {
      onRemove?.(fileId)
      if (!isControlled) {
        setInternalFiles((prev) => prev.filter((file) => file.id !== fileId))
      }
    },
    [isControlled, onRemove]
  )

  const formattedFiles = useMemo(
    () =>
      displayedFiles.map((file) => ({
        ...file,
        formattedSize: new Intl.NumberFormat(undefined, {
          style: 'unit',
          unit: 'kilobyte',
          unitDisplay: 'narrow',
        }).format(Math.max(Math.round(file.fileSize / 1024), 1)),
      })),
    [displayedFiles]
  )

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">Shared Files</h2>
        <p className="text-xs text-slate-500">Upload repair quotes, photos, or diagnostic scans.</p>
      </header>
      <div
        onDragOver={(event) => {
          event.preventDefault()
          event.dataTransfer.dropEffect = uploading ? 'none' : 'copy'
        }}
        onDrop={handleDrop}
        className="flex flex-col gap-4 px-4 py-6"
      >
        {uploadError && (
          <p className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-xs text-red-600">{uploadError}</p>
        )}
        <label
          className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-300 px-4 py-8 text-center transition ${
            uploading
              ? 'cursor-not-allowed bg-slate-100 text-slate-400'
              : 'cursor-pointer bg-slate-50 hover:border-orange-400 hover:bg-blue-50'
          }`}
        >
          <CloudUpload className="h-8 w-8 text-orange-500" />
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {uploading ? 'Uploading…' : 'Drag & drop files or click to upload'}
            </p>
            <p className="text-xs text-slate-500">PDF, PNG, JPG up to 25 MB each</p>
          </div>
          <input type="file" multiple onChange={handleChange} className="hidden" disabled={uploading} />
        </label>

        <ul className="space-y-3">
          {loading && formattedFiles.length === 0 && (
            <li className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading shared files…
            </li>
          )}
          {!loading && formattedFiles.length === 0 && (
            <li className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-center text-xs text-slate-500">
              Files you share during the call will appear here for both participants.
            </li>
          )}
          {formattedFiles.map((file) => (
            <li
              key={file.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-orange-600">
                  <File className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold text-slate-900" title={file.fileName}>
                    {file.url ? (
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="transition hover:text-orange-600 hover:underline"
                      >
                        {file.fileName}
                      </a>
                    ) : (
                      file.fileName
                    )}
                  </p>
                  <p className="text-xs text-slate-500">
                    Uploaded {new Date(file.uploadedAt).toLocaleTimeString()} by {file.uploadedBy} • {file.formattedSize}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeFile(file.id)}
                className="rounded-full border border-transparent p-2 text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                aria-label={`Remove ${file.fileName}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
