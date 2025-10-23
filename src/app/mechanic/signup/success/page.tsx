// @ts-nocheck
'use client';
import Link from 'next/link';
import { CheckCircle2, Clock, FileText, Mail, Wrench } from 'lucide-react';

export default function SignupSuccess() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4">
      <main className="w-full max-w-2xl">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
          {/* Success Icon */}
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-500">
            <CheckCircle2 className="h-10 w-10 text-white" />
          </div>

          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-white">Application Submitted!</h1>
            <p className="mt-3 text-lg text-slate-300">
              Thank you for applying to become a mechanic
            </p>
          </div>

          {/* What Happens Next */}
          <div className="mb-8 space-y-4">
            <h2 className="text-xl font-semibold text-white">What happens next?</h2>

            <div className="space-y-4">
              <Step
                icon={FileText}
                title="Application Review"
                description="Our team will review your credentials, certifications, and documents. This typically takes 2-3 business days."
              />
              <Step
                icon={Mail}
                title="Email Notification"
                description="You&apos;ll receive an email once your application has been reviewed. We&apos;ll let you know if we need any additional information."
              />
              <Step
                icon={CheckCircle2}
                title="Approval & Onboarding"
                description="Once approved, you&apos;ll complete Stripe Connect onboarding for payments and gain access to your mechanic dashboard."
              />
              <Step
                icon={Wrench}
                title="Start Accepting Jobs"
                description="After completing onboarding, you can start accepting video diagnostic sessions and helping customers!"
              />
            </div>
          </div>

          {/* Info Box */}
          <div className="mb-8 rounded-xl border border-blue-500/30 bg-blue-500/10 p-6">
            <div className="flex gap-3">
              <Clock className="h-6 w-6 flex-shrink-0 text-blue-400" />
              <div>
                <h3 className="font-semibold text-white">Review Timeline</h3>
                <p className="mt-2 text-sm text-slate-300">
                  Most applications are reviewed within 2-3 business days. If we need additional
                  information, we&apos;ll reach out via email. Please check your inbox (and spam folder)
                  regularly.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/mechanic/dashboard"
              className="flex-1 rounded-xl bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 px-6 py-3 text-center text-sm font-semibold text-white shadow-lg transition hover:from-orange-400 hover:via-orange-500 hover:to-orange-600"
            >
              Go to Dashboard
            </Link>
            <Link
              href="/"
              className="flex-1 rounded-xl border border-white/10 bg-slate-800/60 px-6 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-700/60"
            >
              Back to Homepage
            </Link>
          </div>

          {/* Support */}
          <div className="mt-8 text-center">
            <p className="text-sm text-slate-400">
              Questions about your application?{' '}
              <Link href="/contact" className="font-semibold text-orange-400 hover:text-orange-300">
                Contact Support
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

function Step({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4 rounded-xl border border-white/10 bg-slate-800/40 p-4">
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-orange-500/20">
        <Icon className="h-6 w-6 text-orange-400" />
      </div>
      <div>
        <h3 className="font-semibold text-white">{title}</h3>
        <p className="mt-1 text-sm text-slate-300">{description}</p>
      </div>
    </div>
  );
}
