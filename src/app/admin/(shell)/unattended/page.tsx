// @ts-nocheck
import { getSupabaseServer } from '@/lib/supabaseServer'
import { redirect } from 'next/navigation'
import UnattendedRequestsList from './UnattendedRequestsList'

export const dynamic = 'force-dynamic'

export default async function UnattendedRequestsPage() {
  const supabase = getSupabaseServer()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/admin/login')
  }

  // Fetch unattended requests
  const { data: unattendedRequests, error: unattendedError } = await supabase
    .from('session_requests')
    .select('*')
    .eq('status', 'unattended')
    .order('created_at', { ascending: true })

  if (unattendedError) {
    throw new Error(unattendedError.message)
  }

  // Fetch expired requests
  const { data: expiredRequests, error: expiredError } = await supabase
    .from('session_requests')
    .select('*')
    .eq('status', 'expired')
    .order('created_at', { ascending: true })

  if (expiredError) {
    throw new Error(expiredError.message)
  }

  // Fetch all mechanics for assignment dropdown
  const { data: mechanics, error: mechanicsError } = await supabase
    .from('mechanics')
    .select('id, name, email')
    .order('name', { ascending: true })

  if (mechanicsError) {
    throw new Error(mechanicsError.message)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Unattended Session Requests</h1>
        <p className="mt-2 text-sm text-slate-400">
          Manage requests that were not accepted by mechanics within 5 minutes
        </p>
      </div>

      <UnattendedRequestsList
        unattendedRequests={unattendedRequests || []}
        expiredRequests={expiredRequests || []}
        mechanics={mechanics || []}
      />
    </div>
  )
}
