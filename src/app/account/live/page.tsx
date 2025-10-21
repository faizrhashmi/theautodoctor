import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

export default async function LiveSupportPage() {
  const supabase = getSupabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/signup')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('preferred_plan')
    .eq('id', user.id)
    .maybeSingle()

  if (user.email_confirmed_at && !profile?.preferred_plan) {
    redirect('/onboarding/pricing')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-semibold text-slate-900">Live mechanic session</h1>
          <p className="mt-3 text-sm text-slate-600">
            Thanks for choosing AskAutoDoctor. A certified mechanic is preparing to join you. Use the
            checklist below to get ready — we’ll open the video room as soon as the mechanic is connected.
          </p>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-6 text-sm text-blue-900">
              <h2 className="text-sm font-semibold text-blue-900">While you wait</h2>
              <ul className="mt-3 space-y-2">
                <li>• Park somewhere with good data or Wi-Fi signal.</li>
                <li>• Have your VIN and mileage nearby if possible.</li>
                <li>• Turn off Bluetooth devices that might steal audio.</li>
              </ul>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-6 text-sm text-emerald-900">
              <h2 className="text-sm font-semibold text-emerald-900">Your mechanic will help with</h2>
              <ul className="mt-3 space-y-2">
                <li>• Live walkthroughs of diagnostics or inspections.</li>
                <li>• Capturing photos/video documentation.</li>
                <li>• Next steps and repair recommendations.</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/signup"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Change appointment
            </Link>
            <a
              href="mailto:support@askautodoctor.com"
              className="text-sm text-orange-600 hover:underline"
            >
              Need to reschedule? Contact support
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
