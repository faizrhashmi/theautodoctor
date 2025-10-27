// @ts-nocheck
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Wrench,
  Mail,
  Phone,
  Lock,
  User,
  MapPin,
  Calendar,
  Award,
  Upload,
  Building2,
  Shield,
  CreditCard,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  FileText,
  AlertCircle,
} from 'lucide-react';

// Form data interface
interface SignupFormData {
  // Step 1: Personal Information
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  dateOfBirth: string;
  sinOrBusinessNumber: string;

  // Step 2: Credentials & Certifications
  redSealCertified: boolean;
  redSealNumber: string;
  redSealProvince: string;
  redSealExpiry: string;
  redSealDocument: File | null;
  otherCertifications: Array<{ name: string; issuer: string; number: string; file: File | null }>;
  yearsOfExperience: string;
  specializations: string[];

  // Step 3: Shop Information
  shopAffiliation: 'independent' | 'dealership' | 'franchise' | 'mobile' | '';
  shopName: string;
  shopAddress: string;
  businessLicenseNumber: string;
  businessLicenseDocument: File | null;

  // Step 4: Insurance & Background
  liabilityInsurance: boolean;
  insurancePolicyNumber: string;
  insuranceExpiry: string;
  insuranceDocument: File | null;
  criminalRecordCheck: boolean;
  crcDocument: File | null;

  // Step 5: Banking (handled by Stripe)
  agreesToTerms: boolean;
}

const STEPS = [
  { id: 1, name: 'Personal Info', icon: User },
  { id: 2, name: 'Credentials', icon: Award },
  { id: 3, name: 'Shop Info', icon: Building2 },
  { id: 4, name: 'Insurance', icon: Shield },
  { id: 5, name: 'Banking', icon: CreditCard },
  { id: 6, name: 'Review', icon: CheckCircle2 },
];

const SPECIALIZATIONS = [
  'Brakes',
  'Engine Repair',
  'Transmission',
  'Electrical Systems',
  'Air Conditioning',
  'Suspension',
  'Exhaust Systems',
  'Diagnostics',
  'Oil Changes',
  'Tire Service',
  'Hybrid/Electric',
  'Diesel',
];

const CANADIAN_PROVINCES = [
  'Alberta',
  'British Columbia',
  'Manitoba',
  'New Brunswick',
  'Newfoundland and Labrador',
  'Northwest Territories',
  'Nova Scotia',
  'Nunavut',
  'Ontario',
  'Prince Edward Island',
  'Quebec',
  'Saskatchewan',
  'Yukon',
];

