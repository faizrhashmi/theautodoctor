import Link from 'next/link'
import {
  UserPlus,
  ClipboardList,
  FileCheck,
  CreditCard,
  Video,
  CheckCircle,
  ArrowRight,
  MessageCircle,
  Shield,
  Clock
} from 'lucide-react'

export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-700 text-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            How It Works
          </h1>
          <p className="text-xl text-blue-100 leading-relaxed max-w-2xl mx-auto">
            Get professional automotive help in six simple steps. From signup to expert diagnosis, we make it easy.
          </p>
        </div>
      </section>

      {/* Step-by-Step Process */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-16">
            {/* Step 1 */}
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="flex-shrink-0">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg">
                  <UserPlus className="w-8 h-8 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-sm font-bold">
                    Step 1
                  </span>
                  <h2 className="text-2xl font-bold text-gray-900">Create Your Account</h2>
                </div>
                <p className="text-gray-600 text-lg leading-relaxed mb-4">
                  Sign up with your email and create a secure account. We'll need you to confirm you're 18+ and agree to our service terms. Your privacy and security are our top priorities.
                </p>
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                  <p className="text-sm text-gray-700">
                    <strong>Why we need this:</strong> Age verification and legal agreements protect both you and our mechanics, ensuring professional service standards.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="flex-shrink-0">
                <div className="bg-gradient-to-r from-green-500 to-green-600 w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg">
                  <ClipboardList className="w-8 h-8 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <span className="bg-green-100 text-green-600 px-3 py-1 rounded-full text-sm font-bold">
                    Step 2
                  </span>
                  <h2 className="text-2xl font-bold text-gray-900">Submit Vehicle Information</h2>
                </div>
                <p className="text-gray-600 text-lg leading-relaxed mb-4">
                  Tell us about your vehicle - make, model, year, and mileage. Describe the issue you're experiencing in detail. The more information you provide, the better we can help.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-gray-700">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Upload photos or videos of the issue</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-700">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Include any warning lights or error codes</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-700">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Mention recent repairs or maintenance</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="flex-shrink-0">
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg">
                  <FileCheck className="w-8 h-8 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <span className="bg-purple-100 text-purple-600 px-3 py-1 rounded-full text-sm font-bold">
                    Step 3
                  </span>
                  <h2 className="text-2xl font-bold text-gray-900">Agree to Service Waiver</h2>
                </div>
                <p className="text-gray-600 text-lg leading-relaxed mb-4">
                  Review and accept our service agreement. This confirms you understand that our remote consultations are for educational and advisory purposes only.
                </p>
                <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded">
                  <p className="text-sm text-gray-700">
                    <strong>Important:</strong> Our mechanics provide expert guidance, but cannot physically inspect your vehicle. Always consult a local mechanic for hands-on repairs.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="flex-shrink-0">
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg">
                  <CreditCard className="w-8 h-8 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-sm font-bold">
                    Step 4
                  </span>
                  <h2 className="text-2xl font-bold text-gray-900">Choose Your Plan & Pay</h2>
                </div>
                <p className="text-gray-600 text-lg leading-relaxed mb-4">
                  Select the service that best fits your needs and complete secure payment through Stripe.
                </p>
                <div className="grid md:grid-cols-3 gap-4 mt-4">
                  <div className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-colors">
                    <MessageCircle className="w-6 h-6 text-blue-500 mb-2" />
                    <h4 className="font-bold text-gray-900 mb-1">Quick Chat</h4>
                    <p className="text-sm text-gray-600">15 min • $9.99</p>
                  </div>
                  <div className="border-2 border-green-500 rounded-lg p-4 bg-green-50">
                    <Video className="w-6 h-6 text-green-600 mb-2" />
                    <h4 className="font-bold text-gray-900 mb-1">Standard Video</h4>
                    <p className="text-sm text-gray-600">30 min • $29.99</p>
                    <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">Popular</span>
                  </div>
                  <div className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-colors">
                    <ClipboardList className="w-6 h-6 text-purple-500 mb-2" />
                    <h4 className="font-bold text-gray-900 mb-1">Full Diagnostic</h4>
                    <p className="text-sm text-gray-600">60 min • $49.99</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 5 */}
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="flex-shrink-0">
                <div className="bg-gradient-to-r from-cyan-500 to-cyan-600 w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg">
                  <Video className="w-8 h-8 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <span className="bg-cyan-100 text-cyan-600 px-3 py-1 rounded-full text-sm font-bold">
                    Step 5
                  </span>
                  <h2 className="text-2xl font-bold text-gray-900">Connect with a Mechanic</h2>
                </div>
                <p className="text-gray-600 text-lg leading-relaxed mb-4">
                  A certified Red Seal mechanic will join your session within minutes. You'll receive a notification when they're ready to connect.
                </p>
                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div className="flex items-start gap-3">
                    <Clock className="w-6 h-6 text-cyan-500 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Fast Response</h4>
                      <p className="text-sm text-gray-600">Average wait time: 5 minutes</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Shield className="w-6 h-6 text-cyan-500 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Certified Experts</h4>
                      <p className="text-sm text-gray-600">All Red Seal licensed</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 6 */}
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="flex-shrink-0">
                <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <span className="bg-yellow-100 text-yellow-600 px-3 py-1 rounded-full text-sm font-bold">
                    Step 6
                  </span>
                  <h2 className="text-2xl font-bold text-gray-900">Get Expert Advice</h2>
                </div>
                <p className="text-gray-600 text-lg leading-relaxed mb-4">
                  Receive real-time professional guidance. Your mechanic will diagnose the issue, explain what's wrong, and recommend next steps.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-gray-700">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Detailed explanation of the problem</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-700">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Repair recommendations and cost estimates</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-700">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Session transcript for your records</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-700">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Option to book follow-up sessions</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              What Makes Us Different
            </h2>
            <p className="text-xl text-gray-600">
              Professional automotive expertise, delivered remotely
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: 'Certified Professionals',
                description: 'All our mechanics are Red Seal certified with years of hands-on experience in automotive repair and diagnostics.',
                icon: Shield,
              },
              {
                title: 'Flexible Sessions',
                description: 'Choose from text chat, video calls, or comprehensive diagnostic sessions based on your needs and budget.',
                icon: MessageCircle,
              },
              {
                title: 'Available Anytime',
                description: 'Get help when you need it most. Our mechanics are available 24/7, including weekends and holidays.',
                icon: Clock,
              },
            ].map((feature) => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.title}
                  className="bg-white rounded-xl p-8 shadow-md hover:shadow-lg transition-all"
                >
                  <Icon className="w-12 h-12 text-blue-600 mb-4" />
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

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join hundreds of satisfied customers who trust AskAutoDoctor for expert automotive advice
          </p>
          <Link
            href="/start"
            className="inline-flex items-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all hover:scale-105"
          >
            Book Your First Session
            <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="mt-6 text-blue-200 text-sm">
            No commitment required • Cancel anytime • Money-back guarantee
          </p>
        </div>
      </section>
    </div>
  )
}
