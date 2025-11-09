/**
 * Shared RFQ Constants
 *
 * Used by both customer RFQ creation page and mechanic RFQ escalation modal
 * Ensures consistency across the platform
 */

export const RFQ_ISSUE_CATEGORIES = [
  { value: 'engine', label: 'Engine' },
  { value: 'brakes', label: 'Brakes' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'suspension', label: 'Suspension' },
  { value: 'transmission', label: 'Transmission' },
  { value: 'other', label: 'Other' },
] as const

export const RFQ_URGENCY_LEVELS = [
  { value: 'low', label: 'Low', description: 'Can wait a few weeks' },
  { value: 'normal', label: 'Normal', description: 'Within 1-2 weeks' },
  { value: 'high', label: 'High', description: 'Within a few days' },
  { value: 'urgent', label: 'Urgent', description: 'Immediate attention needed' },
] as const

export const RFQ_BID_DEADLINE_OPTIONS = [
  { value: 24, label: '24 hours (1 day)' },
  { value: 48, label: '48 hours (2 days)' },
  { value: 72, label: '72 hours (3 days) - Recommended', recommended: true },
  { value: 96, label: '96 hours (4 days)' },
  { value: 120, label: '120 hours (5 days)' },
  { value: 168, label: '168 hours (1 week)' },
] as const

export const RFQ_VALIDATION_RULES = {
  title: {
    min: 10,
    max: 100,
    pattern: /^[a-zA-Z0-9\s\-,.']+$/,
  },
  description: {
    min: 50,
    max: 1000,
  },
  budget: {
    min: 0,
    max: 1000000,
  },
  bidDeadlineHours: {
    min: 24,
    max: 168,
  },
  sessionRecencyDays: 7, // Mechanics can only create RFQs for sessions within last 7 days
} as const

export const RFQ_ERROR_MESSAGES = {
  titleTooShort: `Title must be at least ${RFQ_VALIDATION_RULES.title.min} characters`,
  titleTooLong: `Title must be less than ${RFQ_VALIDATION_RULES.title.max} characters`,
  descriptionTooShort: `Description must be at least ${RFQ_VALIDATION_RULES.description.min} characters`,
  descriptionTooLong: `Description must be less than ${RFQ_VALIDATION_RULES.description.max} characters`,
  budgetInvalid: 'Budget amounts must be positive numbers',
  budgetMinGreaterThanMax: 'Minimum budget must be less than or equal to maximum budget',
  sessionTooOld: `RFQs can only be created for sessions completed within the last ${RFQ_VALIDATION_RULES.sessionRecencyDays} days`,
  sessionNotCompleted: 'RFQs can only be created for completed sessions',
  duplicateRfq: 'An RFQ has already been created for this session',
} as const

export type IssueCategory = typeof RFQ_ISSUE_CATEGORIES[number]['value']
export type UrgencyLevel = typeof RFQ_URGENCY_LEVELS[number]['value']
