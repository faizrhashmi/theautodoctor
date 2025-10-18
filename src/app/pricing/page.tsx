import Link from 'next/link'

/*
 * Pricing page
 *
 * Lists the available consultation packages along with their prices,
 * durations and included features.  The most popular tier is highlighted
 * with a badge and scaled slightly larger to draw the eye.  Users can
 * proceed directly to booking from any plan.
 */
export default function Pricing() {
  const plans = [
    {
      name: 'Quick Consult',
      price: '$25',
      duration: '15 min',
      features: [
        'Quick diagnosis',
        'Basic advice',
        'Troubleshooting tips',
      ],
      popular: false,
    },
    {
      name: 'Standard Consult',
      price: '$45',
      duration: '30 min',
      features: [
        'Detailed diagnosis',
        'Repair guidance',
        'Parts recommendations',
        'Priority support',
      ],
      popular: true,
    },
    {
      name: 'Pre‑Purchase Inspection',
      price: '$90',
      duration: '60 min',
      features: [
        'Comprehensive check',
        'Vehicle history analysis',
        'Price negotiation tips',
        'Detailed report',
      ],
      popular: false,
    },
  ]
  return (
    <div className="pt-4">
      <section className="bg-white py-20">
        <div className="container text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Transparent Pricing</h1>
          <p className="text-xl text-gray-600">No hidden fees. Get expert advice at fair prices.</p>
        </div>
        <div className="container grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, idx) => (
            <div
              key={idx}
              className={`relative bg-white rounded-3xl p-8 shadow-xl border-2 ${
                plan.popular ? 'border-blue-500 scale-105' : 'border-gray-200'
              } transition-transform`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
              <div className="mb-4">
                <span className="text-4xl font-extrabold text-gray-900">{plan.price}</span>
                <span className="text-gray-600 ml-2">/{plan.duration}</span>
              </div>
              <ul className="space-y-3 mb-6 text-left">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center text-gray-600">
                    <i className="fas fa-check text-green-500 mr-3"></i>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href="/book"
                className={`block text-center py-3 px-6 rounded-lg font-semibold transition-colors ${
                  plan.popular
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }`}
              >
                Book Now
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}