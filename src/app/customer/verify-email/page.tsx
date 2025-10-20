'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function VerifyEmailPage() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email')

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <div className="w-full max-w-md">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-600">
            <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="mt-6 text-3xl font-bold text-slate-900">Check Your Email</h1>
          <p className="mt-2 text-sm text-slate-600">
            We've sent a verification link to your email
          </p>
        </div>

        <div className="mt-8 space-y-6 rounded-2xl bg-white p-8 shadow-sm">
          <div className="rounded-lg bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <svg className="h-6 w-6 flex-shrink-0 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-blue-900">Verification Email Sent</h3>
                {email && (
                  <p className="mt-1 text-sm text-blue-700">
                    We sent a verification link to <strong>{email}</strong>
                  </p>
                )}
                <p className="mt-2 text-sm text-blue-700">
                  Click the link in the email to verify your account and start using AskAutoDoctor.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">Next Steps:</h3>
            <ol className="space-y-2 text-sm text-slate-600">
              <li className="flex gap-2">
                <span className="font-semibold text-blue-600">1.</span>
                <span>Open the email we sent you</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-blue-600">2.</span>
                <span>Click the "Verify Email" button</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-blue-600">3.</span>
                <span>You'll be redirected to login</span>
              </li>
            </ol>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Didn't receive the email?</h3>
            <ul className="mt-2 space-y-1 text-sm text-slate-600">
              <li>• Check your spam/junk folder</li>
              <li>• Make sure you entered the correct email</li>
              <li>• Wait a few minutes and check again</li>
            </ul>
            <p className="mt-3 text-sm text-slate-600">
              Still having trouble?{' '}
              <a href="mailto:support@askautodoctor.com" className="font-semibold text-blue-600 hover:text-blue-700">
                Contact Support
              </a>
            </p>
          </div>

          <Link
            href="/customer/login"
            className="block rounded-lg bg-blue-600 px-4 py-3 text-center font-semibold text-white transition hover:bg-blue-700"
          >
            Go to Login
          </Link>
        </div>
      </div>
    </div>
  )
}
