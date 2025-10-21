'use client'

import { ClipboardList, CreditCard, MessageCircle, CheckCircle } from 'lucide-react'

const STEPS = [
  {
    icon: ClipboardList,
    title: 'Describe Your Issue',
    description: 'Tell us about your vehicle problem through our simple intake form',
    color: 'from-orange-500 to-red-600',
  },
  {
    icon: CreditCard,
    title: 'Choose Your Plan',
    description: 'Select from Quick Chat, Standard Video, or Full Diagnostic session',
    color: 'from-green-500 to-green-600',
  },
  {
    icon: MessageCircle,
    title: 'Connect with Mechanic',
    description: 'Get matched with an expert mechanic in minutes',
    color: 'from-purple-500 to-purple-600',
  },
  {
    icon: CheckCircle,
    title: 'Get Your Answer',
    description: 'Receive professional diagnosis and repair guidance',
    color: 'from-orange-500 to-orange-600',
  },
]

export default function ProcessSteps() {
  return (
    <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            How It Works
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Get expert automotive help in four simple steps
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {STEPS.map((step, index) => {
            const Icon = step.icon
            return (
              <div
                key={index}
                className="relative group"
              >
                {/* Connector line (hidden on mobile, last item) */}
                {index < STEPS.length - 1 && (
                  <div className="hidden lg:block absolute top-12 left-[60%] w-[80%] h-0.5 bg-gray-300" />
                )}

                <div className="relative bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-blue-200">
                  {/* Step number */}
                  <div className="absolute -top-4 -left-4 bg-gradient-to-r from-orange-600 to-red-700 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shadow-lg">
                    {index + 1}
                  </div>

                  {/* Icon */}
                  <div className={`bg-gradient-to-r ${step.color} w-16 h-16 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {step.title}
                  </h3>
                  <p className="text-gray-600">
                    {step.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
