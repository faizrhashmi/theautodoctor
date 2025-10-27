/**
 * Diagnostic Session Layout
 *
 * Full-screen layout for diagnostic sessions with NO navigation
 * to maximize screen space for video diagnostic interface
 */

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export default function DiagnosticLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen w-full overflow-hidden">
      {children}
    </div>
  )
}
