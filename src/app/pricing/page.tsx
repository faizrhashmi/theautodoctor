import Link from 'next/link'
import ServiceCards from '@/components/ui/ServiceCards'
import { Shield, Clock, MessageCircle, Check, HelpCircle, ArrowRight } from 'lucide-react'

export const metadata = {
  title: 'Services & Pricing | AskAutoDoctor',
  description:
    'Transparent pricing for virtual mechanic consultations. Choose from text chat, video calls, or comprehensive diagnostic sessions.',
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-700 text-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Services & Pricing
          </h1>
          <p className="text-xl text-blue-100 leading-relaxed max-w-2xl mx-auto">
            Transparent pricing. Professional service. No hidden fees. Choose the plan that fits your needs.
          </p>
        </div>
      </section>

      {/* Service Cards */}
      <ServiceCards />

      {/* Comparison Table */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Compare Plans
            </h2>
            <p className="text-xl text-gray-600">
              All plans include certified mechanics and professional service
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold">Feature</th>
                  <th className="px-6 py-4 text-center font-semibold">Quick Chat</th>
                  <th className="px-6 py-4 text-center font-semibold">Standard Video</th>
                  <th className="px-6 py-4 text-center font-semibold">Full Diagnostic</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {[
                  { feature: 'Session Duration', chat: '15 min', video: '30 min', diagnostic: '60 min' },
                  { feature: 'Certified Mechanic', chat: true, video: true, diagnostic: true },
                  { feature: 'Text Chat', chat: true, video: true, diagnostic: true },
                  { feature: 'Live Video Call', chat: false, video: true, diagnostic: true },
                  { feature: 'Screen Sharing', chat: false, video: true, diagnostic: true },
                  { feature: 'Photo Sharing', chat: true, video: true, diagnostic: true },
                  { feature: 'Session Transcript', chat: true, video: true, diagnostic: true },
                  { feature: 'Video Recording', chat: false, video: true, diagnostic: true },
                  { feature: 'Written Report', chat: false, video: false, diagnostic: true },
                  { feature: 'Repair Estimates', chat: false, video: true, diagnostic: true },
                  { feature: 'Follow-up Support', chat: false, video: false, diagnostic: true },
                  { feature: 'Priority Scheduling', chat: false, video: false, diagnostic: true },
                ].map((row, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 font-medium text-gray-900">{row.feature}</td>
                    <td className="px-6 py-4 text-center">
                      {typeof row.chat === 'boolean' ? (
                        row.chat ? (
                          <Check className="w-5 h-5 text-green-500 mx-auto" />
                        ) : (
                          <span className="text-gray-300">—</span>
                        )
                      ) : (
                        <span className="text-gray-700">{row.chat}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {typeof row.video === 'boolean' ? (
                        row.video ? (
                          <Check className="w-5 h-5 text-green-500 mx-auto" />
                        ) : (
                          <span className="text-gray-300">—</span>
                        )
                      ) : (
                        <span className="text-gray-700">{row.video}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {typeof row.diagnostic === 'boolean' ? (
                        row.diagnostic ? (
                          <Check className="w-5 h-5 text-green-500 mx-auto" />
                        ) : (
                          <span className="text-gray-300">—</span>
                        )
                      ) : (
                        <span className="text-gray-700">{row.diagnostic}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <HelpCircle className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-6">
            {[
              {
                question: 'How quickly can I connect with a mechanic?',
                answer: 'Most customers connect within 5 minutes. Our mechanics are available 24/7 to help you.',
              },
              {
                question: 'Are all mechanics certified?',
                answer: 'Yes! All our mechanics are Red Seal certified with years of professional automotive experience.',
              },
              {
                question: 'What if I need more time?',
                answer: 'You can extend your session or book a follow-up appointment. We\'re here to help until your issue is resolved.',
              },
              {
                question: 'Do you offer refunds?',
                answer: 'Yes, we offer a money-back guarantee if you\'re not satisfied with the service. Contact us within 24 hours of your session.',
              },
              {
                question: 'Can I get help for any type of vehicle?',
                answer: 'We cover most cars, trucks, and SUVs. Our mechanics have experience with domestic and foreign vehicles.',
              },
              {
                question: 'Is this a replacement for in-person repairs?',
                answer: 'No, our service provides expert diagnosis and guidance. You\'ll still need a local mechanic for hands-on repairs, but we\'ll help you understand what needs to be done.',
              },
            ].map((faq, idx) => (
              <div key={idx} className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {faq.question}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Get Expert Help?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Book your session now and get professional automotive advice within minutes
          </p>
          <Link
            href="/start"
            className="inline-flex items-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all hover:scale-105"
          >
            Sign Up
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
