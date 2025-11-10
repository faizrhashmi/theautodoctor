import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { PRICING, type PlanKey } from '@/config/pricing'
import type { SessionSummary, IdentifiedIssue } from '@/types/sessionSummary'

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
  type?: 'chat' | 'video' | 'diagnostic'
  summary_data?: {
    findings?: string
    steps_taken?: string
    parts_needed?: string
    next_steps?: string
    photos?: string[]
  } | null
  summary_submitted_at?: string | null
}

interface ChatMessage {
  id: string
  content: string
  sender_id: string
  created_at: string
  sender_name?: string
  sender_role?: 'customer' | 'mechanic'
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
  let autoSummary: SessionSummary | null = null
  let chatMessages: ChatMessage[] = []

  try {
    // Try fetching from both customer and mechanic endpoints
    // One will succeed based on user's role
    let response = await fetch(`/api/customer/sessions`)

    if (!response.ok) {
      // Try mechanic endpoint if customer endpoint fails
      response = await fetch(`/api/mechanic/sessions`)
    }

    if (!response.ok) throw new Error('Failed to fetch session data')

    const data = await response.json()
    sessionData = data.sessions?.find((s: any) => s.id === sessionId)

    if (!sessionData) {
      throw new Error('Session not found')
    }

    // Fetch auto-generated summary
    try {
      const summaryRes = await fetch(`/api/sessions/${sessionId}/summary`)
      if (summaryRes.ok) {
        const summaryData = await summaryRes.json()
        if (summaryData.auto_summary) {
          autoSummary = summaryData.auto_summary
        }
      }
    } catch (err) {
      console.error('[PDF Generator] Error fetching auto-summary:', err)
      // Continue without auto-summary
    }

    // Fetch chat messages (for chat and video sessions)
    if (sessionData.type === 'chat' || sessionData.type === 'video') {
      try {
        const messagesRes = await fetch(`/api/sessions/${sessionId}/messages`)
        if (messagesRes.ok) {
          const messagesData = await messagesRes.json()
          if (messagesData.messages && Array.isArray(messagesData.messages)) {
            chatMessages = messagesData.messages
          }
        } else {
          console.warn('[PDF Generator] Messages endpoint returned:', messagesRes.status)
        }
      } catch (err) {
        console.error('[PDF Generator] Error fetching chat messages:', err)
        // Continue without chat messages - this is not a fatal error
      }
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
  // HEADER - The Auto Doctor Branding
  // ============================================================================
  if (includeHeader) {
    let logoAdded = false

    try {
      // Try to add logo image (PNG format)
      const logoUrl = '/logo.png'
      const logoImg = await fetch(logoUrl)

      if (logoImg.ok) {
        const logoBlob = await logoImg.blob()
        const logoDataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onloadend = () => {
            if (reader.result) {
              resolve(reader.result as string)
            } else {
              reject(new Error('Failed to read logo'))
            }
          }
          reader.onerror = () => reject(new Error('FileReader error'))
          reader.readAsDataURL(logoBlob)
        })

        // Add logo (25mm width, auto height, positioned at top-left)
        doc.addImage(logoDataUrl, 'PNG', margin, yPos, 25, 8)
        yPos += 10
        logoAdded = true
      } else {
        console.warn('[PDF Generator] Logo fetch returned:', logoImg.status)
      }
    } catch (err) {
      console.error('[PDF Generator] Error loading logo:', err)
    }

    // Fallback to text if logo didn't load
    if (!logoAdded) {
      doc.setFontSize(20)
      doc.setTextColor(249, 115, 22) // Orange brand color (#f97316)
      doc.setFont('helvetica', 'bold')
      doc.text('The Auto Doctor', margin, yPos)
      yPos += 8
    }

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
  // AUTO-GENERATED SUMMARY (if available)
  // ============================================================================
  if (includeSummary && autoSummary) {
    // Check if we need a new page
    if (yPos > pageHeight - 60) {
      doc.addPage()
      yPos = margin
    }

    doc.setFontSize(14)
    doc.setTextColor(15, 23, 42)
    doc.setFont('helvetica', 'bold')
    doc.text('Session Findings', margin, yPos)
    yPos += 6

    doc.setFontSize(9)
    doc.setTextColor(100, 116, 139)
    doc.setFont('helvetica', 'italic')
    doc.text(`Generated: ${formatDateTime(autoSummary.created_at)}`, margin, yPos)
    yPos += 8

    // Customer Report
    if (autoSummary.customer_report) {
      doc.setFontSize(11)
      doc.setTextColor(15, 23, 42)
      doc.setFont('helvetica', 'bold')
      doc.text('Summary:', margin, yPos)
      yPos += 5

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      const reportLines = doc.splitTextToSize(autoSummary.customer_report, pageWidth - 2 * margin)
      doc.text(reportLines, margin, yPos)
      yPos += reportLines.length * 5 + 8
    }

    // Identified Issues
    if (autoSummary.identified_issues && autoSummary.identified_issues.length > 0) {
      // Check if we need a new page
      if (yPos > pageHeight - 40) {
        doc.addPage()
        yPos = margin
      }

      doc.setFontSize(11)
      doc.setTextColor(15, 23, 42)
      doc.setFont('helvetica', 'bold')
      doc.text(`Issues Identified (${autoSummary.identified_issues.length}):`, margin, yPos)
      yPos += 6

      // Create table data for issues
      const issuesTableData = autoSummary.identified_issues.map((issue: IdentifiedIssue) => {
        const severity = issue.severity.toUpperCase()
        const costRange = issue.est_cost_range || 'N/A'
        return [
          issue.issue,
          severity,
          costRange,
          issue.description || ''
        ]
      })

      autoTable(doc, {
        startY: yPos,
        head: [['Issue', 'Severity', 'Est. Cost', 'Description']],
        body: issuesTableData,
        theme: 'striped',
        styles: {
          fontSize: 9,
          cellPadding: 2,
          textColor: [15, 23, 42],
        },
        headStyles: {
          fillColor: [239, 68, 68], // Red for issues
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 25, fontStyle: 'bold' },
          2: { cellWidth: 30 },
          3: { cellWidth: 'auto' },
        },
        margin: { left: margin, right: margin },
      })

      yPos = (doc as any).lastAutoTable.finalY + 8
    }

    // Media Files Count
    if (autoSummary.media_file_ids && autoSummary.media_file_ids.length > 0) {
      if (yPos > pageHeight - 20) {
        doc.addPage()
        yPos = margin
      }

      doc.setFontSize(10)
      doc.setTextColor(100, 116, 139)
      doc.setFont('helvetica', 'italic')
      doc.text(`📷 ${autoSummary.media_file_ids.length} media file(s) attached to this session`, margin, yPos)
      yPos += 10
    }
  }

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
  // CHAT MESSAGES & VIDEO TRANSCRIPTION (for chat/video sessions)
  // ============================================================================
  if (includeSummary && chatMessages.length > 0) {
    // Check if we need a new page
    if (yPos > pageHeight - 60) {
      doc.addPage()
      yPos = margin
    }

    doc.setFontSize(14)
    doc.setTextColor(15, 23, 42)
    doc.setFont('helvetica', 'bold')
    const sectionTitle = sessionData.type === 'video'
      ? 'Session Transcript & Notes'
      : 'Chat Conversation'
    doc.text(sectionTitle, margin, yPos)
    yPos += 6

    doc.setFontSize(9)
    doc.setTextColor(100, 116, 139)
    doc.setFont('helvetica', 'italic')
    doc.text(`${chatMessages.length} message(s)`, margin, yPos)
    yPos += 8

    // Display messages in a table format
    const messageTableData = chatMessages.map((msg) => {
      const timestamp = new Date(msg.created_at).toLocaleTimeString('en-CA', {
        hour: '2-digit',
        minute: '2-digit'
      })
      const sender = msg.sender_role === 'mechanic'
        ? (sessionData.mechanic_name || 'Mechanic')
        : (sessionData.customer_name || 'Customer')

      // Truncate very long messages
      const content = msg.content.length > 200
        ? msg.content.substring(0, 200) + '...'
        : msg.content

      return [timestamp, sender, content]
    })

    autoTable(doc, {
      startY: yPos,
      head: [['Time', 'Sender', 'Message']],
      body: messageTableData,
      theme: 'striped',
      styles: {
        fontSize: 9,
        cellPadding: 3,
        textColor: [15, 23, 42],
      },
      headStyles: {
        fillColor: [59, 130, 246], // Blue color
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 35, fontStyle: 'bold' },
        2: { cellWidth: 'auto' },
      },
      margin: { left: margin, right: margin },
    })

    yPos = (doc as any).lastAutoTable.finalY + 10
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
      doc.text('The Auto Doctor - Remote Automotive Diagnostics', margin, footerY)

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
