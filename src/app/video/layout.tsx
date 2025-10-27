/**
 * Video Session Layout
 *
 * Full-screen layout for video sessions with NO navigation
 * to maximize screen space for video calls
 */

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export default function VideoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen w-full overflow-hidden">
      {children}
    </div>
  )
}
