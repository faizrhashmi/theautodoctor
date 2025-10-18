import Link from 'next/link'

export default function Home() {
  return (
     <div className="min-h-screen bg-white">
      {/* 👇 Tailwind test bar — should show a blue bar with white text */}
      <div className="h-12 w-full bg-blue-600 text-white flex items-center justify-center">
        Tailwind is ON
      </div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
        <div className="container py-24 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Text */}
            <div className="space-y-8 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-600/20 px-4 py-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
                <span className="text-sm font-medium text-blue-200">Trusted by 10,000+ Car Owners</span>
              </div>

              <div className="space-y-6">
                <h1 className="leading-tight text-4xl md:text-5xl lg:text-6xl font-bold text-white">
                  Expert Auto Mechanics <span className="block text-blue-400">On Demand</span>
                </h1>
                <p className="max-w-2xl mx-auto lg:mx-0 text-xl leading-relaxed text-gray-300">
                  Get instant video consultations with certified mechanics. Diagnose issues, get repair advice, and pre-purchase inspections from anywhere, anytime.
                </p>
              </div>

              <div className="flex flex-wrap justify-center lg:justify-start gap-8">
                {[
                  ['5,000+', 'Cars Serviced'],
                  ['4.9/5', 'Customer Rating'],
                  ['24/7', 'Available'],
                ].map(([n, l]) => (
                  <div key={l} className="text-center lg:text-left">
                    <div className="text-2xl font-bold text-white">{n}</div>
                    <div className="text-sm text-gray-400">{l}</div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4">
                <Link
                  href="/book"
                  className="rounded-xl bg-blue-600 px-8 py-4 text-center font-bold text-white shadow-2xl transition-all duration-300 hover:scale-[1.02] hover:bg-blue-700"
                >
                  Book a Consultation
                </Link>
                <Link
                  href="/pricing"
                  className="rounded-xl border border-white/20 bg-white/10 px-8 py-4 text-center font-semibold text-white transition-all duration-300 hover:border-white/40 hover:bg-white/20"
                >
                  View Pricing Plans
                </Link>
              </div>
            </div>

            {/* Visual */}
            <div className="flex justify-center lg:justify-end">
              <div className="relative">
                <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 p-8 shadow-2xl backdrop-blur-sm">
                  <div className="flex h-64 w-80 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400/30 to-cyan-400/30">
                    <div className="text-center text-white">
                      <div className="mb-4 text-5xl">🚗</div>
                      <p className="mb-2 text-2xl font-bold">AutoDoctor</p>
                      <p className="text-blue-200">Video Consultation Platform</p>
                    </div>
                  </div>
                </div>

                <div className="absolute -bottom-6 -left-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100">
                      <span className="text-xl font-bold text-green-600">✓</span>
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">Mechanic Online</div>
                      <div className="text-sm font-medium text-green-600">Ready to connect</div>
                    </div>
                  </div>
                </div>

                <div className="absolute -top-4 -right-4 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 p-4 text-white shadow-2xl">
                  <div className="text-center">
                    <div className="text-2xl font-bold">15min</div>
                    <div className="text-sm text-blue-100">Avg. Response</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Wave (forced white) */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg className="h-16 w-full" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" opacity=".25" fill="#ffffff"></path>
            <path d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z" opacity=".5" fill="#ffffff"></path>
            <path d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z" fill="#ffffff"></path>
          </svg>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-white py-20">
        <div className="container">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <h2 className="mb-4 text-4xl font-bold text-gray-900">Why Choose AutoDoctor?</h2>
            <p className="text-xl text-gray-600">Professional automotive care at your fingertips</p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              { icon: '📹', title: 'Video Consultations', desc: 'Connect with certified mechanics via live video for real-time diagnostics and visual inspections.' },
              { icon: '🔧', title: 'Expert Repair Guidance', desc: 'Get professional advice, step-by-step instructions, and genuine parts recommendations.' },
              { icon: '🚗', title: 'Pre-Purchase Inspections', desc: 'Comprehensive vehicle checks with detailed reports before you buy.' },
            ].map((b) => (
              <div key={b.title} className="rounded-2xl border border-gray-100 bg-white p-8 shadow-lg transition-all duration-300 hover:border-blue-200 hover:shadow-xl">
                <div className="mb-6 text-4xl">{b.icon}</div>
                <h3 className="mb-4 text-2xl font-bold text-gray-900">{b.title}</h3>
                <p className="leading-relaxed text-gray-600">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-gray-50 py-20">
        <div className="container">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <h2 className="mb-4 text-4xl font-bold text-gray-900">How It Works</h2>
            <p className="text-xl text-gray-600">Get expert help in three simple steps</p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              ['1', 'Describe Your Issue', 'Tell us about your vehicle problem or select a service'],
              ['2', 'Book Your Session', 'Choose a convenient time with a certified mechanic'],
              ['3', 'Video Consultation', 'Join the video call and get expert diagnosis'],
            ].map(([n, t, d]) => (
              <div key={t} className="rounded-2xl bg-white p-8 text-center shadow-lg">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white">{n}</div>
                <h3 className="mb-4 text-xl font-bold text-gray-900">{t}</h3>
                <p className="text-gray-600">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
