import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabaseServer'
import WaiverSigningForm from './WaiverSigningForm'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: {
    id: string
  }
}

export default async function SessionWaiverPage({ params }: PageProps) {
  const supabase = getSupabaseServer()

  // 1. Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/signup?redirect=/customer/sessions/${params.id}/waiver`)
  }

  // 2. Get session details
  const { data: session, error } = await supabase
    .from('sessions')
    .select(`
      id,
      customer_user_id,
      mechanic_user_id,
      status,
      type,
      scheduled_for,
      scheduled_start,
      waiver_signed_at,
      mechanic:profiles!mechanic_user_id(full_name, workshop_name)
    `)
    .eq('id', params.id)
    .single()

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-red-500/10 border border-red-500/50 rounded-xl p-6 text-center">
          <h1 className="text-xl font-bold text-red-400 mb-2">Session Not Found</h1>
          <p className="text-slate-300">The requested session could not be found.</p>
        </div>
      </div>
    )
  }

  // 3. Verify this is the customer's session
  if (session.customer_user_id !== user.id) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-red-500/10 border border-red-500/50 rounded-xl p-6 text-center">
          <h1 className="text-xl font-bold text-red-400 mb-2">Access Denied</h1>
          <p className="text-slate-300">You do not have permission to view this session.</p>
        </div>
      </div>
    )
  }

  // 4. Check if waiver already signed
  if (session.waiver_signed_at) {
    redirect(`/customer/sessions/${params.id}`)
  }

  // 5. Check if session is still schedulable (not cancelled)
  if (session.status !== 'scheduled') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-yellow-500/10 border border-yellow-500/50 rounded-xl p-6 text-center">
          <h1 className="text-xl font-bold text-yellow-400 mb-2">Session Unavailable</h1>
          <p className="text-slate-300">
            This session is no longer scheduled. Status: {session.status}
          </p>
        </div>
      </div>
    )
  }

  // 6. Render waiver form
  return (
    <WaiverSigningForm
      sessionId={session.id}
      mechanicName={session.mechanic?.full_name || 'Your Mechanic'}
      scheduledFor={new Date(session.scheduled_for)}
      sessionType={session.type}
    />
  )
}
