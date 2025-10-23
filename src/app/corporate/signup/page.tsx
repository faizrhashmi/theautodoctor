// @ts-nocheck
'use client';

import { useState } from 'react';
import Link from 'next/link';

type BusinessType = 'fleet' | 'dealership' | 'repair_shop' | 'rental' | 'taxi_service' | 'trucking' | 'other';

interface CorporateSignupForm {
  // Company information
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  companyWebsite: string;
  businessType: BusinessType;
  industry: string;

  // Address
  streetAddress: string;
  city: string;
  province: string;
  postalCode: string;

  // Primary contact
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  contactTitle: string;

  // Business details
  businessRegistrationNumber: string;
  taxId: string;
  fleetSize: string;
  estimatedMonthlyUsage: string;

  // Additional information
  currentChallenges: string;
  desiredFeatures: string;

  // Terms
  termsAccepted: boolean;
}

const BUSINESS_TYPES = [
  { value: 'fleet', label: 'Fleet Management', description: 'Commercial fleet operations' },
  { value: 'dealership', label: 'Automotive Dealership', description: 'Car sales and service' },
  { value: 'repair_shop', label: 'Repair Shop', description: 'Auto repair and maintenance' },
  { value: 'rental', label: 'Rental Company', description: 'Vehicle rental services' },
  { value: 'taxi_service', label: 'Taxi/Ride Service', description: 'Transportation services' },
  { value: 'trucking', label: 'Trucking Company', description: 'Commercial trucking' },
  { value: 'other', label: 'Other', description: 'Other automotive business' },
];

const PROVINCES = [
  'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador',
  'Northwest Territories', 'Nova Scotia', 'Nunavut', 'Ontario', 'Prince Edward Island',
  'Quebec', 'Saskatchewan', 'Yukon'
];

