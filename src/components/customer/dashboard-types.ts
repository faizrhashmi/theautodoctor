export type CustomerDashboardFile = {
  id: string
  sessionId: string
  fileName: string
  fileSize: number
  fileType: string
  storagePath: string
  createdAt: string
  fileUrl: string | null
  uploadedBy: string
  uploadedByName: string | null
}

export type CustomerDashboardSession = {
  id: string
  plan: string
  planLabel: string
  type: string
  typeLabel: string
  status: string
  createdAt: string
  scheduledStart: string | null
  scheduledEnd: string | null
  startedAt: string | null
  endedAt: string | null
  mechanicId: string | null
  mechanicName: string | null
  files: CustomerDashboardFile[]
}

export type CustomerDashboardFileWithUrl = CustomerDashboardFile & {
  signedUrl: string | null
}
