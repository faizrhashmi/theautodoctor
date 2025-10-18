import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen font-sans bg-white text-gray-900 scroll-smooth antialiased">
      {/* Enhanced Hero Section */}
      <section className="relative bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 overflow-hidden">
        {/* Animated Background Particles */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-blue-400 rounded-full animate-pulse opacity-30"></div>
          <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-cyan-400 rounded-full animate-pulse opacity-40"></div>
          <div className="absolute bottom-1/4 left-1/3 w-3 h-3 bg-white rounded-full animate-pulse opacity-20"></div>
          <div className="absolute top-1/2 right-1/4 w-1.5 h-1.5 bg-blue-300 rounded-full animate-pulse opacity-25"></div>
        </div>

        {/* Enhanced Grid Background */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)]"></div>
        </div>

        <div className="relative container mx-auto px-6 py-24 lg:py-32">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-16">
            {/* Enhanced Text Content */}
            <div className="lg:w-1/2 text-center lg:text-left space-y-10">
              <div className="space-y-8">
                {/* Enhanced Trust Badge */}
                <div className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border border-blue-400/40 rounded-2xl px-6 py-3 backdrop-blur-sm shadow-lg">
                  <div className="flex space-x-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <i key={star} className="fas fa-star text-yellow-400 text-sm" aria-hidden="true"></i>
                    ))}
                  </div>
                  <span className="text-blue-200 text-sm font-semibold">Trusted by 10,000+ Car Owners</span>
                </div>

                {/* Enhanced Headline */}
                <div className="space-y-6">
                  <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-tight tracking-tight">
                    Expert Auto
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 block animate-gradient bg-300%">
                      Mechanics
                    </span>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 block">
                      On Demand
                    </span>
                  </h1>

                  <p className="text-xl md:text-2xl text-gray-200 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-light">
                    Instant video consultations with certified mechanics. Diagnose issues, get repair advice, and pre‑purchase inspections from anywhere.
                  </p>
                </div>
              </div>

              {/* Enhanced Stats */}
              <div className="flex flex-wrap justify-center lg:justify-start gap-12 py-6">
                {[
                  { number: '5,000+', label: 'Cars Serviced', icon: 'fas fa-car' },
                  { number: '4.9/5', label: 'Customer Rating', icon: 'fas fa-star' },
                  { number: '24/7', label: 'Available', icon: 'fas fa-clock' }
                ].map((stat, index) => (
                  <div key={index} className="text-center group">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <i className={`${stat.icon} text-blue-400 text-lg`} aria-hidden="true"></i>
                      </div>
                      <div className="text-left">
                        <div className="text-2xl font-bold text-white">{stat.number}</div>
                        <div className="text-blue-200 text-sm font-medium">{stat.label}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Enhanced CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-5 justify-center lg:justify-start pt-6">
                <Link 
                  href="/book"
                  className="group relative bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold px-10 py-5 rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-2xl hover:shadow-blue-500/30 flex items-center gap-3 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                  <span className="relative">Book a Consultation</span>
                  <i className="fas fa-video group-hover:scale-110 transition-transform duration-300 relative" aria-hidden="true"></i>
                </Link>
                
                <Link 
                  href="/pricing"
                  className="group bg-white/10 backdrop-blur-lg border-2 border-white/20 hover:bg-white/20 hover:border-white/40 text-white font-semibold px-10 py-5 rounded-2xl transition-all duration-300 hover:shadow-2xl flex items-center gap-3"
                >
                  <span>View Pricing</span>
                  <i className="fas fa-arrow-right group-hover:translate-x-1 transition-transform duration-300" aria-hidden="true"></i>
                </Link>
              </div>
            </div>

            {/* Enhanced Image Section */}
            <div className="lg:w-1/2 flex justify-center lg:justify-end">
              <div className="relative">
                {/* Main Image Container */}
                <div className="relative z-10 bg-gradient-to-br from-blue-500/30 via-cyan-500/20 to-blue-600/30 rounded-3xl p-8 backdrop-blur-lg border border-white/20 shadow-2xl ring-2 ring-blue-400/20 hover:scale-[1.02] hover:ring-cyan-400/30 transition-all duration-500">
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-3xl blur opacity-30 group-hover:opacity-50 transition duration-1000"></div>
                  <img
                    src="/hero-bg.png"
                    alt="AutoDoctor App Interface showing video consultation with mechanic"
                    className="relative z-10 w-full max-w-md rounded-2xl shadow-2xl"
                  />
                </div>

                {/* Enhanced Floating Elements */}
                <div className="absolute -top-6 -right-6 w-28 h-28 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-3xl rotate-12 opacity-20 animate-float shadow-2xl"></div>
                <div className="absolute -bottom-8 -left-8 w-36 h-36 bg-gradient-to-br from-cyan-400 to-blue-400 rounded-4xl -rotate-12 opacity-15 animate-float-delayed shadow-2xl"></div>

                {/* Enhanced Status Card */}
                <div className="absolute -bottom-10 -left-10 bg-white rounded-3xl p-6 shadow-2xl border border-gray-200 hover:scale-105 transition-transform duration-300">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center">
                        <i className="fas fa-check text-green-600 text-xl" aria-hidden="true"></i>
                      </div>
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 text-lg">Mechanic Online</div>
                      <div className="text-green-600 text-sm font-semibold">Ready to connect</div>
                    </div>
                  </div>
                </div>

                {/* Additional Floating Card */}
                <div className="absolute -top-4 -right-20 bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-2xl p-4 shadow-2xl rotate-6 hover:rotate-0 transition-transform duration-300">
                  <div className="text-center">
                    <div className="text-2xl font-bold">15min</div>
                    <div className="text-blue-100 text-sm">Avg. Response</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Wave Divider */}
        <div className="absolute bottom-0 left-0 right-0 transform translate-y-1">
          <svg className="w-full h-20 text-white" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" opacity=".25" fill="currentColor"></path>
            <path d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z" opacity=".5" fill="currentColor"></path>
            <path d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z" fill="currentColor"></path>
          </svg>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
          <div className="animate-bounce">
            <i className="fas fa-chevron-down text-white/60 text-xl" aria-hidden="true"></i>
          </div>
        </div>
      </section>

      {/* Add this to your global CSS or Tailwind config for the gradient animation */}
      <style jsx>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient {
          animation: gradient 3s ease infinite;
          background-size: 200% 200%;
        }
      `}</style>
    </div>
  )
}