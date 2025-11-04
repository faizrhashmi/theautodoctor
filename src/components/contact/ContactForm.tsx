'use client'

import { useId, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { AlertCircle, CheckCircle2, Loader2, Paperclip } from 'lucide-react'

const REASONS = [
  { value: 'general', label: 'General inquiry' },
  { value: 'technical', label: 'Technical support' },
  { value: 'billing', label: 'Billing question' },
  { value: 'feedback', label: 'Product feedback' },
  { value: 'partnership', label: 'Partnership opportunity' }
]

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB
const ACCEPTED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'application/pdf'])
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type SubmissionState = 'idle' | 'submitting' | 'success' | 'error'

type FieldErrors = Partial<Record<'name' | 'email' | 'reason' | 'subject' | 'message' | 'attachment', string>>

type ApiError = {
  error?: string
  fieldErrors?: FieldErrors
}

type ApiSuccess = {
  message?: string
}

export default function ContactForm() {
  const formId = useId()
  const [status, setStatus] = useState<SubmissionState>('idle')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [feedback, setFeedback] = useState<string | null>(null)
  const [attachmentLabel, setAttachmentLabel] = useState<string>('Choose a file')

  const resetMessages = () => {
    setFeedback(null)
    setFieldErrors({})
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      setAttachmentLabel('Choose a file')
      setFieldErrors((prev) => ({ ...prev, attachment: undefined }))
      return
    }

    if (!ACCEPTED_MIME_TYPES.has(file.type)) {
      setFieldErrors((prev) => ({ ...prev, attachment: 'Please upload a PNG, JPG or PDF file.' }))
      setAttachmentLabel(file.name)
      return
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFieldErrors((prev) => ({ ...prev, attachment: 'File is larger than 10 MB.' }))
      setAttachmentLabel(file.name)
      return
    }

    setAttachmentLabel(file.name)
    setFieldErrors((prev) => ({ ...prev, attachment: undefined }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    resetMessages()

    const form = event.currentTarget
    const formData = new FormData(form)

    const payload = {
      name: String(formData.get('name') ?? '').trim(),
      email: String(formData.get('email') ?? '').trim(),
      reason: String(formData.get('reason') ?? '').trim(),
      subject: String(formData.get('subject') ?? '').trim(),
      message: String(formData.get('message') ?? '').trim(),
    }

    const validation: FieldErrors = {}

    if (!payload.name) {
      validation.name = 'Please provide your name.'
    }

    if (!payload.email || !emailPattern.test(payload.email)) {
      validation.email = 'Please provide a valid email address.'
    }

    if (!payload.reason) {
      validation.reason = 'Select the reason for contacting us.'
    }

    if (!payload.subject) {
      validation.subject = 'Let us know the subject of your message.'
    }

    if (!payload.message || payload.message.length < 20) {
      validation.message = 'Add a few more details so our team can help quickly (20 characters minimum).'
    }

    const attachment = formData.get('attachment')
    if (attachment instanceof File && attachment.size > 0) {
      if (!ACCEPTED_MIME_TYPES.has(attachment.type)) {
        validation.attachment = 'Please upload a PNG, JPG or PDF file.'
      } else if (attachment.size > MAX_FILE_SIZE_BYTES) {
        validation.attachment = 'File is larger than 10 MB.'
      }
    }

    if (Object.keys(validation).length > 0) {
      setFieldErrors(validation)
      setFeedback('Please correct the highlighted fields.')
      setStatus('error')
      return
    }

    try {
      setStatus('submitting')
      const response = await fetch('/api/contact', {
        method: 'POST',
        body: formData,
      })

      const data = (await response.json()) as ApiError | ApiSuccess

      if (!response.ok) {
        const apiError = data as ApiError
        setFieldErrors((prev) => ({ ...prev, ...apiError.fieldErrors }))
        setFeedback(apiError.error ?? 'We could not send your message. Please try again later.')
        setStatus('error')
        return
      }

      form.reset()
      setAttachmentLabel('Choose a file')
      setFeedback((data as ApiSuccess).message ?? 'Thank you for contacting us. We will get back to you shortly.')
      setStatus('success')
    } catch (error) {
      console.error('Failed to submit contact request', error)
      setFeedback('Something went wrong while sending your message. Please try again.')
      setStatus('error')
    }
  }

  const isSubmitting = status === 'submitting'
  const isSuccess = status === 'success'

  return (
    <form
      id={`contact-form-${formId}`}
      onSubmit={handleSubmit}
      className="space-y-6"
      encType="multipart/form-data"
      noValidate
    >
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium text-slate-200">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            className={`w-full rounded-lg border px-3 py-2 text-sm bg-slate-900/50 text-white placeholder:text-slate-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 ${
              fieldErrors.name ? 'border-red-500' : 'border-slate-600'
            }`}
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={fieldErrors.name ? 'contact-error-name' : undefined}
          />
          {fieldErrors.name && (
            <p id="contact-error-name" className="text-xs text-red-400">
              {fieldErrors.name}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-slate-200">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            className={`w-full rounded-lg border px-3 py-2 text-sm bg-slate-900/50 text-white placeholder:text-slate-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 ${
              fieldErrors.email ? 'border-red-500' : 'border-slate-600'
            }`}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? 'contact-error-email' : undefined}
          />
          {fieldErrors.email && (
            <p id="contact-error-email" className="text-xs text-red-400">
              {fieldErrors.email}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="reason" className="text-sm font-medium text-slate-200">
            Reason
          </label>
          <select
            id="reason"
            name="reason"
            defaultValue=""
            className={`w-full rounded-lg border px-3 py-2 text-sm bg-slate-900/50 text-white focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 ${
              fieldErrors.reason ? 'border-red-500' : 'border-slate-600'
            }`}
            aria-invalid={Boolean(fieldErrors.reason)}
            aria-describedby={fieldErrors.reason ? 'contact-error-reason' : undefined}
          >
            <option value="" disabled className="text-slate-400">
              Select an option
            </option>
            {REASONS.map((reason) => (
              <option key={reason.value} value={reason.value} className="bg-slate-900 text-white">
                {reason.label}
              </option>
            ))}
          </select>
          {fieldErrors.reason && (
            <p id="contact-error-reason" className="text-xs text-red-400">
              {fieldErrors.reason}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="subject" className="text-sm font-medium text-slate-200">
            Subject
          </label>
          <input
            id="subject"
            name="subject"
            type="text"
            className={`w-full rounded-lg border px-3 py-2 text-sm bg-slate-900/50 text-white placeholder:text-slate-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 ${
              fieldErrors.subject ? 'border-red-500' : 'border-slate-600'
            }`}
            aria-invalid={Boolean(fieldErrors.subject)}
            aria-describedby={fieldErrors.subject ? 'contact-error-subject' : undefined}
          />
          {fieldErrors.subject && (
            <p id="contact-error-subject" className="text-xs text-red-400">
              {fieldErrors.subject}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="message" className="text-sm font-medium text-slate-200">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          rows={6}
          className={`w-full rounded-lg border px-3 py-2 text-sm bg-slate-900/50 text-white placeholder:text-slate-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 ${
            fieldErrors.message ? 'border-red-500' : 'border-slate-600'
          }`}
          aria-invalid={Boolean(fieldErrors.message)}
          aria-describedby={fieldErrors.message ? 'contact-error-message' : undefined}
        />
        {fieldErrors.message && (
          <p id="contact-error-message" className="text-xs text-red-400">
            {fieldErrors.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <span className="text-sm font-medium text-slate-200">Attachments (optional)</span>
        <label
          htmlFor="attachment"
          className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm transition focus-within:ring-2 focus-within:ring-orange-500/20 ${
            fieldErrors.attachment ? 'border-red-500 bg-red-500/10 text-red-400' : 'border-slate-600 bg-slate-900/30 text-slate-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <Paperclip className="h-4 w-4" />
            <span>{attachmentLabel}</span>
          </div>
          <input
            id="attachment"
            name="attachment"
            type="file"
            accept=".png,.jpg,.jpeg,.pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          <span className="text-xs text-slate-500">PNG, JPG or PDF · 10 MB max</span>
        </label>
        {fieldErrors.attachment && (
          <p className="text-xs text-red-400">{fieldErrors.attachment}</p>
        )}
      </div>

      {feedback && (
        <div
          className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
            isSuccess
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
              : 'border-red-500/30 bg-red-500/10 text-red-400'
          }`}
          role={isSuccess ? 'status' : 'alert'}
        >
          {isSuccess ? <CheckCircle2 className="mt-0.5 h-5 w-5" /> : <AlertCircle className="mt-0.5 h-5 w-5" />}
          <p>{feedback}</p>
        </div>
      )}

      <button
        type="submit"
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-orange-600 hover:to-orange-700 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={isSubmitting}
      >
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {isSubmitting ? 'Sending' : 'Submit request'}
      </button>
    </form>
  )
}
