import Link from "next/link"

export default function Pricing() {
  const services = [
    { 
      name: "Quick Consult", 
      price: "$25", 
      duration: "15 min",
      features: ["Quick diagnosis", "Basic advice", "Troubleshooting tips"],
      popular: false
    },
    { 
      name: "Standard Consult", 
      price: "$45", 
      duration: "30 min",
      features: ["Detailed diagnosis", "Repair guidance", "Parts recommendations", "Priority support"],
      popular: true
    },
    { 
      name: "Pre-Purchase Inspection", 
      price: "$90", 
      duration: "60 min", 
      features: ["Comprehensive check", "Vehicle history analysis", "Price negotiation tips", "Detailed report"],
      popular: false
    }
  ]

  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Transparent Pricing</h1>
          <p className="text-xl text-gray-600">No hidden fees. Get expert advice at fair prices.</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {services.map((service, index) => (
            <div key={index} className={`relative bg-white rounded-2xl shadow-lg border-2 ${service.popular ? 'border-blue-500 scale-105' : 'border-gray-200'} transition-all duration-300`}>
              {service.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}
              <div className="p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{service.name}</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-gray-900">{service.price}</span>
                  <span className="text-gray-600 ml-2">/{service.duration}</span>
                </div>
                <ul className="space-y-3 mb-6">
                  {service.features.map((feature, i) => (
                    <li key={i} className="flex items-center text-gray-600">
                      <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link 
                  href="/book" 
                  className={`w-full block text-center py-3 px-6 rounded-lg font-semibold transition-colors ${
                    service.popular 
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  Book Now
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}