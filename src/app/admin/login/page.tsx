// src/app/admin/login/page.tsx
import AdminLoginClient from './AdminLoginClient'

export const metadata = {
  title: 'Admin Login — AskAutoDoctor',
  description: 'Sign in to the AskAutoDoctor admin dashboard.',
}

type SearchParams = Promise<{ error?: string; next?: string }>

export default async function AdminLoginPage(props: { searchParams: SearchParams }) {
  const { error, next } = await props.searchParams
  // Redirect to the admin dashboard home page
  const redirectTo = next && next.startsWith('/admin') ? next : '/admin'

  return <AdminLoginClient redirectTo={redirectTo} initialError={error ? decodeURIComponent(error) : undefined} />
}