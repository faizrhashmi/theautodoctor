'use client'

import type { ChangeEvent } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { SessionFile } from '@/types/supabase'
import type {
  CustomerDashboardFile,
  CustomerDashboardFileWithUrl,
} from './dashboard-types'
import { CUSTOMER_FILES_BUCKET, formatFileSize, generateSignedFileList } from './sessionFilesHelpers'

function normalizeFile(row: SessionFile): CustomerDashboardFile {
  return {
    id: row.id,
    sessionId: row.session_id,
    fileName: row.file_name,
    fileSize: row.file_size,
    fileType: row.file_type,
    storagePath: row.storage_path,
    createdAt: row.created_at,
    fileUrl: row.file_url,
    uploadedBy: row.uploaded_by,
    uploadedByName: null,
  }
}

type Props = {
  sessionId: string
  sessionLabel: string
  allowUpload?: boolean
  initialFiles?: CustomerDashboardFile[]
  currentUserId?: string
}

export function SessionFileManager({
  sessionId,
  sessionLabel,
  allowUpload = false,
  initialFiles = [],
  currentUserId,
}: Props) {
  const [files, setFiles] = useState<CustomerDashboardFileWithUrl[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const hydrate = useCallback(async (source: CustomerDashboardFile[]) => {
    setLoading(true)
    setError(null)
    try {
      const signed = await generateSignedFileList(source)
      setFiles(signed)
    } catch (err) {
      console.error('Failed to hydrate session files', err)
      setError('We could not load your files. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadFromServer = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('session_files')
        .select('id, created_at, session_id, file_name, file_size, file_type, storage_path, file_url, uploaded_by')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      const normalized = (data ?? []).map(normalizeFile)
      await hydrate(normalized)
    } catch (err) {
      console.error('Error loading session files', err)
      setError('Unable to load files right now. Please refresh.')
    }
  }, [hydrate, sessionId])

  useEffect(() => {
    hydrate(initialFiles)
  }, [hydrate, initialFiles])

  useEffect(() => {
    if (!success) return
    const timer = window.setTimeout(() => setSuccess(null), 4000)
    return () => window.clearTimeout(timer)
  }, [success])

  const handleUpload = useCallback(
    async (file: File) => {
      setUploading(true)
      setError(null)
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError) {
          throw userError
        }

        if (!user) {
          throw new Error('You must be signed in to upload files.')
        }

        const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, '')
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const storagePath = `${sessionId}/${timestamp}-${sanitizedName}`

        const { error: uploadError } = await supabase.storage
          .from(CUSTOMER_FILES_BUCKET)
          .upload(storagePath, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type || 'application/octet-stream',
          })

        if (uploadError) {
          throw uploadError
        }

        const { error: insertError } = await supabase
          .from('session_files')
          .insert({
            session_id: sessionId,
            uploaded_by: user.id,
            file_name: file.name,
            file_size: file.size,
            file_type: file.type || 'application/octet-stream',
            storage_path: storagePath,
          })

        if (insertError) {
          throw insertError
        }

        setSuccess('File uploaded successfully.')
        await loadFromServer()
      } catch (err: any) {
        console.error('Upload failed', err)
        const message =
          typeof err?.message === 'string'
            ? err.message
            : 'Failed to upload your file. Please try again.'
        setError(message)
      } finally {
        setUploading(false)
      }
    },
    [loadFromServer, sessionId]
  )

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(event.target.files ?? [])
      event.target.value = ''
      for (const file of selectedFiles) {
        // eslint-disable-next-line no-await-in-loop
        await handleUpload(file)
      }
    },
    [handleUpload]
  )

  const refresh = useCallback(async () => {
    await loadFromServer()
  }, [loadFromServer])

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">{sessionLabel}</h4>
          <p className="text-xs text-slate-500">Upload service records, photos, or scan reports for your mechanic.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refresh}
            className="inline-flex items-center justify-center rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:text-orange-600"
          >
            Refresh
          </button>
          {allowUpload && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center justify-center rounded-full bg-orange-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {uploading ? 'Uploading…' : 'Upload files'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
      )}
      {success && (
        <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">{success}</div>
      )}

      <div className="mt-4">
        {loading ? (
          <p className="text-xs text-slate-500">Loading files…</p>
        ) : files.length === 0 ? (
          <p className="text-xs text-slate-500">No files uploaded yet.</p>
        ) : (
          <ul className="space-y-3">
            {files.map((file) => (
              <li
                key={file.id}
                className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">{file.fileName}</p>
                  <p className="text-xs text-slate-500">
                    Uploaded {new Date(file.createdAt).toLocaleString()} · {formatFileSize(file.fileSize)}
                    {file.uploadedBy === currentUserId
                      ? ' · You'
                      : file.uploadedByName
                      ? ` · ${file.uploadedByName}`
                      : ' · Team upload'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {file.signedUrl ? (
                    <a
                      href={file.signedUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:text-orange-600"
                    >
                      View
                    </a>
                  ) : (
                    <span className="text-xs text-red-500">Link unavailable</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,application/pdf"
        onChange={handleFileChange}
        className="hidden"
        disabled={uploading}
      />
    </div>
  )
}
