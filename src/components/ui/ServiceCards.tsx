'use client'

import Link from 'next/link'
import { MessageSquare, Video, FileSearch, Check } from 'lucide-react'

const PLANS = [
  {
    name: 'Quick Chat',
    icon: MessageSquare,
    price: '$9.99',
    duration: '15 minutes',
    description: 'Text-based consultation for quick questions',
    features: [
      'Real-time text chat',
      'Photo sharing',
      'Basic diagnosis',
      'Repair recommendations',
      'Chat transcript',
    ],
    popular: false,
    color: 'from-blue-500 to-blue-600',
  },
  {
    name: 'Standard Video',
    icon: Video,
    price: '$29.99',
    duration: '30 minutes',
    description: 'Live video session with a certified mechanic',
    features: [
      'Live video call',
      'Screen sharing',
      'Visual inspection',
      'Detailed diagnosis',
      'Step-by-step guidance',
      'Session recording',
    ],
    popular: true,
    color: 'from-green-500 to-green-600',
  },
  {
    name: 'Full Diagnostic',
    icon: FileSearch,
    price: '$49.99',
    duration: '60 minutes',
    description: 'Comprehensive diagnostic session with report',
    features: [
      'Extended video session',
      'In-depth analysis',
      'Multiple issues covered',
      'Written diagnostic report',
      'Repair cost estimates',
      'Follow-up support',
      'Priority scheduling',
    ],
    popular: false,
    color: 'from-purple-500 to-purple-600',
  },
]

export default function ServiceCards() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Service
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Flexible plans to match your needs and budget
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {PLANS.map((plan) => {
            const Icon = plan.icon
            return (
              <div
                key={plan.name}
                className={`relative bg-white rounded-2xl shadow-xl border-2 transition-all duration-300 hover:scale-105 ${
                  plan.popular
                    ? 'border-green-500 shadow-green-200'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                {/* Popular badge */}
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-1 rounded-full text-sm font-bold shadow-lg">
                    Most Popular
                  </div>
                )}

                <div className="p-8">
                  {/* Icon */}
                  <div className={`bg-gradient-to-r ${plan.color} w-16 h-16 rounded-xl flex items-center justify-center mb-4`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>

                  {/* Plan name */}
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {plan.name}
                  </h3>

                  {/* Duration */}
                  <p className="text-gray-600 mb-4">{plan.duration}</p>

                  {/* Price */}
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-gray-600 ml-2">per session</span>
                  </div>

                  {/* Description */}
                  <p className="text-gray-600 mb-6 min-h-[3rem]">
                    {plan.description}
                  </p>

                  {/* Features */}
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <Link
                    href="/signup"
                    className={`block text-center py-3 px-6 rounded-lg font-semibold transition-all ${
                      plan.popular
                        ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg hover:shadow-xl'
                        : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white'
                    }`}
                  >
                    Get Started
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
