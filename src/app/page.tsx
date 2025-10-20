import Link from 'next/link'
import {
  Car,
  Shield,
  Clock,
  Award,
  Star,
  CheckCircle2,
  ArrowRight,
  MessageCircle,
  Video,
  Phone
} from 'lucide-react'
import ProcessSteps from '@/components/ui/ProcessSteps'
import ServiceCards from '@/components/ui/ServiceCards'

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 text-white overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Hero content */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 bg-blue-800/50 backdrop-blur-sm px-4 py-2 rounded-full border border-blue-400/30">
                <Award className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-medium">Certified Red Seal Mechanics</span>
              </div>

              <h1 className="text-5xl md:text-6xl font-bold leading-tight">
                Expert Auto Help,
                <span className="block text-blue-300">Right From Your Driveway</span>
              </h1>

              <p className="text-xl text-blue-100 leading-relaxed">
                Connect instantly with certified mechanics through text, video, or comprehensive diagnostic sessions. Get professional automotive advice without leaving home.
              </p>

              {/* Trust indicators */}
              <div className="flex flex-wrap items-center gap-6 pt-4">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="w-10 h-10 rounded-full bg-blue-700 border-2 border-white flex items-center justify-center text-sm font-bold">
                        {i === 1 ? '👨‍🔧' : i === 2 ? '👩‍🔧' : i === 3 ? '🧑‍🔧' : '👨‍🔧'}
                      </div>
                    ))}
                  </div>
                  <div className="text-sm">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map(i => (
                        <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-blue-200">500+ sessions completed</p>
                  </div>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link
                  href="/start"
                  className="group bg-white text-blue-900 px-8 py-4 rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all hover:scale-105 flex items-center justify-center gap-2"
                >
                  Book a Session
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="/how-it-works"
                  className="border-2 border-white text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                >
                  How It Works
                </Link>
              </div>
            </div>

            {/* Right: Visual elements */}
            <div className="relative hidden lg:block">
              <div className="relative">
                {/* Floating cards */}
                <div className="absolute -top-4 -right-4 bg-white text-gray-900 p-4 rounded-xl shadow-2xl animate-bounce" style={{ animationDuration: '3s' }}>
                  <div className="flex items-center gap-3">
                    <div className="bg-green-100 p-3 rounded-lg">
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="font-bold">Fast Response</p>
                      <p className="text-sm text-gray-600">Average 5 min wait</p>
                    </div>
                  </div>
                </div>

                <div className="absolute -bottom-8 -left-4 bg-white text-gray-900 p-4 rounded-xl shadow-2xl" style={{ animation: 'bounce 3s infinite 1.5s' }}>
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-3 rounded-lg">
                      <Shield className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-bold">100% Certified</p>
                      <p className="text-sm text-gray-600">Red Seal licensed</p>
                    </div>
                  </div>
                </div>

                {/* Main illustration placeholder */}
                <div className="bg-blue-800/30 backdrop-blur-sm rounded-2xl p-8 border-2 border-blue-400/30">
                  <Car className="w-full h-64 text-blue-300" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 w-full">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-16 md:h-24">
            <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" fill="white" opacity="1" />
          </svg>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="py-12 bg-gray-50 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { number: '500+', label: 'Sessions Completed' },
              { number: '50+', label: 'Certified Mechanics' },
              { number: '5 min', label: 'Average Wait Time' },
              { number: '4.9/5', label: 'Customer Rating' },
            ].map((stat) => (
              <div key={stat.label} className="space-y-2">
                <p className="text-4xl font-bold text-blue-600">{stat.number}</p>
                <p className="text-gray-600 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <ProcessSteps />

      {/* Services & Pricing */}
      <ServiceCards />

      {/* Why Choose Us */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why Choose AskAutoDoctor?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Professional automotive expertise at your fingertips
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Shield,
                title: 'Certified Experts',
                description: 'All mechanics are Red Seal certified with years of professional experience',
                color: 'from-blue-500 to-blue-600',
              },
              {
                icon: Clock,
                title: 'Available 24/7',
                description: 'Get help whenever you need it, day or night, weekends and holidays',
                color: 'from-green-500 to-green-600',
              },
              {
                icon: MessageCircle,
                title: 'Flexible Options',
                description: 'Choose text chat, video call, or comprehensive diagnostic sessions',
                color: 'from-purple-500 to-purple-600',
              },
            ].map((feature) => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.title}
                  className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-all border-2 border-transparent hover:border-blue-200"
                >
                  <div className={`bg-gradient-to-r ${feature.color} w-14 h-14 rounded-lg flex items-center justify-center mb-6`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Get Expert Help?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join hundreds of satisfied customers who trust AskAutoDoctor for their automotive needs
          </p>
          <Link
            href="/start"
            className="inline-flex items-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all hover:scale-105"
          >
            Book Your Session Now
            <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="mt-6 text-blue-200 text-sm">
            No commitment required • Cancel anytime • Money-back guarantee
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Car className="w-6 h-6 text-blue-400" />
                <span className="text-white font-bold text-lg">AskAutoDoctor</span>
              </div>
              <p className="text-sm">
                Professional automotive expertise, delivered remotely.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Services</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/pricing" className="hover:text-white transition-colors">Quick Chat</Link></li>
                <li><Link href="/pricing" className="hover:text-white transition-colors">Video Session</Link></li>
                <li><Link href="/pricing" className="hover:text-white transition-colors">Full Diagnostic</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/how-it-works" className="hover:text-white transition-colors">How It Works</Link></li>
                <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="/customer/login" className="hover:text-white transition-colors">Sign In</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <span>1-800-AUTO-DOC</span>
                </li>
                <li className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  <span>support@askautodoctor.com</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>© {new Date().getFullYear()} AskAutoDoctor. All rights reserved.</p>
            <p className="mt-2 text-gray-500">
              This service is for educational purposes only. Not a substitute for in-person diagnostics.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
