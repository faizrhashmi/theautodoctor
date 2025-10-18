import type { Metadata } from 'next'
import './globals.css'
import Link from 'next/link'
import { motion } from 'framer-motion'

export const metadata: Metadata = {
  title: 'AutoDoctor • Premium Auto Consultations',
  description:
    'Luxury, on-demand auto diagnostics and pre-purchase inspections. Certified experts • Live video • Secure checkout.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <NavBar />
        {/* Smooth page transition container */}
        <motion.main
          className="flex-1 pt-20"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          {children}
        </motion.main>
        <Footer />
      </body>
    </html>
  )
}

/** Glass morphism, luxury header with subtle glow */
function NavBar() {
  return (
    <div className="fixed z-50 top-0 inset-x-0">
      <div className="container">
        <nav className="mt-4 glass rounded-2xl px-6 py-3 flex items-center justify-between shadow-xl">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-[radial-gradient(circle_at_30%_30%,#ffdf80,transparent_45%),_var(--grad-card)] border border-white/20 flex items-center justify-center">
              <span className="font-black text-[--lux-ink]">AD</span>
            </div>
            <div>
              <p className="text-lg font-extrabold leading-5">AutoDoctor</p>
              <p className="text-xs text-white/60 group-hover:text-white/80 transition">Premium Consultations</p>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <NavLink href="/">Home</NavLink>
            <NavLink href="/pricing">Pricing</NavLink>
            <NavLink href="/book">Book</NavLink>
            <NavLink href="/login">Login</NavLink>
            <Link href="/book" className="btn btn-primary">Book Now</Link>
          </div>
        </nav>
      </div>
    </div>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-white/80 hover:text-white transition relative">
      <span className="after:absolute after:-bottom-1 after:left-0 after:h-[2px] after:w-0 hover:after:w-full after:bg-[--lux-gold] after:transition-all">
        {children}
      </span>
    </Link>
  )
}

/** Professional footer with social links */
function Footer() {
  return (
    <footer className="mt-24 border-t border-white/10">
      <div className="container py-12">
        <div className="grid md:grid-cols-4 gap-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[radial-gradient(circle_at_30%_30%,#ffdf80,transparent_45%),_var(--grad-card)] border border-white/20 flex items-center justify-center">
                <span className="font-black text-[--lux-ink]">AD</span>
              </div>
              <div>
                <div className="font-extrabold">AutoDoctor</div>
                <div className="text-white/60 text-sm">Premium Auto Consultations</div>
              </div>
            </div>
            <p className="text-white/70 mt-4 text-sm">
              Certified experts • Video diagnostics • Pre-purchase inspections.
            </p>
          </div>

          <div>
            <h4 className="font-bold mb-3">Company</h4>
            <ul className="space-y-2 text-white/80 text-sm">
              <li><Link href="/pricing" className="hover:text-white">Pricing</Link></li>
              <li><Link href="/book" className="hover:text-white">Book a Session</Link></li>
              <li><Link href="/login" className="hover:text-white">Login</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-3">Trust & Safety</h4>
            <ul className="space-y-2 text-white/80 text-sm">
              <li>Secure Stripe Checkout</li>
              <li>LiveKit HD Video</li>
              <li>Supabase Authentication</li>
              <li>Encrypted Data at Rest</li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-3">Connect</h4>
            <div className="flex items-center gap-3">
              <a aria-label="Instagram" className="badge-ring p-2 hover:text-[--lux-gold]" href="https://instagram.com" target="_blank"><i className="fab fa-instagram"></i></a>
              <a aria-label="Twitter/X" className="badge-ring p-2 hover:text-[--lux-gold]" href="https://x.com" target="_blank"><i className="fab fa-x-twitter"></i></a>
              <a aria-label="LinkedIn" className="badge-ring p-2 hover:text-[--lux-gold]" href="https://linkedin.com" target="_blank"><i className="fab fa-linkedin-in"></i></a>
              <a aria-label="YouTube" className="badge-ring p-2 hover:text-[--lux-gold]" href="https://youtube.com" target="_blank"><i className="fab fa-youtube"></i></a>
            </div>
            <p className="text-white/70 text-sm mt-3">support@askautodoctor.com</p>
          </div>
        </div>

        <hr className="hr-soft my-8" />
        <div className="text-white/60 text-sm">© {new Date().getFullYear()} AutoDoctor. All rights reserved.</div>
      </div>
    </footer>
  )
}
