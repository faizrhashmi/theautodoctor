'use client'

import { useCallback, useMemo, useState } from 'react'
import { CloudUpload, File, Trash2 } from 'lucide-react'
import type { SessionFile } from '@/types/session'

interface FileSharePanelProps {
  initialFiles?: SessionFile[]
  onUpload?: (files: FileList | null) => void
  onRemove?: (fileId: string) => void
}

export default function FileSharePanel({ initialFiles = [], onUpload, onRemove }: FileSharePanelProps) {
  const [files, setFiles] = useState<SessionFile[]>(initialFiles)

  const handleFiles = useCallback(
    (incoming: FileList | null) => {
      if (!incoming) return
      const mapped: SessionFile[] = Array.from(incoming).map((file) => ({
        id: `${file.name}-${file.size}-${Date.now()}`,
        fileName: file.name,
        fileSize: file.size,
        uploadedAt: new Date().toISOString(),
        uploadedBy: 'You'
      }))
      setFiles((prev) => [...mapped, ...prev])
      onUpload?.(incoming)
    },
    [onUpload]
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
      setFiles((prev) => prev.filter((file) => file.id !== fileId))
      onRemove?.(fileId)
    },
    [onRemove]
  )

  const formattedFiles = useMemo(
    () =>
      files.map((file) => ({
        ...file,
        formattedSize: new Intl.NumberFormat(undefined, {
          style: 'unit',
          unit: 'kilobyte',
          unitDisplay: 'narrow'
        }).format(Math.max(Math.round(file.fileSize / 1024), 1))
      })),
    [files]
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
          event.dataTransfer.dropEffect = 'copy'
        }}
        onDrop={handleDrop}
        className="flex flex-col gap-4 px-4 py-6"
      >
        <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center transition hover:border-blue-400 hover:bg-blue-50">
          <CloudUpload className="h-8 w-8 text-blue-500" />
          <div>
            <p className="text-sm font-semibold text-slate-900">Drag & drop files or click to upload</p>
            <p className="text-xs text-slate-500">PDF, PNG, JPG up to 25 MB each</p>
          </div>
          <input type="file" multiple onChange={handleChange} className="hidden" />
        </label>

        <ul className="space-y-3">
          {formattedFiles.length === 0 && (
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
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <File className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold text-slate-900">{file.fileName}</p>
                  <p className="text-xs text-slate-500">
                    Uploaded {new Date(file.uploadedAt).toLocaleTimeString()} • {file.formattedSize}
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
