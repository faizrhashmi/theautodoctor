import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = { 
  title: "AutoDoctor - Expert Auto Mechanics On Demand", 
  description: "Get instant video consultations with certified mechanics. Diagnose issues, get repair advice, and pre-purchase inspections from anywhere." 
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
        {children}
        <Footer />
      </body>
    </html>
  )
}

function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-6 text-center">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-xs">AD</span>
          </div>
          <h3 className="text-xl font-bold">AutoDoctor</h3>
        </div>
        <p>&copy; 2024 AutoDoctor. All rights reserved.</p>
        <p className="text-gray-400 mt-2">Professional auto consultations made simple</p>
        <div className="mt-4 text-gray-400">
          <p>Contact: support@askautodoctor.com</p>
        </div>
      </div>
    </footer>
  )
}