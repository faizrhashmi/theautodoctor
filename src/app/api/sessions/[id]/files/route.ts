import { NextResponse } from 'next/server'
import type { SessionFile } from '@/types/session'

const MOCK_FILES: SessionFile[] = [
  {
    id: 'file-1',
    fileName: 'diagnostic-report.pdf',
    fileSize: 1024 * 250,
    uploadedAt: new Date().toISOString(),
    uploadedBy: 'Brandon Lee'
  }
]

export async function GET() {
  return NextResponse.json({ files: MOCK_FILES })
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const formData = await request.formData()
  const file = formData.get('file')
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 })
  }

  const uploaded: SessionFile = {
    id: crypto.randomUUID(),
    fileName: formData.get('filename')?.toString() ?? 'upload.bin',
    fileSize: file.size,
    uploadedAt: new Date().toISOString(),
    uploadedBy: formData.get('uploadedBy')?.toString() ?? 'Unknown'
  }

  return NextResponse.json({ sessionId: params.id, file: uploaded }, { status: 201 })
}
