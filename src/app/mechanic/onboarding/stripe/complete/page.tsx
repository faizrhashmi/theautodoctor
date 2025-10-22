import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabaseServer'

export default async function StripeOnboardingCompletePage() {
  const supabase = getSupabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/mechanic/login')
  }

  // Redirect to dashboard - the dashboard will check and display Stripe status
  redirect('/mechanic/dashboard?stripe_onboarding=complete')
}
