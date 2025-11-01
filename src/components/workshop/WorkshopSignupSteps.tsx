'use client'

import { motion } from 'framer-motion'
import {
  User,
  Mail,
  Phone,
  Lock,
  Building2,
  FileText,
  MapPin,
  X,
  Info,
  CheckCircle2,
} from 'lucide-react'
import { Dispatch, SetStateAction } from 'react'

// TypeScript interfaces for Workshop Signup Steps
interface WorkshopSignupData {
  workshopName: string
  contactName: string
  email: string
  phone: string
  password: string
  confirmPassword: string
  businessRegistrationNumber: string
  taxId: string
  website: string
  industry: string
  address: string
  city: string
  province: string
  postalCode: string
  coveragePostalCodes: string[]
  serviceRadiusKm: number
  mechanicCapacity: number
  commissionRate: number
  termsAccepted: boolean
}

interface StepProps {
  formData: WorkshopSignupData
  updateForm: (updates: Partial<WorkshopSignupData>) => void
  errors: Record<string, string>
}

interface Step3Props extends StepProps {
  postalCodeInput: string
  setPostalCodeInput: (value: string) => void
  addPostalCode: () => void
  removePostalCode: (code: string) => void
  provinces: string[]
}

interface Step4Props extends StepProps {
  setCurrentStep: Dispatch<SetStateAction<number>>
}

