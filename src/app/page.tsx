'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function Home() {
  const [navOpen, setNavOpen] = useState(false)

  return (
    <div className="min-h-screen overflow-x-hidden bg-white">
      {/* ===== NAVBAR ===== */}
      <header className="fixed w-full bg-white z-50 shadow-sm">
        <div className="container max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 text-white flex items-center justify-center rounded-full">A</div>
            <span className="text-xl font-semibold text-gray-900">AskAutoDoctor</span>
          </Link>
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/" className="text-gray-700 hover:text-blue-600 transition">Home</Link>
            <Link href="/pricing" className="text-gray-700 hover:text-blue-600 transition">Pricing</Link>
            <Link href="/book" className="text-gray-700 hover:text-blue-600 transition">Book</Link>
            <Link href="/booking" className="inline-flex items-center bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition">Book Now</Link>
          </nav>
          <button onClick={() => setNavOpen(!navOpen)} className="md:hidden text-gray-700 hover:text-blue-600 focus:outline-none">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={navOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16" } />
            </svg>
          </button>
        </div>
        {navOpen && (
          <nav className="md:hidden bg-white shadow-md">
            <div className="px-4 pt-2 pb-4 space-y-1">
              <Link href="/" className="block text-gray-700 hover:text-blue-600 transition">Home</Link>
              <Link href="/pricing" className="block text-gray-700 hover:text-blue-600 transition">Pricing</Link>
              <Link href="/book" className="block text-gray-700 hover:text-blue-600 transition">Book</Link>
              <Link href="/booking" className="block bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition">Book Now</Link>
            </div>
          </nav>
        )}
      </header>

      <main className="pt-16">
        {/* ===== HERO SECTION WITH BACKGROUND IMAGE ===== */}
        <section
          className="relative bg-cover bg-center bg-no-repeat text-white overflow-hidden"
          style={{ backgroundImage: "url('/hero-bg.jpg')" }}
        >
          {/* Overlay Gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 opacity-75 z-0" />

          {/* Hero Content */}
          <div className="relative z-10 flex flex-col items-center justify-center min-h-[90vh] px-4 sm:px-6 lg:px-8 text-center space-y-8">
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight max-w-3xl">
              Expert Mechanics <span className="block text-blue-400">Available on Demand</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-200 max-w-2xl mx-auto">
              Live video consultations with certified mechanics. Diagnose issues or inspect before buying — all online.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/booking" className="bg-blue-600 px-6 py-3 rounded-xl text-white font-semibold hover:bg-blue-700 transition-all">
                🚗 Book Now
              </Link>
              <Link href="/auth/mechanic-signup" className="bg-white text-blue-700 px-6 py-3 rounded-xl font-semibold hover:bg-blue-100 transition-all">
                🛠️ Join as Mechanic
              </Link>
            </div>
          </div>

          {/* SVG WAVE BACKGROUND */}
          <div className="absolute bottom-0 left-0 w-full leading-[0] z-0">
            <svg className="relative block w-full h-[100px]" viewBox="0 0 1200 120" preserveAspectRatio="none">
              <path d="M0,0V46.29C47.79,68.49,103.59,78.46,158,74.29C228.36,68.92,294.33,41,364.8,36.81C438.64,32.43,512.34,53.67,583,72.05C652.27,90.05,721.3,96.93,792.4,85.13C828.55,79.13,862.25,67.29,896.85,55.79C989.49,25,1113,-14.29,1200,52.47V0Z" fill="white" opacity="0.25"></path>
              <path d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05C99.41,111.27,165,111,224.58,91.58C255.73,81.43,284.67,65.51,314.25,51.78C355.17,32.78,398.98,5.78,445.08,2.11C481.34,-0.74,515.98,11.53,543.68,33.67C575.45,59.06,606,95.67,647.31,106.67C687.75,117.46,728.66,100.98,766.44,83.39C804.22,65.8,841.16,47.8,882.92,43.75C942.65,37.9,996.2,66.63,1051.82,82.59C1082.02,91.25,1110.82,88.76,1138.91,75.09C1161.34,64.2,1186.91,48.16,1199.56,25.85V0Z" fill="white" opacity="0.5"></path>
              <path d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57C518.83,34.93,560.06,22.45,603.44,16.11C662.44,7.48,715.92,28.35,769,51.51C827.93,77.22,886,95.24,951.2,90C1037.73,83,1123.66,44.29,1200,5.19V0Z" fill="white"></path>
            </svg>
          </div>
        </section>

        {/* ===== HOW IT WORKS FOR CUSTOMERS ===== */}
        <section className="bg-gray-100 py-20 px-4">
          <div className="container max-w-screen-xl mx-auto text-center space-y-12">
            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-gray-900">How It Works</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Get expert automotive help in just a few steps — all online, all from licensed professionals.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 text-left max-w-6xl mx-auto">
              {[
                ['📝', '1. Create an Account', 'Sign up or log in to access our mechanic network.'],
                ['🚗', '2. Submit Your Vehicle Info', 'Tell us about your vehicle and describe the issue. Upload photos if needed.'],
                ['📄', '3. Agree to Waiver', 'Confirm you understand this is a remote consultation for educational purposes.'],
                ['💳', '4. Make a Payment', 'Pay securely to confirm your booking.'],
                ['📞', '5. Connect with a Mechanic', 'A certified mechanic will contact you for a live video consultation.'],
                ['✅', '6. Get Expert Advice', 'Receive real-time guidance on diagnostics, repairs, or inspections.'],
              ].map(([icon, title, desc]) => (
                <div key={title} className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition">
                  <div className="text-3xl mb-4">{icon}</div>
                  <h3 className="text-lg font-semibold mb-2">{title}</h3>
                  <p className="text-gray-600">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== RED SEAL + VIDEO ===== */}
        <section className="bg-white py-20 px-4">
          <div className="container max-w-screen-xl mx-auto text-center space-y-10">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <img
                src="/red-seal.png"
                alt="Ontario Red Seal"
                className="h-16 sm:h-20 object-contain"
              />
              <p className="text-sm sm:text-base text-gray-700 max-w-md">
                All our mechanics are certified with the <strong>Red Seal Program</strong> in Ontario, ensuring high‑quality, licensed automotive advice.
              </p>
            </div>

            <div className="relative w-full max-w-4xl mx-auto overflow-hidden rounded-xl shadow-xl mt-8">
              <div className="relative pt-[56.25%]">
                <iframe
                  src="https://www.youtube.com/embed/wBSF7hFMCeE"
                  title="How AskAutoDoctor Works"
                  className="absolute top-0 left-0 w-full h-full rounded-xl"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            </div>
          </div>
        </section>

        {/* ===== WHY US SECTION ===== */}
        <section className="bg-gray-100 py-20">
          <div className="container max-w-screen-xl mx-auto px-4 text-center space-y-6">
            <h2 className="text-3xl font-bold text-gray-900">Why AskAutoDoctor?</h2>
            <div className="grid gap-8 md:grid-cols-3">
              {[
                ['📹', 'Video Consults', 'Talk to real mechanics face‑to‑face from your driveway.'],
                ['🚘', 'Vehicle Inspections', 'Pre‑purchase or post‑problem — we help you stay safe.'],
                ['💬', 'Instant Booking', 'Choose a time and connect within minutes.'],
              ].map(([icon, title, desc]) => (
                <div key={title} className="bg-white p-8 rounded-xl shadow-md border hover:shadow-xl transition">
                  <div className="text-4xl mb-4">{icon}</div>
                  <h3 className="text-xl font-semibold mb-2">{title}</h3>
                  <p className="text-gray-600">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== MECHANIC CTA ===== */}
        <section className="bg-blue-600 pt-20 pb-24 text-white">
          <div className="container max-w-screen-xl mx-auto px-4 text-center space-y-6">
            <h2 className="text-3xl font-bold">Are You a Certified Mechanic?</h2>
            <p className="max-w-xl mx-auto text-lg">
              Earn by helping car owners across Ontario. Set your availability, consult remotely, and get paid directly.
            </p>
            <Link
              href="/auth/mechanic-signup"
              className="inline-flex items-center gap-2 bg-white text-blue-700 px-6 py-3 rounded-xl font-semibold hover:bg-blue-100 transition"
            >
              🛠️ Sign Up as a Mechanic
            </Link>
          </div>
        </section>

        {/* ===== MOBILE STICKY CTA ===== */}
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 md:hidden">
          <Link
            href="/booking"
            className="bg-blue-600 text-white px-6 py-3 rounded-full shadow-xl font-semibold hover:bg-blue-700 transition-all"
          >
            🚗 Book Consultation
          </Link>
        </div>

        {/* ===== FOOTER ===== */}
        <footer className="bg-gray-100 py-10 text-center text-sm text-gray-600 px-4 mt-12">
          <p>© {new Date().getFullYear()} AskAutoDoctor. All rights reserved.</p>
          <p className="mt-2">This service is for educational purposes only. Not a substitute for in‑person diagnostics.</p>
        </footer>
      </main>
    </div>
  )
}
