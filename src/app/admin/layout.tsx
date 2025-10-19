import type { ReactNode } from 'react'

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* ===== HEADER ===== */}
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-slate-900" />
            <h1 className="text-lg font-semibold">Its for Administrators</h1>
          </div>

          {/* ✅ Logout link that follows redirect automatically */}
          <a
            href="/api/admin/logout"
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Sign out
          </a>
        </div>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  )
}
