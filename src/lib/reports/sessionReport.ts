import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { PRICING, type PlanKey } from '@/config/pricing'

interface SessionReportData {
  id: string
  customer_user_id: string | null
  mechanic_id: string | null
  customer_name?: string
  mechanic_name?: string
  started_at: string | null
  ended_at: string | null
  duration_minutes: number | null
  plan: string
  base_price?: number
  rating: number | null
  summary_data?: {
    findings?: string
    steps_taken?: string
    parts_needed?: string
    next_steps?: string
    photos?: string[]
  } | null
  summary_submitted_at?: string | null
}

interface PDFOptions {
  includeHeader?: boolean
  includeSummary?: boolean
  includeFooter?: boolean
}

/**
 * Builds a session report PDF from session data
 * Returns a Blob that can be downloaded client-side
 */
export async function buildSessionPdf(
  sessionId: string,
  options: PDFOptions = {}
): Promise<Blob> {
  const {
    includeHeader = true,
    includeSummary = true,
    includeFooter = true,
  } = options

  // Fetch session data
  let sessionData: SessionReportData | null = null
  try {
    const response = await fetch(`/api/customer/sessions`)
    if (!response.ok) throw new Error('Failed to fetch session data')

    const data = await response.json()
    sessionData = data.sessions?.find((s: any) => s.id === sessionId)

    if (!sessionData) {
      throw new Error('Session not found')
    }
  } catch (error) {
    console.error('[PDF Generator] Error fetching session:', error)
    throw new Error('Unable to generate report - session data not available')
  }

  // Create PDF document (A4, portrait)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15
  let yPos = margin

  // Helper: Format date/time (en-CA)
  const formatDateTime = (dateString: string | null): string => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-CA', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date)
  }

  // Helper: Format date only (en-CA)
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-CA', {
      dateStyle: 'long',
    }).format(date)
  }

  // Calculate duration
  const duration = sessionData.duration_minutes ||
    (sessionData.started_at && sessionData.ended_at
      ? Math.round((new Date(sessionData.ended_at).getTime() -
          new Date(sessionData.started_at).getTime()) / 60000)
      : 0)

  // Get pricing info
  const planKey = sessionData.plan as PlanKey
  const pricingInfo = PRICING[planKey] || null
  const displayPrice = sessionData.base_price
    ? (sessionData.base_price / 100).toFixed(2)
    : pricingInfo
      ? (pricingInfo.priceCents / 100).toFixed(2)
      : '0.00'
  const planName = pricingInfo?.name || sessionData.plan

  // ============================================================================
  // HEADER - TheAutoDoctor Branding
  // ============================================================================
  if (includeHeader) {
    // Company name
    doc.setFontSize(24)
    doc.setTextColor(220, 38, 38) // Orange/Red brand color
    doc.setFont('helvetica', 'bold')
    doc.text('TheAutoDoctor', margin, yPos)
    yPos += 8

    // Tagline
    doc.setFontSize(10)
    doc.setTextColor(100, 116, 139) // Slate gray
    doc.setFont('helvetica', 'normal')
    doc.text('Professional Remote Automotive Diagnostics', margin, yPos)
    yPos += 10

    // Horizontal line
    doc.setDrawColor(203, 213, 225) // Slate-300
    doc.setLineWidth(0.5)
    doc.line(margin, yPos, pageWidth - margin, yPos)
    yPos += 8
  }

  // ============================================================================
  // TITLE - Session Report
  // ============================================================================
  doc.setFontSize(18)
  doc.setTextColor(15, 23, 42) // Slate-900
  doc.setFont('helvetica', 'bold')
  doc.text('Session Report', margin, yPos)
  yPos += 10

  // Report date
  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  doc.setFont('helvetica', 'normal')
  doc.text(`Generated: ${formatDateTime(new Date().toISOString())}`, margin, yPos)
  yPos += 8

  // ============================================================================
  // SESSION DETAILS TABLE
  // ============================================================================
  doc.setFontSize(14)
  doc.setTextColor(15, 23, 42)
  doc.setFont('helvetica', 'bold')
  doc.text('Session Details', margin, yPos)
  yPos += 6

  const sessionDetailsData = [
    ['Session ID', sessionData.id.slice(0, 16) + '...'],
    ['Plan Type', planName],
    ['Started', formatDateTime(sessionData.started_at)],
    ['Ended', formatDateTime(sessionData.ended_at)],
    ['Duration', `${duration} minutes`],
    ['Total Cost', `$${displayPrice} CAD`],
  ]

  if (sessionData.rating) {
    sessionDetailsData.push(['Customer Rating', `${'⭐'.repeat(sessionData.rating)} (${sessionData.rating}/5)`])
  }

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: sessionDetailsData,
    theme: 'grid',
    styles: {
      fontSize: 10,
      cellPadding: 3,
      textColor: [15, 23, 42],
    },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [241, 245, 249], cellWidth: 50 },
      1: { cellWidth: 'auto' },
    },
    margin: { left: margin, right: margin },
  })

  yPos = (doc as any).lastAutoTable.finalY + 10

  // ============================================================================
  // PARTICIPANTS TABLE
  // ============================================================================
  doc.setFontSize(14)
  doc.setTextColor(15, 23, 42)
  doc.setFont('helvetica', 'bold')
  doc.text('Participants', margin, yPos)
  yPos += 6

  const participantsData = [
    [
      'Mechanic',
      sessionData.mechanic_name || 'N/A',
      `ID: ${sessionData.mechanic_id?.slice(0, 8) || 'N/A'}`,
    ],
    [
      'Customer',
      sessionData.customer_name || 'Customer',
      `ID: ${sessionData.customer_user_id?.slice(0, 8) || 'N/A'}`,
    ],
  ]

  autoTable(doc, {
    startY: yPos,
    head: [['Role', 'Name', 'Identifier']],
    body: participantsData,
    theme: 'striped',
    styles: {
      fontSize: 10,
      cellPadding: 3,
      textColor: [15, 23, 42],
    },
    headStyles: {
      fillColor: [99, 102, 241], // Indigo
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    margin: { left: margin, right: margin },
  })

  yPos = (doc as any).lastAutoTable.finalY + 10

  // ============================================================================
  // MECHANIC SUMMARY (if available)
  // ============================================================================
  if (includeSummary && sessionData.summary_data && sessionData.summary_submitted_at) {
    // Check if we need a new page
    if (yPos > pageHeight - 60) {
      doc.addPage()
      yPos = margin
    }

    doc.setFontSize(14)
    doc.setTextColor(15, 23, 42)
    doc.setFont('helvetica', 'bold')
    doc.text('Mechanic Summary', margin, yPos)
    yPos += 6

    doc.setFontSize(9)
    doc.setTextColor(100, 116, 139)
    doc.setFont('helvetica', 'italic')
    doc.text(`Submitted: ${formatDateTime(sessionData.summary_submitted_at)}`, margin, yPos)
    yPos += 8

    const summary = sessionData.summary_data

    // Findings
    if (summary.findings) {
      doc.setFontSize(11)
      doc.setTextColor(15, 23, 42)
      doc.setFont('helvetica', 'bold')
      doc.text('Findings:', margin, yPos)
      yPos += 5

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      const findingsLines = doc.splitTextToSize(summary.findings, pageWidth - 2 * margin)
      doc.text(findingsLines, margin, yPos)
      yPos += findingsLines.length * 5 + 5
    }

    // Steps Taken
    if (summary.steps_taken) {
      if (yPos > pageHeight - 40) {
        doc.addPage()
        yPos = margin
      }

      doc.setFontSize(11)
      doc.setTextColor(15, 23, 42)
      doc.setFont('helvetica', 'bold')
      doc.text('Steps Taken:', margin, yPos)
      yPos += 5

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      const stepsLines = doc.splitTextToSize(summary.steps_taken, pageWidth - 2 * margin)
      doc.text(stepsLines, margin, yPos)
      yPos += stepsLines.length * 5 + 5
    }

    // Parts Needed
    if (summary.parts_needed) {
      if (yPos > pageHeight - 40) {
        doc.addPage()
        yPos = margin
      }

      doc.setFontSize(11)
      doc.setTextColor(15, 23, 42)
      doc.setFont('helvetica', 'bold')
      doc.text('Parts Needed:', margin, yPos)
      yPos += 5

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      const partsLines = doc.splitTextToSize(summary.parts_needed, pageWidth - 2 * margin)
      doc.text(partsLines, margin, yPos)
      yPos += partsLines.length * 5 + 5
    }

    // Next Steps
    if (summary.next_steps) {
      if (yPos > pageHeight - 40) {
        doc.addPage()
        yPos = margin
      }

      doc.setFontSize(11)
      doc.setTextColor(15, 23, 42)
      doc.setFont('helvetica', 'bold')
      doc.text('Recommended Next Steps:', margin, yPos)
      yPos += 5

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      const nextStepsLines = doc.splitTextToSize(summary.next_steps, pageWidth - 2 * margin)
      doc.text(nextStepsLines, margin, yPos)
      yPos += nextStepsLines.length * 5 + 5
    }

    // Photos count
    if (summary.photos && summary.photos.length > 0) {
      if (yPos > pageHeight - 20) {
        doc.addPage()
        yPos = margin
      }

      doc.setFontSize(10)
      doc.setTextColor(100, 116, 139)
      doc.setFont('helvetica', 'italic')
      doc.text(`📷 ${summary.photos.length} photo(s) attached to this session`, margin, yPos)
      yPos += 6
    }
  }

  // ============================================================================
  // FOOTER
  // ============================================================================
  if (includeFooter) {
    const footerY = pageHeight - 20

    // Add footer to all pages
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)

      // Footer line
      doc.setDrawColor(203, 213, 225)
      doc.setLineWidth(0.3)
      doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5)

      // Footer text
      doc.setFontSize(8)
      doc.setTextColor(100, 116, 139)
      doc.setFont('helvetica', 'normal')
      doc.text('TheAutoDoctor - Remote Automotive Diagnostics', margin, footerY)

      // Page number
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 20, footerY)

      // Confidential notice
      doc.setFontSize(7)
      doc.setTextColor(148, 163, 184)
      doc.text(
        'This report is confidential and intended solely for the customer.',
        margin,
        footerY + 4
      )
    }
  }

  // Return PDF as Blob
  const pdfBlob = doc.output('blob')
  return pdfBlob
}

/**
 * Downloads a session PDF report to the user's device
 */
export async function downloadSessionPdf(sessionId: string): Promise<void> {
  try {
    const pdfBlob = await buildSessionPdf(sessionId)

    // Create download link
    const url = URL.createObjectURL(pdfBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `TheAutoDoctor-Session-${sessionId.slice(0, 8)}.pdf`

    // Trigger download
    document.body.appendChild(link)
    link.click()

    // Cleanup
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('[PDF Download] Error:', error)
    throw error
  }
}
