import { redirect } from 'next/navigation'

export default function IntakeDetailPage({ params }: { params: { id: string } }) {
  redirect(`/admin/intakes/${params.id}/details`)
}