// Step 1: Basic Information
export function Step1Basic({ formData, updateForm, errors }: StepProps) {
  return (
    <motion.div
      key="step1"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-2xl font-bold text-white">Workshop Information</h2>
        <p className="mt-1 text-sm text-slate-300">Tell us about your auto repair shop</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          label="Workshop Name"
          value={formData.workshopName}
          onChange={(v) => updateForm({ workshopName: v })}
          icon={Building2}
          placeholder="ABC Auto Repair"
          error={errors.workshopName}
          required
        />
        <TextField
          label="Contact Person"
          value={formData.contactName}
          onChange={(v) => updateForm({ contactName: v })}
          icon={User}
          placeholder="John Smith"
          error={errors.contactName}
          required
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          label="Email"
          type="email"
          value={formData.email}
          onChange={(v) => updateForm({ email: v })}
          icon={Mail}
          placeholder="john@abcautorepair.com"
          error={errors.email}
          required
        />
        <TextField
          label="Phone"
          value={formData.phone}
          onChange={(v) => updateForm({ phone: v })}
          icon={Phone}
          placeholder="+1 (555) 123-4567"
          error={errors.phone}
          required
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          label="Password"
          type="password"
          value={formData.password}
          onChange={(v) => updateForm({ password: v })}
          icon={Lock}
          placeholder="Min. 8 characters"
          error={errors.password}
          required
        />
        <TextField
          label="Confirm Password"
          type="password"
          value={formData.confirmPassword}
          onChange={(v) => updateForm({ confirmPassword: v })}
          icon={Lock}
          placeholder="Re-enter password"
          error={errors.confirmPassword}
          required
        />
      </div>

      <div className="rounded-xl border border-blue-400/30 bg-blue-500/10 p-4">
        <div className="flex gap-3">
          <Info className="h-5 w-5 flex-shrink-0 text-blue-400" />
          <div className="text-sm text-blue-200">
            <p className="font-semibold">What you'll get:</p>
            <ul className="mt-2 space-y-1 text-xs">
              <li>• Access to certified mechanics in your area</li>
              <li>• Workshop admin dashboard to manage your team</li>
              <li>• Invite and manage your own mechanics</li>
              <li>• Earn 10% commission on all sessions</li>
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// Step 2: Business Details
export function Step2Business({ formData, updateForm, errors }: StepProps) {
  const INDUSTRIES = [
    'Independent Auto Repair Shop',
    'Dealership Service Center',
    'Franchise Service Center (e.g., Midas, Jiffy Lube)',
    'Specialty Shop (e.g., Brakes, Transmission)',
    'Mobile Mechanic Network',
    'Fleet Maintenance',
    'Other',
  ]

  return (
    <motion.div
      key="step2"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-2xl font-bold text-white">Business Details</h2>
        <p className="mt-1 text-sm text-slate-300">We need this information for verification and payments</p>
      </div>

      <TextField
        label="Business Registration Number"
        value={formData.businessRegistrationNumber}
        onChange={(v) => updateForm({ businessRegistrationNumber: v })}
        icon={FileText}
        placeholder="123456789RC0001"
        error={errors.businessRegistrationNumber}
        required
        helpText="Your provincial or federal business registration number"
      />

      <TextField
        label="GST/HST Number"
        value={formData.taxId}
        onChange={(v) => updateForm({ taxId: v })}
        icon={FileText}
        placeholder="123456789RT0001"
        error={errors.taxId}
        required
        helpText="Your tax identification number for invoicing"
      />

      <SelectField
        label="Industry"
        value={formData.industry}
        onChange={(v) => updateForm({ industry: v })}
        options={INDUSTRIES}
        error={errors.industry}
        required
      />

      <TextField
        label="Website (Optional)"
        value={formData.website}
        onChange={(v) => updateForm({ website: v })}
        placeholder="https://www.abcautorepair.com"
      />

      <div className="rounded-xl border border-orange-400/30 bg-orange-500/10 p-4">
        <div className="flex gap-3">
          <Info className="h-5 w-5 flex-shrink-0 text-orange-400" />
          <div className="text-sm text-orange-200">
            <p className="font-semibold">Payment Setup</p>
            <p className="mt-1 text-xs">
              After approval, you'll complete Stripe Connect onboarding to receive payouts. Your commission will be paid out weekly.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// Step 3: Coverage Area
export function Step3Coverage({
  formData,
  updateForm,
  errors,
  postalCodeInput,
  setPostalCodeInput,
  addPostalCode,
  removePostalCode,
  provinces,
}: Step3Props) {
  return (
    <motion.div
      key="step3"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-2xl font-bold text-white">Location & Coverage Area</h2>
        <p className="mt-1 text-sm text-slate-300">Where is your workshop located and what areas do you serve?</p>
      </div>

      <TextField
        label="Street Address"
        value={formData.address}
        onChange={(v) => updateForm({ address: v })}
        icon={MapPin}
        placeholder="123 Main Street"
        error={errors.address}
        required
      />

      <div className="grid gap-4 md:grid-cols-3">
        <TextField
          label="City"
          value={formData.city}
          onChange={(v) => updateForm({ city: v })}
          placeholder="Toronto"
          error={errors.city}
          required
        />
        <SelectField
          label="Province"
          value={formData.province}
          onChange={(v) => updateForm({ province: v })}
          options={provinces}
          error={errors.province}
          required
        />
        <TextField
          label="Postal Code"
          value={formData.postalCode}
          onChange={(v) => updateForm({ postalCode: v })}
          placeholder="M5V 3A8"
          error={errors.postalCode}
          required
        />
      </div>

      {/* Coverage Postal Codes */}
      <div>
        <label className="block text-sm font-semibold text-slate-200">
          Coverage Postal Codes <span className="text-rose-400">*</span>
        </label>
        <p className="mt-1 text-xs text-slate-400">
          Enter postal code prefixes you serve (e.g., M5V, M5G). Customers in these areas will see your workshop.
        </p>
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={postalCodeInput}
            onChange={(e) => setPostalCodeInput(e.target.value.toUpperCase())}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addPostalCode()
              }
            }}
            placeholder="e.g., M5V"
            className="block flex-1 rounded-xl border border-white/10 bg-slate-900/60 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/60"
            maxLength={6}
          />
          <button
            type="button"
            onClick={addPostalCode}
            className="rounded-xl bg-orange-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-500"
          >
            Add
          </button>
        </div>
        {errors.coveragePostalCodes && (
          <p className="mt-1 text-xs text-rose-400">{errors.coveragePostalCodes}</p>
        )}

        {/* Display added postal codes */}
        {formData.coveragePostalCodes.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {formData.coveragePostalCodes.map((code) => (
              <div
                key={code}
                className="flex items-center gap-2 rounded-lg border border-white/10 bg-slate-800/60 px-3 py-1.5"
              >
                <span className="text-sm font-medium text-white">{code}</span>
                <button
                  type="button"
                  onClick={() => removePostalCode(code)}
                  className="text-slate-400 transition hover:text-rose-400"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Service Radius */}
      <div>
        <label className="block text-sm font-semibold text-slate-200">
          Service Radius (km)
        </label>
        <p className="mt-1 text-xs text-slate-400">
          Maximum distance your mechanics will travel from your workshop
        </p>
        <input
          type="range"
          min="10"
          max="100"
          step="5"
          value={formData.serviceRadiusKm}
          onChange={(e) => updateForm({ serviceRadiusKm: parseInt(e.target.value) })}
          className="mt-2 w-full"
        />
        <div className="mt-1 text-center text-sm font-semibold text-orange-400">
          {formData.serviceRadiusKm} km
        </div>
      </div>

      {/* Mechanic Capacity */}
      <div>
        <label className="block text-sm font-semibold text-slate-200">
          Mechanic Capacity
        </label>
        <p className="mt-1 text-xs text-slate-400">
          Maximum number of mechanics you plan to have on the platform
        </p>
        <input
          type="number"
          min="1"
          max="100"
          value={formData.mechanicCapacity}
          onChange={(e) => updateForm({ mechanicCapacity: parseInt(e.target.value) || 1 })}
          className="mt-2 block w-full rounded-xl border border-white/10 bg-slate-900/60 px-4 py-2.5 text-sm text-white focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/60"
        />
      </div>

      {/* Commission Rate */}
      <div>
        <label className="block text-sm font-semibold text-slate-200">
          Workshop Commission Rate (%)
        </label>
        <p className="mt-1 text-xs text-slate-400">
          Your share of each session fee (Default: 10%)
        </p>
        <input
          type="number"
          min="0"
          max="50"
          step="0.5"
          value={formData.commissionRate}
          onChange={(e) => updateForm({ commissionRate: parseFloat(e.target.value) || 10 })}
          className="mt-2 block w-full rounded-xl border border-white/10 bg-slate-900/60 px-4 py-2.5 text-sm text-white focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/60"
        />
        <p className="mt-1 text-xs text-slate-400">
          Platform: 15% | Workshop: {formData.commissionRate}% | Mechanic: {85 - formData.commissionRate}%
        </p>
      </div>
    </motion.div>
  )
}

// Step 4: Review
export function Step4Review({ formData, updateForm, errors, setCurrentStep }: Step4Props) {
  return (
    <motion.div
      key="step4"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-2xl font-bold text-white">Review Your Application</h2>
        <p className="mt-1 text-sm text-slate-300">Please review all information before submitting</p>
      </div>

      <ReviewSection title="Workshop Information" onEdit={() => setCurrentStep(1)}>
        <ReviewItem label="Workshop Name" value={formData.workshopName} />
        <ReviewItem label="Contact Person" value={formData.contactName} />
        <ReviewItem label="Email" value={formData.email} />
        <ReviewItem label="Phone" value={formData.phone} />
      </ReviewSection>

      <ReviewSection title="Business Details" onEdit={() => setCurrentStep(2)}>
        <ReviewItem label="Business Registration #" value={formData.businessRegistrationNumber} />
        <ReviewItem label="GST/HST #" value={formData.taxId} />
        <ReviewItem label="Industry" value={formData.industry} />
        {formData.website && <ReviewItem label="Website" value={formData.website} />}
      </ReviewSection>

      <ReviewSection title="Location & Coverage" onEdit={() => setCurrentStep(3)}>
        <ReviewItem label="Address" value={`${formData.address}, ${formData.city}, ${formData.province} ${formData.postalCode}`} />
        <ReviewItem label="Coverage Areas" value={formData.coveragePostalCodes.join(', ')} />
        <ReviewItem label="Service Radius" value={`${formData.serviceRadiusKm} km`} />
        <ReviewItem label="Mechanic Capacity" value={formData.mechanicCapacity.toString()} />
        <ReviewItem label="Commission Rate" value={`${formData.commissionRate}%`} />
      </ReviewSection>

      {/* Terms & Conditions */}
      <div className={`rounded-xl border p-4 ${formData.termsAccepted ? 'border-green-400/30 bg-green-500/10' : errors.termsAccepted ? 'border-rose-400/30 bg-rose-500/10' : 'border-white/10 bg-slate-800/40'}`}>
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={formData.termsAccepted}
            onChange={(e) => updateForm({ termsAccepted: e.target.checked })}
            className="mt-1 h-5 w-5 rounded border-white/10 bg-slate-700 text-orange-500 focus:ring-2 focus:ring-orange-500"
          />
          <div className="flex-1">
            <span className="text-sm font-medium text-white">
              I agree to the Terms of Service and Privacy Policy
            </span>
            <p className="mt-1 text-xs text-slate-400">
              By submitting this application, you agree to our workshop partner agreement and understand that your application will be reviewed before approval.
            </p>
          </div>
        </label>
        {errors.termsAccepted && (
          <p className="mt-2 text-xs text-rose-400">{errors.termsAccepted}</p>
        )}
      </div>

      {/* Success Message */}
      <div className="rounded-xl border border-green-400/30 bg-green-500/10 p-6">
        <div className="flex gap-3">
          <CheckCircle2 className="h-6 w-6 flex-shrink-0 text-green-400" />
          <div>
            <h3 className="font-semibold text-white">Ready to Submit</h3>
            <p className="mt-2 text-sm text-slate-300">
              Your application will be reviewed by our team. You'll receive an email notification once approved, typically within 2-3 business days. After approval, you'll complete Stripe Connect onboarding to start receiving payouts.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// Helper Components
interface TextFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  icon: React.ComponentType<{ className?: string }>
  placeholder?: string
  error?: string
  required?: boolean
  helpText?: string
}

function TextField({ label, value, onChange, type = 'text', icon: Icon, placeholder, error, required = false, helpText = '' }: TextFieldProps) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-200">
        {label} {required && <span className="text-rose-400">*</span>}
      </span>
      {helpText && <p className="mt-1 text-xs text-slate-400">{helpText}</p>}
      <div className="relative mt-2">
        {Icon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Icon className="h-5 w-5 text-slate-400" />
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`block w-full rounded-xl border px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 ${Icon ? 'pl-10' : ''} ${error ? 'border-rose-400/50 bg-rose-500/10 focus:border-rose-400 focus:ring-rose-400/60' : 'border-white/10 bg-slate-900/60 focus:border-orange-400 focus:ring-orange-400/60'}`}
        />
      </div>
      {error && <p className="mt-1 text-xs text-rose-400">{error}</p>}
    </label>
  )
}

interface SelectFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  options: string[]
  error?: string
  required?: boolean
}

function SelectField({ label, value, onChange, options, error, required = false }: SelectFieldProps) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-200">
        {label} {required && <span className="text-rose-400">*</span>}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`mt-2 block w-full rounded-xl border px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 ${error ? 'border-rose-400/50 bg-rose-500/10 focus:border-rose-400 focus:ring-rose-400/60' : 'border-white/10 bg-slate-900/60 focus:border-orange-400 focus:ring-orange-400/60'}`}
      >
        <option value="">Select...</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-rose-400">{error}</p>}
    </label>
  )
}

function ReviewSection({ title, children, onEdit }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-800/40 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <button
          type="button"
          onClick={onEdit}
          className="text-sm font-medium text-orange-400 hover:text-orange-300"
        >
          Edit
        </button>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function ReviewItem({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-sm text-slate-400">{label}:</span>
      <span className="text-sm font-medium text-white">{value}</span>
    </div>
  )
}
