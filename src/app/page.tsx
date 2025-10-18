import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-20">
            
            {/* Text Content */}
            <div className="lg:w-1/2 text-center lg:text-left space-y-8">
              {/* Trust Badge */}
              <div className="inline-flex items-center gap-2 bg-blue-600/20 border border-blue-400/30 rounded-full px-4 py-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-blue-200 text-sm font-medium">Trusted by 10,000+ Car Owners</span>
              </div>

              {/* Main Headline */}
              <div className="space-y-6">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
                  Expert Auto Mechanics{' '}
                  <span className="text-blue-400 block">On Demand</span>
                </h1>
                
                <p className="text-xl text-gray-300 max-w-2xl leading-relaxed">
                  Get instant video consultations with certified mechanics. Diagnose issues, get repair advice, and pre‑purchase inspections from anywhere, anytime.
                </p>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap gap-8 py-4">
                <div className="text-center lg:text-left">
                  <div className="text-2xl font-bold text-white">5,000+</div>
                  <div className="text-gray-400 text-sm">Cars Serviced</div>
                </div>
                <div className="text-center lg:text-left">
                  <div className="text-2xl font-bold text-white">4.9/5</div>
                  <div className="text-gray-400 text-sm">Customer Rating</div>
                </div>
                <div className="text-center lg:text-left">
                  <div className="text-2xl font-bold text-white">24/7</div>
                  <div className="text-gray-400 text-sm">Available</div>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Link 
                  href="/book"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-4 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-2xl text-center"
                >
                  Book a Consultation
                </Link>
                <Link 
                  href="/pricing"
                  className="bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 text-white font-semibold px-8 py-4 rounded-xl transition-all duration-300 text-center"
                >
                  View Pricing Plans
                </Link>
              </div>
            </div>

            {/* Visual Content */}
            <div className="lg:w-1/2 flex justify-center lg:justify-end">
              <div className="relative">
                {/* Main Card */}
                <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl p-8 border border-white/10 shadow-2xl backdrop-blur-sm">
                  <div className="w-80 h-64 bg-gradient-to-br from-blue-400/30 to-cyan-400/30 rounded-xl flex items-center justify-center">
                    <div className="text-white text-center">
                      <div className="text-5xl mb-4">🚗</div>
                      <p className="text-2xl font-bold mb-2">AutoDoctor</p>
                      <p className="text-blue-200">Video Consultation Platform</p>
                    </div>
                  </div>
                </div>

                {/* Status Card */}
                <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl p-4 shadow-2xl border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                      <span className="text-green-600 text-xl font-bold">✓</span>
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">Mechanic Online</div>
                      <div className="text-green-600 text-sm font-medium">Ready to connect</div>
                    </div>
                  </div>
                </div>

                {/* Response Time Card */}
                <div className="absolute -top-4 -right-4 bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-2xl p-4 shadow-2xl">
                  <div className="text-center">
                    <div className="text-2xl font-bold">15min</div>
                    <div className="text-blue-100 text-sm">Avg. Response</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Wave Divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg className="w-full h-16 text-white" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" opacity=".25" fill="currentColor"></path>
            <path d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z" opacity=".5" fill="currentColor"></path>
            <path d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z" fill="currentColor"></path>
          </svg>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Choose AutoDoctor?</h2>
            <p className="text-xl text-gray-600">Professional automotive care at your fingertips</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: "📹",
                title: "Video Consultations",
                description: "Connect with certified mechanics via live video for real-time diagnostics and visual inspections."
              },
              {
                icon: "🔧", 
                title: "Expert Repair Guidance",
                description: "Get professional advice, step-by-step instructions, and genuine parts recommendations."
              },
              {
                icon: "🚗",
                title: "Pre-Purchase Inspections", 
                description: "Comprehensive vehicle checks with detailed reports before you make buying decisions."
              }
            ].map((benefit, index) => (
              <div 
                key={index}
                className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-blue-200"
              >
                <div className="text-4xl mb-6">{benefit.icon}</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">{benefit.title}</h3>
                <p className="text-gray-600 leading-relaxed">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-xl text-gray-600">Get expert help in three simple steps</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Describe Your Issue",
                description: "Tell us about your vehicle problem or select a service"
              },
              {
                step: "2", 
                title: "Book Your Session",
                description: "Choose a convenient time with a certified mechanic"
              },
              {
                step: "3",
                title: "Video Consultation", 
                description: "Join the video call and get expert diagnosis"
              }
            ].map((step, index) => (
              <div 
                key={index}
                className="bg-white p-8 rounded-2xl shadow-lg text-center"
              >
                <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-xl">
                  {step.step}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}