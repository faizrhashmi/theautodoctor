import Link from 'next/link'
import { Home, BarChart, DollarSign, FileText, Wrench, Calendar, Users } from 'lucide-react'

export default function MechanicFooter() {
  const currentYear = new Date().getFullYear()

  const footerLinks = {
    dashboard: [
      { label: 'Dashboard', href: '/mechanic/dashboard', icon: Home },
      { label: 'Sessions', href: '/mechanic/sessions', icon: Calendar },
      { label: 'Earnings', href: '/mechanic/earnings', icon: DollarSign },
    ],
    tools: [
      { label: 'Analytics', href: '/mechanic/analytics', icon: BarChart },
      { label: 'Statements', href: '/mechanic/statements', icon: FileText },
      { label: 'Job Recording', href: '/mechanic/job-recording', icon: Wrench },
    ],
    account: [
      { label: 'Profile', href: '/mechanic/profile', icon: Users },
      { label: 'Documents', href: '/mechanic/documents', icon: FileText },
      { label: 'Reviews', href: '/mechanic/reviews', icon: Users },
    ]
  }

  return (
    <footer className="bg-slate-950 border-t border-slate-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div>
            <h3 className="text-white font-bold text-lg mb-4">TheAutoDoctor</h3>
            <p className="text-slate-400 text-sm mb-4">
              Professional mechanic platform connecting you with customers across Canada.
            </p>
            <p className="text-slate-500 text-xs">
              Legally compliant independent contractor support system
            </p>
          </div>

          {/* Dashboard Links */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm">Dashboard</h4>
            <ul className="space-y-2">
              {footerLinks.dashboard.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="flex items-center gap-2 text-slate-400 hover:text-orange-500 transition-colors text-sm"
                  >
                    <link.icon className="w-4 h-4" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Tools Links */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm">Tools</h4>
            <ul className="space-y-2">
              {footerLinks.tools.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="flex items-center gap-2 text-slate-400 hover:text-orange-500 transition-colors text-sm"
                  >
                    <link.icon className="w-4 h-4" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account Links */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm">Account</h4>
            <ul className="space-y-2">
              {footerLinks.account.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="flex items-center gap-2 text-slate-400 hover:text-orange-500 transition-colors text-sm"
                  >
                    <link.icon className="w-4 h-4" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-500 text-sm">
            © {currentYear} TheAutoDoctor. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link href="/privacy" className="text-slate-500 hover:text-orange-500 transition-colors text-sm">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-slate-500 hover:text-orange-500 transition-colors text-sm">
              Terms of Service
            </Link>
            <Link href="/contact" className="text-slate-500 hover:text-orange-500 transition-colors text-sm">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
