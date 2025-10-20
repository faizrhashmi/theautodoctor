'use client'

import { supabase } from '@/lib/supabase'
import type { CustomerDashboardFile, CustomerDashboardFileWithUrl } from './dashboard-types'

export const CUSTOMER_FILES_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_USER_FILES_BUCKET || 'user-files'

export async function generateSignedFileList(
  files: CustomerDashboardFile[]
): Promise<CustomerDashboardFileWithUrl[]> {
  if (!files || files.length === 0) {
    return []
  }

  const enriched = await Promise.all(
    files.map(async (file) => {
      try {
        const { data, error } = await supabase.storage
          .from(CUSTOMER_FILES_BUCKET)
          .createSignedUrl(file.storagePath, 60 * 60)

        if (error) {
          console.error('Error generating signed URL for session file', error)
          return { ...file, signedUrl: file.fileUrl ?? null }
        }

        return { ...file, signedUrl: data?.signedUrl ?? file.fileUrl ?? null }
      } catch (error) {
        console.error('Unexpected error while creating signed URL', error)
        return { ...file, signedUrl: file.fileUrl ?? null }
      }
    })
  )

  return enriched
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 KB'
  }

  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }

  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}
