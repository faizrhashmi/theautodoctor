// @ts-nocheck
import { redirect } from 'next/navigation'

export default function IntakeRoutePage({ params }: { params: { id: string } }) {
  redirect(`/admin/intakes/${params.id}/details`)
}
