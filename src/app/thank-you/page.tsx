import Link from 'next/link'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { PRICING } from '@/config/pricing'
import MechanicInvite from './MechanicInvite'
import { fulfillCheckout } from '@/lib/fulfillment'

type SessionType = 'chat' | 'video' | 'diagnostic'

const ROUTE_BY_TYPE: Record<SessionType, string> = {
  chat: '/chat',
  video: '/video',
  diagnostic: '/diagnostic',
}

const PLAN_NAMES: Record<string, string> = {
  free: 'Complimentary Session',
  trial: 'Complimentary Session',
  quick: 'Quick Chat',
  standard: 'Standard Video',
  diagnostic: 'Full Diagnostic',
}

function resolvePlanName(plan: string | null): string | null {
  if (!plan) return null
  if (PLAN_NAMES[plan]) return PLAN_NAMES[plan] || null
  const pricing = PRICING[plan as keyof typeof PRICING]
  if (pricing) return pricing.name
  return plan
}

export default async function ThankYou({
  searchParams,
}: {
  searchParams: { session_id?: string; session?: string; type?: string; plan?: string }
}) {
  const stripeSessionId = searchParams?.session_id ?? null
  const directSessionId = searchParams?.session ?? null
  let inferredType = searchParams?.type ?? null
  let plan: string | null = searchParams?.plan ?? null
  let amountTotal: number | null = null

  let sessionRoute: string | null = null
  let sessionType: SessionType | null = (['chat', 'video', 'diagnostic'] as SessionType[]).includes(
    (inferredType ?? '') as SessionType,
  )
    ? (inferredType as SessionType)
    : null
  let dbSessionId: string | null = null

  if (directSessionId && supabaseAdmin) {
    const { data: sessionRecord } = await supabaseAdmin
      .from('sessions')
      .select('id, type, plan')
      .eq('id', directSessionId)
      .maybeSingle()

    if (sessionRecord) {
      dbSessionId = sessionRecord.id
      const resolvedType = ((sessionRecord.type as SessionType) ?? sessionType ?? 'chat') as SessionType
      sessionType = resolvedType
      sessionRoute = `${ROUTE_BY_TYPE[resolvedType]}/${sessionRecord.id}`
      plan = plan ?? (sessionRecord.plan as string | null) ?? plan
    }
  }

  let stripeCheckoutSession: any = null

  if (stripeSessionId) {
    try {
      const session = await stripe.checkout.sessions.retrieve(stripeSessionId)
      stripeCheckoutSession = session
      plan = plan ?? ((session.metadata as any)?.plan ?? null)
      amountTotal = session.amount_total ?? null
    } catch (error) {
      // Swallow errors - we will fall back to generic messaging below
    }

    if (supabaseAdmin) {
      let sessionRecordRes = await supabaseAdmin
        .from('sessions')
        .select('id, type, plan')
        .eq('stripe_session_id', stripeSessionId)
        .maybeSingle()

      if (!sessionRecordRes.error && !sessionRecordRes.data && stripeCheckoutSession) {
        const planKey = stripeCheckoutSession?.metadata?.plan as keyof typeof PRICING | undefined
        if (planKey && PRICING[planKey]) {
          try {
            const result = await fulfillCheckout(planKey as any, {
              stripeSessionId,
              intakeId:
                (stripeCheckoutSession?.metadata?.intake_id as string | undefined) ??
                (stripeCheckoutSession?.client_reference_id as string | undefined) ??
                null,
              supabaseUserId:
                typeof stripeCheckoutSession?.metadata?.supabase_user_id === 'string' &&
                stripeCheckoutSession?.metadata?.supabase_user_id
                  ? (stripeCheckoutSession.metadata.supabase_user_id as string)
                  : null,
              customerEmail:
                stripeCheckoutSession?.customer_details?.email ??
                (typeof stripeCheckoutSession?.metadata?.customer_email === 'string'
                  ? (stripeCheckoutSession.metadata.customer_email as string)
                  : null),
              amountTotal: (stripeCheckoutSession as any).amount_total ?? null,
              currency: (stripeCheckoutSession as any).currency ?? null,
              slotId:
                typeof stripeCheckoutSession?.metadata?.slot_id === 'string'
                  ? (stripeCheckoutSession.metadata.slot_id as string)
                  : null,
            })

            sessionRecordRes = {
              data: { id: result.sessionId, type: result.type, plan: planKey },
              error: null,
              status: 200,
              statusText: 'OK',
            } as typeof sessionRecordRes
          } catch {
            // ignore if fulfillment fallback fails
          }
        }
      }

      const sessionRecord = sessionRecordRes.data

      if (sessionRecord) {
        dbSessionId = sessionRecord.id
        const resolvedType = ((sessionRecord.type as SessionType) ?? sessionType ?? 'chat') as SessionType
        sessionType = resolvedType
        sessionRoute = `${ROUTE_BY_TYPE[resolvedType]}/${sessionRecord.id}`
        plan = plan ?? (sessionRecord.plan as string | null) ?? plan
      }
    }
  }

  if (!sessionRoute && dbSessionId && sessionType) {
    sessionRoute = `${ROUTE_BY_TYPE[sessionType]}/${dbSessionId}`
  }

  const planName = resolvePlanName(plan)
  const formattedAmount = amountTotal ? `$${(amountTotal / 100).toFixed(2)}` : null
  const startHref =
    sessionRoute ?? (stripeSessionId ? `/signup?session_id=${encodeURIComponent(stripeSessionId)}` : '/signup')

  return (
    <main className="mx-auto max-w-4xl rounded-[2.5rem] border border-slate-700 bg-slate-800/50 p-8 shadow-2xl backdrop-blur-sm lg:p-12">
      <div className="flex flex-col gap-10">
        <header className="rounded-2xl border border-slate-700 bg-slate-800/50 backdrop-blur-sm p-8 text-center shadow-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-200">Session confirmed</p>
          <h1 className="mt-4 text-3xl font-semibold text-white md:text-4xl">You are all set!</h1>
          <p className="mt-3 text-sm text-slate-300">
            {planName ? (
              <>
                {amountTotal !== null ? 'Payment confirmed for ' : 'Booked plan '}
                <span className="font-semibold text-white">{planName}</span>
                {formattedAmount ? ` - ${formattedAmount}` : ''}. We have emailed your receipt and session details.
              </>
            ) : (
              'We have received your booking. A confirmation email is on its way with everything you need to join.'
            )}
          </p>
        </header>

        <section className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 shadow-sm backdrop-blur-sm">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-center">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Next steps</h2>
              <ul className="space-y-3 text-sm text-slate-300">
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-orange-300" />
                  Check your inbox for the AskAutoDoctor confirmation email. It includes your join link and appointment summary.
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-orange-300" />
                  When you are ready, click <em>Start session now</em> to jump into the live workspace. You can rejoin at any time from the dashboard or email.
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-orange-300" />
                  Share the mechanic invite link with your trusted technician if you want them to attend alongside you.
                </li>
              </ul>
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-orange-400/30 bg-orange-500/10 p-6 text-sm text-orange-100 shadow-lg">
              <p className="text-xs font-semibold uppercase tracking-wide text-orange-200">Jump back in</p>
              <div className="flex flex-col gap-3">
                <Link
                  href={startHref}
                  className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition hover:from-orange-600 hover:to-red-700"
                >
                  Start session now
                </Link>
                <Link
                  href="/"
                  className="inline-flex items-center justify-center rounded-full border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-slate-600"
                >
                  Return home
                </Link>
              </div>
            </div>
          </div>
        </section>

        {dbSessionId && (
          <section className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 shadow-sm backdrop-blur-sm">
            <h2 className="text-lg font-semibold text-white">Invite your mechanic</h2>
            <p className="mt-2 text-sm text-slate-300">
              Share this secure join link so a certified mechanic or trusted shop can jump into the live workspace with you.
            </p>
            <div className="mt-4">
              <MechanicInvite sessionId={dbSessionId} />
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
