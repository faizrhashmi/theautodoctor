import { notFound, redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

export default async function SessionRouterPage({ params }: { params: { id: string } }) {
  const supabase = getSupabaseServer()
  const { data, error } = await supabase
    .from('sessions')
    .select('id, type')
    .eq('id', params.id)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    notFound()
  }

  switch (data.type) {
    case 'chat':
      redirect(`/chat/${data.id}`)
    case 'video':
      redirect(`/video/${data.id}`)
    case 'diagnostic':
      redirect(`/diagnostic/${data.id}`)
    default:
      redirect('/start')
  }
}