export default function CorporateSignupPage() {
  const [formData, setFormData] = useState<CorporateSignupForm>({
    companyName: '',
    companyEmail: '',
    companyPhone: '',
    companyWebsite: '',
    businessType: 'fleet',
    industry: '',
    streetAddress: '',
    city: '',
    province: 'Ontario',
    postalCode: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    contactTitle: '',
    businessRegistrationNumber: '',
    taxId: '',
    fleetSize: '',
    estimatedMonthlyUsage: '',
    currentChallenges: '',
    desiredFeatures: '',
    termsAccepted: false,
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      // Validate required fields
      if (!formData.companyName || !formData.companyEmail || !formData.contactName) {
        throw new Error('Please fill in all required fields');
      }

      if (!formData.termsAccepted) {
        throw new Error('Please accept the terms and conditions');
      }

      const response = await fetch('/api/corporate/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit application');
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 md:p-12 text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-slate-900 mb-4">
            Application Submitted Successfully!
          </h1>

          <p className="text-lg text-slate-600 mb-8">
            Thank you for your interest in AskAutoDoctor Corporate. Our team will review your application and contact you within 1-2 business days.
          </p>

          <div className="bg-slate-50 rounded-lg p-6 mb-8 text-left">
            <h3 className="font-semibold text-slate-900 mb-3">What happens next?</h3>
            <ul className="space-y-2 text-slate-700">
              <li className="flex items-start gap-2">
                <span className="text-orange-600 mt-1">1.</span>
                <span>Our team will review your application</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-600 mt-1">2.</span>
                <span>We&apos;ll contact you to discuss your specific needs</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-600 mt-1">3.</span>
                <span>Receive a custom quote tailored to your fleet</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-600 mt-1">4.</span>
                <span>Get started with onboarding and training</span>
              </li>
            </ul>
          </div>

          <div className="flex gap-4 justify-center">
            <Link
              href="/"
              className="px-6 py-3 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition"
            >
              Return to Home
            </Link>
            <Link
              href="/contact"
              className="px-6 py-3 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition"
            >
              Contact Sales
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <Link href="/" className="inline-block mb-6">
            <span className="text-2xl font-bold text-orange-600">AskAutoDoctor</span>
          </Link>
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Corporate Account Application
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Join leading fleet operators and automotive businesses. Get dedicated support, custom pricing, and powerful fleet management tools.
          </p>
        </div>

        {/* Benefits Banner */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8 grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-orange-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-900 mb-1">Multi-User Access</h3>
            <p className="text-sm text-slate-600">Manage your entire fleet team</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-orange-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-900 mb-1">Custom Pricing</h3>
            <p className="text-sm text-slate-600">Volume discounts for fleets</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-orange-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-900 mb-1">Consolidated Billing</h3>
            <p className="text-sm text-slate-600">Monthly invoicing for all users</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Company Information */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-4 pb-2 border-b">
              Company Information
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  placeholder="ABC Transport Inc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Company Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="companyEmail"
                  value={formData.companyEmail}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  placeholder="info@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Company Phone
                </label>
                <input
                  type="tel"
                  name="companyPhone"
                  value={formData.companyPhone}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  placeholder="(555) 123-4567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Website
                </label>
                <input
                  type="url"
                  name="companyWebsite"
                  value={formData.companyWebsite}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  placeholder="https://www.company.com"
                />
              </div>
            </div>
          </div>

          {/* Business Type */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-4 pb-2 border-b">
              Business Details
            </h2>
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Business Type <span className="text-red-500">*</span>
              </label>
              <div className="grid md:grid-cols-2 gap-3">
                {BUSINESS_TYPES.map((type) => (
                  <label
                    key={type.value}
                    className={`relative flex items-start p-4 border-2 rounded-lg cursor-pointer transition ${
                      formData.businessType === type.value
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="businessType"
                      value={type.value}
                      checked={formData.businessType === type.value}
                      onChange={handleChange}
                      className="mt-1"
                    />
                    <div className="ml-3">
                      <div className="font-medium text-slate-900">{type.label}</div>
                      <div className="text-sm text-slate-600">{type.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Industry
                </label>
                <input
                  type="text"
                  name="industry"
                  value={formData.industry}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  placeholder="e.g., Logistics, Transportation"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Fleet Size
                </label>
                <select
                  name="fleetSize"
                  value={formData.fleetSize}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                >
                  <option value="">Select fleet size</option>
                  <option value="1-10">1-10 vehicles</option>
                  <option value="11-25">11-25 vehicles</option>
                  <option value="26-50">26-50 vehicles</option>
                  <option value="51-100">51-100 vehicles</option>
                  <option value="100+">100+ vehicles</option>
                </select>
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-4 pb-2 border-b">
              Business Address
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Street Address
                </label>
                <input
                  type="text"
                  name="streetAddress"
                  value={formData.streetAddress}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  placeholder="123 Main Street"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  City
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  placeholder="Toronto"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Province
                </label>
                <select
                  name="province"
                  value={formData.province}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                >
                  {PROVINCES.map((prov) => (
                    <option key={prov} value={prov}>{prov}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Postal Code
                </label>
                <input
                  type="text"
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  placeholder="M5H 2N2"
                />
              </div>
            </div>
          </div>

          {/* Primary Contact */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-4 pb-2 border-b">
              Primary Contact Person
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="contactName"
                  value={formData.contactName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  placeholder="John Smith"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Title/Position
                </label>
                <input
                  type="text"
                  name="contactTitle"
                  value={formData.contactTitle}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  placeholder="Fleet Manager"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="contactEmail"
                  value={formData.contactEmail}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  placeholder="john@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  name="contactPhone"
                  value={formData.contactPhone}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-4 pb-2 border-b">
              Additional Information
            </h2>
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Business Registration Number
                </label>
                <input
                  type="text"
                  name="businessRegistrationNumber"
                  value={formData.businessRegistrationNumber}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  placeholder="123456789"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tax ID / GST Number
                </label>
                <input
                  type="text"
                  name="taxId"
                  value={formData.taxId}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  placeholder="123456789RT0001"
                />
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Estimated Monthly Usage
              </label>
              <select
                name="estimatedMonthlyUsage"
                value={formData.estimatedMonthlyUsage}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
              >
                <option value="">Select expected usage</option>
                <option value="10-50">10-50 sessions/month</option>
                <option value="51-100">51-100 sessions/month</option>
                <option value="101-250">101-250 sessions/month</option>
                <option value="250+">250+ sessions/month</option>
              </select>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Current Challenges (Optional)
              </label>
              <textarea
                name="currentChallenges"
                value={formData.currentChallenges}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none resize-none"
                placeholder="Tell us about any current challenges your fleet faces..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Desired Features (Optional)
              </label>
              <textarea
                name="desiredFeatures"
                value={formData.desiredFeatures}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none resize-none"
                placeholder="What features are most important for your business?"
              />
            </div>
          </div>

          {/* Terms and Submit */}
          <div className="border-t pt-6">
            <label className="flex items-start gap-3 mb-6 cursor-pointer">
              <input
                type="checkbox"
                name="termsAccepted"
                checked={formData.termsAccepted}
                onChange={handleChange}
                className="mt-1"
                required
              />
              <span className="text-sm text-slate-700">
                I agree to the <a href="/terms" className="text-orange-600 hover:underline">Terms of Service</a> and{' '}
                <a href="/privacy" className="text-orange-600 hover:underline">Privacy Policy</a>. I understand that this is an application and my account will be reviewed before activation.
              </span>
            </label>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={submitting || !formData.termsAccepted}
                className="flex-1 bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {submitting ? 'Submitting...' : 'Submit Application'}
              </button>
              <Link
                href="/"
                className="px-6 py-3 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition"
              >
                Cancel
              </Link>
            </div>

            <p className="text-xs text-slate-500 mt-4 text-center">
              By submitting this form, you consent to be contacted by our sales team regarding your corporate account.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
