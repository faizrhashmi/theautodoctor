import type { Metadata } from 'next'

export const metadata: Metadata = { 
  title: "Ask Auto Doctor", 
  description: "Online auto diagnostics" 
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">{children}</body>
    </html>
  )
}