/**
 * Session Summary Types
 *
 * Unified findings/reports for chat and video sessions
 * Links to existing session_files and mechanic_notes
 */

export type IssueSeverity = 'low' | 'medium' | 'high' | 'urgent'

export interface IdentifiedIssue {
  issue: string
  severity: IssueSeverity
  est_cost_range?: string // e.g., "$200-$300"
  description?: string
}

export interface SessionSummary {
  session_id: string
  session_type: 'chat' | 'video'
  customer_report: string | null
  identified_issues: IdentifiedIssue[]
  media_file_ids: string[] // References to session_files.id
  created_at: string
  updated_at: string
}

export interface CreateSummaryPayload {
  session_id: string
  session_type: 'chat' | 'video'
  customer_report?: string
  identified_issues?: IdentifiedIssue[]
  media_file_ids?: string[]
}

export interface SessionSummaryWithMedia extends SessionSummary {
  media_files?: Array<{
    id: string
    file_name: string
    file_url: string | null
    file_type: string
  }>
}
