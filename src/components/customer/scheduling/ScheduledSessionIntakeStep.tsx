'use client'

/**
 * ScheduledSessionIntakeStep - Step 6 of SchedulingWizard
 * Optimized intake form for scheduled appointments
 *
 * Key Differences from ConcernStep:
 * - Service type selection (diagnostic, repair, maintenance, inspection, consultation)
 * - Appointment-focused language
 * - Preparation notes field
 * - Special requests field
 * - NO "Is Urgent" checkbox (doesn't apply to scheduled)
 */

import { useState, useEffect } from 'react'
import { FileText, Upload, ClipboardList, MessageCircle, X, Check, Search, Wrench, Settings, ClipboardCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase'

interface ScheduledSessionIntakeStepProps {
  wizardData: any
  onComplete: (data: any) => void
  onBack: () => void
}

type UploadItem = {
  file: File
  path?: string
  progress: number
  status: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
}

const SERVICE_TYPES = [
  {
    value: 'diagnostic',
    label: 'Diagnostic Service',
    description: 'Identify and diagnose vehicle issues',
    icon: Search,
    placeholder: 'Describe the symptoms or issues you\'d like diagnosed...'
  },
  {
    value: 'repair',
    label: 'Repair Service',
    description: 'Fix a known issue or problem',
    icon: Wrench,
    placeholder: 'Describe what needs to be repaired...'
  },
  {
    value: 'maintenance',
    label: 'Maintenance Service',
    description: 'Routine maintenance (oil change, inspection, etc.)',
    icon: Settings,
    placeholder: 'What maintenance service do you need?'
  },
  {
    value: 'inspection',
    label: 'Pre-Purchase Inspection',
    description: 'Evaluate a vehicle before buying',
    icon: ClipboardCheck,
    placeholder: 'Tell us about the vehicle you\'re considering purchasing...'
  },
  {
    value: 'consultation',
    label: 'General Consultation',
    description: 'Get advice or ask questions',
    icon: MessageCircle,
    placeholder: 'What would you like to discuss with the mechanic?'
  }
]

export default function ScheduledSessionIntakeStep({
  wizardData,
  onComplete,
  onBack
}: ScheduledSessionIntakeStepProps) {
  const [serviceType, setServiceType] = useState<string>('')
  const [serviceDescription, setServiceDescription] = useState('')
  const [preparationNotes, setPreparationNotes] = useState('')
  const [specialRequests, setSpecialRequests] = useState('')
  const [uploads, setUploads] = useState<UploadItem[]>([])
  const [error, setError] = useState('')

  // Get placeholder based on selected service type
  const selectedService = SERVICE_TYPES.find(s => s.value === serviceType)
  const placeholder = selectedService?.placeholder || 'Describe what service you need...'

  // Form validation
  const isFormValid = serviceType && serviceDescription.trim().length >= 20

  // Update wizard data when form is valid
  useEffect(() => {
    if (isFormValid) {
      const intakeData = {
        serviceType,
        serviceDescription,
        preparationNotes: preparationNotes.trim() || null,
        specialRequests: specialRequests.trim() || null,
        uploadedFiles: uploads.filter(u => u.status === 'done').map(u => u.path)
      }
      console.log('[ScheduledSessionIntakeStep] Form data updated:', intakeData)
      onComplete(intakeData)
    }
  }, [serviceType, serviceDescription, preparationNotes, specialRequests, uploads, isFormValid, onComplete])

  // File upload handler
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const supabase = createClient()

    // Add files to uploads state
    const newUploads: UploadItem[] = Array.from(files).map(file => ({
      file,
      progress: 0,
      status: 'pending'
    }))

    setUploads(prev => [...prev, ...newUploads])

    // Upload each file
    for (let i = 0; i < newUploads.length; i++) {
      const upload = newUploads[i]
      const uploadIndex = uploads.length + i

      try {
        // Update status to uploading
        setUploads(prev => {
          const updated = [...prev]
          updated[uploadIndex] = { ...updated[uploadIndex], status: 'uploading', progress: 50 }
          return updated
        })

        // Generate unique filename
        const fileExt = upload.file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `intake-files/${fileName}`

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('session-files')
          .upload(filePath, upload.file)

        if (uploadError) throw uploadError

        // Update status to done
        setUploads(prev => {
          const updated = [...prev]
          updated[uploadIndex] = {
            ...updated[uploadIndex],
            status: 'done',
            progress: 100,
            path: filePath
          }
          return updated
        })
      } catch (err: any) {
        console.error('[Upload] Error:', err)
        setUploads(prev => {
          const updated = [...prev]
          updated[uploadIndex] = {
            ...updated[uploadIndex],
            status: 'error',
            error: err.message || 'Upload failed'
          }
          return updated
        })
      }
    }
  }

  const removeUpload = (index: number) => {
    setUploads(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
          Appointment Details
        </h2>
        <p className="text-sm sm:text-base text-slate-400">
          Tell us what service you need for your scheduled appointment
        </p>
      </div>

      {/* Service Type Selection */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-slate-300 mb-3">
          What type of service do you need? *
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SERVICE_TYPES.map((service) => {
            const Icon = service.icon
            const isSelected = serviceType === service.value

            return (
              <button
                key={service.value}
                type="button"
                onClick={() => setServiceType(service.value)}
                className={`
                  flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all
                  ${isSelected
                    ? 'border-orange-500 bg-orange-500/10'
                    : 'border-slate-700 bg-slate-900/50 hover:border-slate-600'
                  }
                `}
              >
                <div className={`
                  flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center
                  ${isSelected ? 'bg-orange-500/20' : 'bg-slate-800'}
                `}>
                  <Icon className={`h-5 w-5 ${isSelected ? 'text-orange-400' : 'text-slate-400'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`text-sm font-semibold ${isSelected ? 'text-orange-300' : 'text-white'}`}>
                    {service.label}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {service.description}
                  </p>
                </div>
                {isSelected && (
                  <Check className="flex-shrink-0 h-5 w-5 text-orange-400" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Service Description */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-300">
          Service Description *
        </label>
        <textarea
          value={serviceDescription}
          onChange={(e) => setServiceDescription(e.target.value)}
          placeholder={placeholder}
          rows={5}
          className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition resize-none"
        />
        <div className="flex items-center justify-between text-xs">
          <span className={serviceDescription.length >= 20 ? 'text-green-400' : 'text-slate-500'}>
            {serviceDescription.length} / 20 characters minimum
          </span>
        </div>
      </div>

      {/* Preparation Notes (Optional) */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-300">
          Preparation Notes (Optional)
        </label>
        <textarea
          value={preparationNotes}
          onChange={(e) => setPreparationNotes(e.target.value)}
          placeholder="Is there anything you'd like to prepare before the appointment? (e.g., 'I'll have vehicle codes ready', 'Bringing previous service records')"
          rows={2}
          className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition resize-none"
        />
      </div>

      {/* Special Requests (Optional) */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-300">
          Special Requests (Optional)
        </label>
        <textarea
          value={specialRequests}
          onChange={(e) => setSpecialRequests(e.target.value)}
          placeholder="Any special requests or considerations? (e.g., 'Please call when ready', 'Prefer email communication')"
          rows={2}
          className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition resize-none"
        />
      </div>

      {/* File Uploads */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-slate-300">
          Photos or Documents (Optional)
        </label>
        <p className="text-xs text-slate-500">
          Upload photos of the issue, vehicle codes, or any relevant documents
        </p>

        <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-700 rounded-lg cursor-pointer hover:border-orange-500 hover:bg-orange-500/5 transition group">
          <Upload className="h-5 w-5 text-slate-400 group-hover:text-orange-400 transition" />
          <span className="text-sm text-slate-400 group-hover:text-orange-400 transition">
            Click to upload files
          </span>
          <input
            type="file"
            multiple
            accept="image/*,video/*,.pdf,.doc,.docx"
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>

        {uploads.length > 0 && (
          <div className="space-y-2">
            {uploads.map((upload, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-slate-900/50 border border-slate-800 rounded-lg"
              >
                <FileText className="h-5 w-5 text-slate-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{upload.file.name}</p>
                  {upload.status === 'uploading' && (
                    <div className="mt-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-500 transition-all"
                        style={{ width: `${upload.progress}%` }}
                      />
                    </div>
                  )}
                  {upload.status === 'error' && (
                    <p className="text-xs text-red-400 mt-1">{upload.error}</p>
                  )}
                </div>
                {upload.status === 'done' && (
                  <Check className="h-5 w-5 text-green-400 flex-shrink-0" />
                )}
                <button
                  onClick={() => removeUpload(index)}
                  className="text-slate-400 hover:text-red-400 transition flex-shrink-0"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form Status Message */}
      {!isFormValid && (serviceType || serviceDescription.length > 0) && (
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-sm text-yellow-300">
            Please select a service type and provide at least 20 characters of description
          </p>
        </div>
      )}

      {isFormValid && (
        <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
          <p className="text-sm text-green-300 flex items-center gap-2">
            <Check className="h-4 w-4" />
            Form complete! Click Continue to proceed to payment.
          </p>
        </div>
      )}
    </div>
  )
}