export default function MechanicSignup() {
  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState<SignupFormData>({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    address: '',
    city: '',
    province: '',
    postalCode: '',
    country: 'Canada',
    dateOfBirth: '',
    sinOrBusinessNumber: '',
    redSealCertified: false,
    redSealNumber: '',
    redSealProvince: '',
    redSealExpiry: '',
    redSealDocument: null,
    otherCertifications: [],
    yearsOfExperience: '',
    specializations: [],
    shopAffiliation: '',
    shopName: '',
    shopAddress: '',
    businessLicenseNumber: '',
    businessLicenseDocument: null,
    liabilityInsurance: false,
    insurancePolicyNumber: '',
    insuranceExpiry: '',
    insuranceDocument: null,
    criminalRecordCheck: false,
    crcDocument: null,
    agreesToTerms: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const router = useRouter();

  // Load draft on mount
  useEffect(() => {
    const draft = localStorage.getItem('mechanic_signup_draft');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        setForm(parsed.form);
        setCurrentStep(parsed.step);
      } catch (e) {
        console.error('Failed to load draft:', e);
      }
    }
  }, []);

  const saveDraft = useCallback(async () => {
    setSavingDraft(true);
    localStorage.setItem(
      'mechanic_signup_draft',
      JSON.stringify({ form, step: currentStep })
    );
    // Also save to backend if user has started
    if (form.email) {
      try {
        await fetch('/api/mechanic/signup/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ form, step: currentStep }),
        });
      } catch (e) {
        // Silent fail - draft saved locally
      }
    }
    setTimeout(() => setSavingDraft(false), 1000);
  }, [form, currentStep]);

  // Auto-save draft every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      saveDraft();
    }, 30000);
    return () => clearInterval(timer);
  }, [saveDraft]);

  const updateForm = (updates: Partial<SignupFormData>) => {
    setForm({ ...form, ...updates });
    setError(null);
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
      window.scrollTo(0, 0);
      saveDraft();
    }
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
    window.scrollTo(0, 0);
  };

  const validateStep = (step: number): boolean => {
    setError(null);

    switch (step) {
      case 1:
        if (!form.name.trim()) {
          setError('Full name is required');
          return false;
        }
        if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
          setError('Valid email is required');
          return false;
        }
        if (!form.phone.trim()) {
          setError('Phone number is required');
          return false;
        }
        if (form.password.length < 8) {
          setError('Password must be at least 8 characters');
          return false;
        }
        if (form.password !== form.confirmPassword) {
          setError('Passwords do not match');
          return false;
        }
        if (!form.address.trim() || !form.city.trim() || !form.province || !form.postalCode.trim()) {
          setError('Complete address is required');
          return false;
        }
        if (!form.dateOfBirth) {
          setError('Date of birth is required');
          return false;
        }
        // Check age (must be 18+)
        const age = new Date().getFullYear() - new Date(form.dateOfBirth).getFullYear();
        if (age < 18) {
          setError('You must be at least 18 years old');
          return false;
        }
        // Only require SIN if feature flag is enabled
        if (process.env.NEXT_PUBLIC_ENABLE_SIN_COLLECTION === 'true' && !form.sinOrBusinessNumber.trim()) {
          setError('SIN or Business Number is required for tax purposes');
          return false;
        }
        return true;

      case 2:
        if (!form.yearsOfExperience || parseInt(form.yearsOfExperience) < 0) {
          setError('Years of experience is required');
          return false;
        }
        if (form.specializations.length === 0) {
          setError('Please select at least one specialization');
          return false;
        }
        if (form.redSealCertified) {
          if (!form.redSealNumber || !form.redSealProvince || !form.redSealExpiry) {
            setError('Complete Red Seal information is required');
            return false;
          }
          if (!form.redSealDocument) {
            setError('Red Seal certificate document is required');
            return false;
          }
        }
        return true;

      case 3:
        if (!form.shopAffiliation) {
          setError('Work arrangement is required');
          return false;
        }
        if (form.shopAffiliation !== 'mobile' && form.shopAffiliation !== 'independent') {
          if (!form.shopName || !form.shopAddress) {
            setError('Shop name and address are required');
            return false;
          }
        }
        return true;

      case 4:
        if (!form.liabilityInsurance) {
          setError('Liability insurance is required to work as a mechanic');
          return false;
        }
        if (!form.insurancePolicyNumber || !form.insuranceExpiry) {
          setError('Insurance policy number and expiry date are required');
          return false;
        }
        if (!form.insuranceDocument) {
          setError('Insurance certificate document is required');
          return false;
        }
        if (!form.criminalRecordCheck) {
          setError('Criminal record check is required');
          return false;
        }
        if (!form.crcDocument) {
          setError('Criminal record check document is required');
          return false;
        }
        return true;

      case 5:
        if (!form.agreesToTerms) {
          setError('You must agree to the terms and conditions');
          return false;
        }
        return true;

      default:
        return true;
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(5)) return;

    setLoading(true);
    setError(null);

    try {
      // First, upload all documents
      const uploadedDocs = await uploadDocuments();

      // Then submit the application
      const res = await fetch('/api/mechanic/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          uploadedDocuments: uploadedDocs,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Signup failed');
      }

      // Clear draft
      localStorage.removeItem('mechanic_signup_draft');

      // Redirect to success page or dashboard
      router.push('/mechanic/signup/success');
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  };

  const uploadDocuments = async () => {
    const uploads: Record<string, string> = {};
    const files: Array<{ file: File; type: string; key: string }> = [];

    if (form.redSealDocument) {
      files.push({ file: form.redSealDocument, type: 'red_seal_certificate', key: 'redSeal' });
    }
    if (form.businessLicenseDocument) {
      files.push({ file: form.businessLicenseDocument, type: 'business_license', key: 'businessLicense' });
    }
    if (form.insuranceDocument) {
      files.push({ file: form.insuranceDocument, type: 'insurance_certificate', key: 'insurance' });
    }
    if (form.crcDocument) {
      files.push({ file: form.crcDocument, type: 'criminal_record_check', key: 'crc' });
    }

    for (const { file, type, key } of files) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      formData.append('email', form.email);

      const res = await fetch('/api/mechanic/upload-document', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Failed to upload ${type}`);
      }

      const data = await res.json();
      uploads[key] = data.url;
    }

    return uploads;
  };

  const addCertification = () => {
    updateForm({
      otherCertifications: [
        ...form.otherCertifications,
        { name: '', issuer: '', number: '', file: null },
      ],
    });
  };

  const removeCertification = (index: number) => {
    updateForm({
      otherCertifications: form.otherCertifications.filter((_, i) => i !== index),
    });
  };

  const toggleSpecialization = (spec: string) => {
    if (form.specializations.includes(spec)) {
      updateForm({
        specializations: form.specializations.filter((s) => s !== spec),
      });
    } else {
      updateForm({
        specializations: [...form.specializations, spec],
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-8">
      <main className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-600">
            <Wrench className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Become a Mechanic</h1>
          <p className="mt-2 text-slate-300">Professional credential verification</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;

              return (
                <div key={step.id} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all ${
                        isCompleted
                          ? 'border-green-500 bg-green-500'
                          : isActive
                          ? 'border-orange-500 bg-orange-500'
                          : 'border-slate-600 bg-slate-800'
                      }`}
                    >
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <span
                      className={`mt-2 text-xs font-medium ${
                        isActive ? 'text-orange-400' : isCompleted ? 'text-green-400' : 'text-slate-500'
                      }`}
                    >
                      {step.name}
                    </span>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div
                      className={`mx-2 h-0.5 w-8 transition-all md:w-16 ${
                        isCompleted ? 'bg-green-500' : 'bg-slate-700'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
          {/* Auto-save indicator */}
          {savingDraft && (
            <div className="mb-4 flex items-center gap-2 text-sm text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              Draft saved
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3">
              <AlertCircle className="h-5 w-5 text-rose-400" />
              <p className="text-sm text-rose-200">{error}</p>
            </div>
          )}

          {/* Step Content */}
          {currentStep === 1 && <Step1Personal form={form} updateForm={updateForm} provinces={CANADIAN_PROVINCES} />}
          {currentStep === 2 && (
            <Step2Credentials
              form={form}
              updateForm={updateForm}
              provinces={CANADIAN_PROVINCES}
              specializations={SPECIALIZATIONS}
              toggleSpecialization={toggleSpecialization}
              addCertification={addCertification}
              removeCertification={removeCertification}
            />
          )}
          {currentStep === 3 && <Step3Shop form={form} updateForm={updateForm} />}
          {currentStep === 4 && <Step4Insurance form={form} updateForm={updateForm} />}
          {currentStep === 5 && <Step5Banking form={form} updateForm={updateForm} />}
          {currentStep === 6 && <Step6Review form={form} setCurrentStep={setCurrentStep} />}

          {/* Navigation Buttons */}
          <div className="mt-8 flex items-center justify-between">
            <button
              type="button"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-800/60 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700/60 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>

            {currentStep < 6 ? (
              <button
                type="button"
                onClick={nextStep}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-orange-400 hover:via-orange-500 hover:to-orange-600"
              >
                Continue
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-500 via-green-600 to-green-700 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-green-400 hover:via-green-500 hover:to-green-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Submit Application'}
                <CheckCircle2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Footer Links */}
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-400">
            Already have an account?{' '}
            <Link href="/mechanic/login" className="font-semibold text-orange-400 hover:text-orange-300">
              Log in
            </Link>
          </p>
          <Link href="/" className="mt-3 inline-block text-sm text-slate-400 hover:text-white">
            Back to homepage
          </Link>
        </div>
      </main>
    </div>
  );
}

// Step 1: Personal Information
function Step1Personal({
  form,
  updateForm,
  provinces,
}: {
  form: SignupFormData;
  updateForm: (updates: Partial<SignupFormData>) => void;
  provinces: string[];
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Personal Information</h2>
      <p className="text-sm text-slate-300">We need your personal details to verify your identity</p>

      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          label="Full Name"
          value={form.name}
          onChange={(v) => updateForm({ name: v })}
          icon={User}
          placeholder="John Smith"
          required
        />
        <TextField
          label="Email"
          type="email"
          value={form.email}
          onChange={(v) => updateForm({ email: v })}
          icon={Mail}
          placeholder="john@example.com"
          required
        />
        <TextField
          label="Phone"
          value={form.phone}
          onChange={(v) => updateForm({ phone: v })}
          icon={Phone}
          placeholder="+1 (555) 123-4567"
          required
        />
        <TextField
          label="Date of Birth"
          type="date"
          value={form.dateOfBirth}
          onChange={(v) => updateForm({ dateOfBirth: v })}
          icon={Calendar}
          required
        />
      </div>

      <TextField
        label="Address"
        value={form.address}
        onChange={(v) => updateForm({ address: v })}
        icon={MapPin}
        placeholder="123 Main Street"
        required
      />

      <div className="grid gap-4 md:grid-cols-3">
        <TextField
          label="City"
          value={form.city}
          onChange={(v) => updateForm({ city: v })}
          placeholder="Toronto"
          required
        />
        <SelectField
          label="Province"
          value={form.province}
          onChange={(v) => updateForm({ province: v })}
          options={provinces}
          required
        />
        <TextField
          label="Postal Code"
          value={form.postalCode}
          onChange={(v) => updateForm({ postalCode: v })}
          placeholder="A1A 1A1"
          required
        />
      </div>

      <TextField
        label="Password"
        type="password"
        value={form.password}
        onChange={(v) => updateForm({ password: v })}
        icon={Lock}
        placeholder="Min. 8 characters"
        required
      />
      <TextField
        label="Confirm Password"
        type="password"
        value={form.confirmPassword}
        onChange={(v) => updateForm({ confirmPassword: v })}
        icon={Lock}
        placeholder="Re-enter password"
        required
      />

      <TextField
        label={
          process.env.NEXT_PUBLIC_ENABLE_SIN_COLLECTION === 'true'
            ? 'SIN or Business Number'
            : 'SIN or Business Number (Optional)'
        }
        value={form.sinOrBusinessNumber}
        onChange={(v) => updateForm({ sinOrBusinessNumber: v })}
        icon={FileText}
        placeholder="For tax purposes (encrypted)"
        required={process.env.NEXT_PUBLIC_ENABLE_SIN_COLLECTION === 'true'}
      />
      <p className="text-xs text-slate-400">
        {process.env.NEXT_PUBLIC_ENABLE_SIN_COLLECTION === 'true'
          ? 'Your SIN or Business Number is encrypted and used only for tax reporting purposes'
          : 'Optional: Your SIN is encrypted. Stripe will collect tax information during payout setup.'}
      </p>
    </div>
  );
}

// Step 2: Credentials
function Step2Credentials({
  form,
  updateForm,
  provinces,
  specializations,
  toggleSpecialization,
  addCertification,
  removeCertification,
}: {
  form: SignupFormData;
  updateForm: (updates: Partial<SignupFormData>) => void;
  provinces: string[];
  specializations: string[];
  toggleSpecialization: (spec: string) => void;
  addCertification: () => void;
  removeCertification: (index: number) => void;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Credentials & Certifications</h2>
      <p className="text-sm text-slate-300">Tell us about your qualifications</p>

      <TextField
        label="Years of Experience"
        type="number"
        value={form.yearsOfExperience}
        onChange={(v) => updateForm({ yearsOfExperience: v })}
        placeholder="5"
        required
      />

      <div>
        <label className="mb-3 block text-sm font-semibold text-slate-200">
          Specializations <span className="text-rose-400">*</span>
        </label>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {specializations.map((spec) => (
            <button
              key={spec}
              type="button"
              onClick={() => toggleSpecialization(spec)}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                form.specializations.includes(spec)
                  ? 'border-orange-500 bg-orange-500/20 text-orange-300'
                  : 'border-white/10 bg-slate-800/60 text-slate-300 hover:border-orange-500/50'
              }`}
            >
              {spec}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-slate-800/40 p-6">
        <div className="mb-4 flex items-center gap-3">
          <input
            type="checkbox"
            id="redSeal"
            checked={form.redSealCertified}
            onChange={(e) => updateForm({ redSealCertified: e.target.checked })}
            className="h-5 w-5 rounded border-white/10 bg-slate-700 text-orange-500 focus:ring-2 focus:ring-orange-500"
          />
          <label htmlFor="redSeal" className="text-sm font-semibold text-white">
            I have Red Seal Certification
          </label>
        </div>

        {form.redSealCertified && (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <TextField
                label="Red Seal Number"
                value={form.redSealNumber}
                onChange={(v) => updateForm({ redSealNumber: v })}
                placeholder="RS123456"
                required
              />
              <SelectField
                label="Province Issued"
                value={form.redSealProvince}
                onChange={(v) => updateForm({ redSealProvince: v })}
                options={provinces}
                required
              />
            </div>
            <TextField
              label="Expiry Date"
              type="date"
              value={form.redSealExpiry}
              onChange={(v) => updateForm({ redSealExpiry: v })}
              required
            />
            <FileUploadField
              label="Upload Red Seal Certificate"
              file={form.redSealDocument}
              onChange={(file) => updateForm({ redSealDocument: file })}
              accept=".pdf,.jpg,.jpeg,.png"
              required
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Step 3: Shop Information
function Step3Shop({
  form,
  updateForm,
}: {
  form: SignupFormData;
  updateForm: (updates: Partial<SignupFormData>) => void;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Shop Information</h2>
      <p className="text-sm text-slate-300">Tell us about your work arrangement</p>

      <div>
        <label className="mb-3 block text-sm font-semibold text-slate-200">
          Work Arrangement <span className="text-rose-400">*</span>
        </label>
        <div className="grid gap-3 md:grid-cols-2">
          {[
            { value: 'independent', label: 'Independent Mechanic', icon: User },
            { value: 'dealership', label: 'Dealership', icon: Building2 },
            { value: 'franchise', label: 'Franchise Shop', icon: Building2 },
            { value: 'mobile', label: 'Mobile Mechanic', icon: Wrench },
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => updateForm({ shopAffiliation: value as any })}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                form.shopAffiliation === value
                  ? 'border-orange-500 bg-orange-500/20'
                  : 'border-white/10 bg-slate-800/60 hover:border-orange-500/50'
              }`}
            >
              <Icon className="h-5 w-5 text-orange-400" />
              <span className="text-sm font-medium text-white">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {form.shopAffiliation && form.shopAffiliation !== 'mobile' && form.shopAffiliation !== 'independent' && (
        <>
          <TextField
            label="Shop Name"
            value={form.shopName}
            onChange={(v) => updateForm({ shopName: v })}
            icon={Building2}
            placeholder="ABC Auto Repair"
            required
          />
          <TextField
            label="Shop Address"
            value={form.shopAddress}
            onChange={(v) => updateForm({ shopAddress: v })}
            icon={MapPin}
            placeholder="456 Garage Street"
            required
          />
        </>
      )}

      <TextField
        label="Business License Number (if applicable)"
        value={form.businessLicenseNumber}
        onChange={(v) => updateForm({ businessLicenseNumber: v })}
        icon={FileText}
        placeholder="BL123456"
      />

      {form.businessLicenseNumber && (
        <FileUploadField
          label="Upload Business License"
          file={form.businessLicenseDocument}
          onChange={(file) => updateForm({ businessLicenseDocument: file })}
          accept=".pdf,.jpg,.jpeg,.png"
        />
      )}
    </div>
  );
}

// Step 4: Insurance & Background
function Step4Insurance({
  form,
  updateForm,
}: {
  form: SignupFormData;
  updateForm: (updates: Partial<SignupFormData>) => void;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Insurance & Background</h2>
      <p className="text-sm text-slate-300">Required for all mechanics</p>

      <div className="rounded-xl border border-white/10 bg-slate-800/40 p-6">
        <div className="mb-4 flex items-center gap-3">
          <input
            type="checkbox"
            id="insurance"
            checked={form.liabilityInsurance}
            onChange={(e) => updateForm({ liabilityInsurance: e.target.checked })}
            className="h-5 w-5 rounded border-white/10 bg-slate-700 text-orange-500 focus:ring-2 focus:ring-orange-500"
          />
          <label htmlFor="insurance" className="text-sm font-semibold text-white">
            I have liability insurance <span className="text-rose-400">*</span>
          </label>
        </div>

        {form.liabilityInsurance && (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <TextField
                label="Policy Number"
                value={form.insurancePolicyNumber}
                onChange={(v) => updateForm({ insurancePolicyNumber: v })}
                placeholder="POL123456"
                required
              />
              <TextField
                label="Expiry Date"
                type="date"
                value={form.insuranceExpiry}
                onChange={(v) => updateForm({ insuranceExpiry: v })}
                required
              />
            </div>
            <FileUploadField
              label="Upload Insurance Certificate"
              file={form.insuranceDocument}
              onChange={(file) => updateForm({ insuranceDocument: file })}
              accept=".pdf,.jpg,.jpeg,.png"
              required
            />
          </div>
        )}
      </div>

      <div className="rounded-xl border border-white/10 bg-slate-800/40 p-6">
        <div className="mb-4 flex items-center gap-3">
          <input
            type="checkbox"
            id="crc"
            checked={form.criminalRecordCheck}
            onChange={(e) => updateForm({ criminalRecordCheck: e.target.checked })}
            className="h-5 w-5 rounded border-white/10 bg-slate-700 text-orange-500 focus:ring-2 focus:ring-orange-500"
          />
          <label htmlFor="crc" className="text-sm font-semibold text-white">
            I have completed a criminal record check <span className="text-rose-400">*</span>
          </label>
        </div>

        {form.criminalRecordCheck && (
          <div className="space-y-4">
            <FileUploadField
              label="Upload Criminal Record Check"
              file={form.crcDocument}
              onChange={(file) => updateForm({ crcDocument: file })}
              accept=".pdf,.jpg,.jpeg,.png"
              required
            />
            <p className="text-xs text-slate-400">
              Must be dated within the last 6 months. We accept RCMP or provincial background checks.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Step 5: Banking
function Step5Banking({
  form,
  updateForm,
}: {
  form: SignupFormData;
  updateForm: (updates: Partial<SignupFormData>) => void;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Banking & Tax Information</h2>
      <p className="text-sm text-slate-300">
        We use Stripe Connect for secure payouts. You&apos;ll set up your banking information after approval.
      </p>

      <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-6">
        <div className="flex gap-3">
          <Shield className="h-6 w-6 flex-shrink-0 text-orange-400" />
          <div>
            <h3 className="font-semibold text-white">Secure Payment Processing</h3>
            <p className="mt-2 text-sm text-slate-300">
              After your application is approved, you&apos;ll be guided through Stripe Connect onboarding to set up your
              bank account for receiving payments. All financial information is securely handled by Stripe.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-slate-800/40 p-6">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="terms"
            checked={form.agreesToTerms}
            onChange={(e) => updateForm({ agreesToTerms: e.target.checked })}
            className="mt-1 h-5 w-5 rounded border-white/10 bg-slate-700 text-orange-500 focus:ring-2 focus:ring-orange-500"
          />
          <label htmlFor="terms" className="text-sm text-slate-300">
            I agree to the{' '}
            <Link href="/terms" target="_blank" className="text-orange-400 hover:text-orange-300">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" target="_blank" className="text-orange-400 hover:text-orange-300">
              Privacy Policy
            </Link>
            . I understand that my application will be reviewed and I will be notified of the decision.{' '}
            <span className="text-rose-400">*</span>
          </label>
        </div>
      </div>
    </div>
  );
}

// Step 6: Review
function Step6Review({
  form,
  setCurrentStep,
}: {
  form: SignupFormData;
  setCurrentStep: (step: number) => void;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Review Your Application</h2>
      <p className="text-sm text-slate-300">Please review all information before submitting</p>

      <ReviewSection title="Personal Information" onEdit={() => setCurrentStep(1)}>
        <ReviewItem label="Name" value={form.name} />
        <ReviewItem label="Email" value={form.email} />
        <ReviewItem label="Phone" value={form.phone} />
        <ReviewItem
          label="Address"
          value={`${form.address}, ${form.city}, ${form.province} ${form.postalCode}`}
        />
        <ReviewItem label="Date of Birth" value={form.dateOfBirth} />
      </ReviewSection>

      <ReviewSection title="Credentials" onEdit={() => setCurrentStep(2)}>
        <ReviewItem label="Years of Experience" value={form.yearsOfExperience} />
        <ReviewItem label="Specializations" value={form.specializations.join(', ')} />
        <ReviewItem label="Red Seal Certified" value={form.redSealCertified ? 'Yes' : 'No'} />
        {form.redSealCertified && (
          <>
            <ReviewItem label="Red Seal Number" value={form.redSealNumber} />
            <ReviewItem label="Province" value={form.redSealProvince} />
            <ReviewItem label="Expiry" value={form.redSealExpiry} />
          </>
        )}
      </ReviewSection>

      <ReviewSection title="Shop Information" onEdit={() => setCurrentStep(3)}>
        <ReviewItem
          label="Work Arrangement"
          value={form.shopAffiliation.charAt(0).toUpperCase() + form.shopAffiliation.slice(1)}
        />
        {form.shopName && <ReviewItem label="Shop Name" value={form.shopName} />}
        {form.shopAddress && <ReviewItem label="Shop Address" value={form.shopAddress} />}
        {form.businessLicenseNumber && (
          <ReviewItem label="Business License" value={form.businessLicenseNumber} />
        )}
      </ReviewSection>

      <ReviewSection title="Insurance & Background" onEdit={() => setCurrentStep(4)}>
        <ReviewItem label="Liability Insurance" value="Yes" />
        <ReviewItem label="Policy Number" value={form.insurancePolicyNumber} />
        <ReviewItem label="Insurance Expiry" value={form.insuranceExpiry} />
        <ReviewItem label="Criminal Record Check" value="Completed" />
      </ReviewSection>

      <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-6">
        <div className="flex gap-3">
          <CheckCircle2 className="h-6 w-6 flex-shrink-0 text-green-400" />
          <div>
            <h3 className="font-semibold text-white">Ready to Submit</h3>
            <p className="mt-2 text-sm text-slate-300">
              Your application will be reviewed by our team. You&apos;ll receive an email notification once a decision has
              been made, typically within 2-3 business days.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Components
function TextField({
  label,
  value,
  onChange,
  type = 'text',
  icon: Icon,
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  icon?: React.ComponentType<{ className?: string }>;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-200">
        {label} {required && <span className="text-rose-400">*</span>}
      </span>
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
          className={`block w-full rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/60 ${Icon ? 'pl-10' : ''}`}
        />
      </div>
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-200">
        {label} {required && <span className="text-rose-400">*</span>}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 block w-full rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2.5 text-sm text-white focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/60"
      >
        <option value="">Select...</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}

function FileUploadField({
  label,
  file,
  onChange,
  accept,
  required = false,
}: {
  label: string;
  file: File | null;
  onChange: (file: File | null) => void;
  accept?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-200">
        {label} {required && <span className="text-rose-400">*</span>}
      </span>
      <div className="mt-2">
        <input
          type="file"
          accept={accept}
          onChange={(e) => onChange(e.target.files?.[0] || null)}
          className="hidden"
          id={`file-${label}`}
        />
        <label
          htmlFor={`file-${label}`}
          className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-white/20 bg-slate-800/40 px-4 py-6 text-center transition hover:border-orange-500/50 hover:bg-slate-800/60"
        >
          <Upload className="h-5 w-5 text-slate-400" />
          <div className="flex-1 text-left">
            {file ? (
              <span className="text-sm font-medium text-white">{file.name}</span>
            ) : (
              <span className="text-sm text-slate-400">Click to upload or drag and drop</span>
            )}
            <p className="mt-1 text-xs text-slate-500">PDF, JPG, PNG (max 10MB)</p>
          </div>
        </label>
      </div>
    </label>
  );
}

function ReviewSection({
  title,
  children,
  onEdit,
}: {
  title: string;
  children: React.ReactNode;
  onEdit: () => void;
}) {
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
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-sm text-slate-400">{label}:</span>
      <span className="text-sm font-medium text-white">{value}</span>
    </div>
  );
}
