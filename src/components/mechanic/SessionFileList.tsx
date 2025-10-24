'use client'

import { useEffect, useState } from 'react'
import type {
  CustomerDashboardFile,
  CustomerDashboardFileWithUrl,
} from '../customer/dashboard-types'
import { formatFileSize, generateSignedFileList } from './sessionFilesHelpers'

type Props = {
  files: CustomerDashboardFile[]
  compact?: boolean
  currentUserId?: string
}

export function SessionFileList({ files, compact = false, currentUserId }: Props) {
  const [items, setItems] = useState<CustomerDashboardFileWithUrl[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    if (!files || files.length === 0) {
      setItems([])
      return () => {
        active = false
      }
    }

    setLoading(true)
    setError(null)

    generateSignedFileList(files)
      .then((signed) => {
        if (!active) return
        setItems(signed)
      })
      .catch((err) => {
        console.error('Unable to generate signed URLs for history list', err)
        if (active) {
          setError('We could not prepare your downloads. Try again later.')
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [files])

  if (!files || files.length === 0) {
    return <p className="text-xs text-slate-500">No attachments for this session.</p>
  }

  if (loading) {
    return <p className="text-xs text-slate-500">Preparing downloads…</p>
  }

  if (error) {
    return <p className="text-xs text-red-500">{error}</p>
  }

  if (compact) {
    return (
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((file) => (
          <a
            key={file.id}
            href={file.signedUrl ?? undefined}
            target={file.signedUrl ? '_blank' : undefined}
            rel={file.signedUrl ? 'noreferrer' : undefined}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition ${
              file.signedUrl
                ? 'border-slate-200 text-slate-600 hover:border-blue-200 hover:text-orange-600'
                : 'border-slate-100 text-slate-400'
            }`}
          >
            <span className="truncate">{file.fileName}</span>
            <span className="text-slate-400">
              ({formatFileSize(file.fileSize)}
              {file.uploadedBy === currentUserId
                ? ' · You'
                : file.uploadedByName
                ? ` · ${file.uploadedByName}`
                : ''})
            </span>
          </a>
        ))}
      </div>
    )
  }

  return (
    <ul className="mt-3 space-y-2">
      {items.map((file) => (
        <li key={file.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
          <div>
            <p className="text-sm font-semibold text-slate-900">{file.fileName}</p>
            <p className="text-xs text-slate-500">
              Uploaded {new Date(file.createdAt).toLocaleString()}
              {file.uploadedBy === currentUserId
                ? ' · You'
                : file.uploadedByName
                ? ` · ${file.uploadedByName}`
                : ''}
            </p>
          </div>
          <a
            href={file.signedUrl ?? undefined}
            target={file.signedUrl ? '_blank' : undefined}
            rel={file.signedUrl ? 'noreferrer' : undefined}
            className={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-semibold transition ${
              file.signedUrl
                ? 'border-slate-200 text-slate-600 hover:border-blue-200 hover:text-orange-600'
                : 'border-slate-100 text-slate-400'
            }`}
          >
            {file.signedUrl ? 'Download' : 'Unavailable'}
          </a>
        </li>
      ))}
    </ul>
  )
}
