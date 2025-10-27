import { ReactNode } from 'react'
import WorkshopSidebar from '@/components/workshop/WorkshopSidebar'

export default function WorkshopLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <WorkshopSidebar />
      <main className="flex-1 lg:ml-64 transition-all duration-300">
        {children}
      </main>
    </div>
  )
}
