// src/app/admin/login/page.tsx
import Link from 'next/link'

export const metadata = {
  title: 'Admin Login — AskAutoDoctor',
  description: 'Sign in to the AskAutoDoctor admin dashboard.',
}

type SearchParams = Promise<{ error?: string; next?: string }>

export default async function AdminLoginPage(props: { searchParams: SearchParams }) {
  const { error, next } = await props.searchParams
  // Redirect to the actual admin intakes page that exists
  const redirect = next && next.startsWith('/admin') ? next : '/admin/intakes'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
      <div className="w-full max-w-md rounded-2xl bg-white shadow border border-slate-100 p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">Admin Panel</h1>
          <p className="text-sm text-slate-500 mt-1">Sign in to continue</p>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {decodeURIComponent(error)}
          </div>
        )}

        <form action="/api/admin/login" method="POST" className="space-y-4">
          <input type="hidden" name="redirect" value={redirect} />

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
              placeholder="admin@yourdomain.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-white font-medium hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            Sign in
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-slate-600 hover:text-slate-900">
            ← Back to site
          </Link>
        </div>
      </div>
    </div>
  )
}