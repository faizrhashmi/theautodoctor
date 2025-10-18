import Link from 'next/link'

export default function Home() {
  return (
    <div className="pt-4">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-50 via-white to-indigo-50 overflow-hidden">
        <div className="container mx-auto px-4 flex flex-col lg:flex-row items-center py-24 lg:py-32">
          {/* Text column */}
          <div className="lg:w-1/2 mb-16 lg:mb-0 text-center lg:text-left space-y-6">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
              Expert Auto Mechanics <span className="text-blue-600 block">On Demand</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl leading-relaxed">
              Get instant video consultations with certified mechanics. Diagnose issues, get repair advice, and pre‑purchase inspections from anywhere.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
              <Link 
                href="/book" 
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-lg transition-all duration-300 transform hover:-translate-y-1 shadow-lg hover:shadow-xl text-center"
              >
                Book a Consultation
              </Link>
              <Link 
                href="/pricing" 
                className="border-2 border-gray-300 hover:border-blue-600 text-gray-700 hover:text-blue-600 font-semibold px-8 py-4 rounded-lg transition-all duration-300 hover:bg-blue-50 text-center"
              >
                View Pricing
              </Link>
            </div>
          </div>
          
          {/* Image column */}
          <div className="lg:w-1/2 flex justify-center lg:justify-end">
            <div className="relative">
              <img
                src="/hero-bg.png"
                alt="Automotive abstract background"
                className="w-full max-w-lg rounded-2xl shadow-2xl transform hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-blue-500 rounded-2xl -z-10"></div>
              <div className="absolute -top-6 -left-6 w-20 h-20 bg-indigo-300 rounded-xl -z-10"></div>
            </div>
          </div>
        </div>
        
        {/* Enhanced decorative elements */}
        <div className="absolute top-10 left-10 w-72 h-72 bg-blue-200 opacity-20 rounded-full filter blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-300 opacity-20 rounded-full filter blur-3xl"></div>
        <div className="absolute top-1/2 left-1/4 w-48 h-48 bg-purple-200 opacity-15 rounded-full filter blur-3xl"></div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              Why Choose AutoDoctor?
            </h2>
            <p className="text-lg text-gray-600">
              Experience the future of automotive care with our innovative platform
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {[
              {
                icon: "fas fa-video",
                title: "Video Consultations",
                description: "Connect with certified mechanics via video calls for real‑time diagnostics and instant solutions."
              },
              {
                icon: "fas fa-tools",
                title: "Expert Advice",
                description: "Get reliable repair guidance and parts recommendations tailored to your specific vehicle needs."
              },
              {
                icon: "fas fa-car-side",
                title: "Pre‑Purchase Inspections",
                description: "Make informed buying decisions with comprehensive vehicle checks and detailed inspection reports."
              }
            ].map((benefit, index) => (
              <div 
                key={index}
                className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-blue-100 group"
              >
                <div className="flex justify-center mb-6">
                  <div className="w-16 h-16 bg-blue-100 group-hover:bg-blue-600 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110">
                    <i className={`${benefit.icon} text-2xl text-blue-600 group-hover:text-white transition-colors duration-300`}></i>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4 text-center group-hover:text-blue-600 transition-colors duration-300">
                  {benefit.title}
                </h3>
                <p className="text-gray-600 text-center leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              How It Works
            </h2>
            <p className="text-lg text-gray-600">
              Get expert automotive advice in three simple steps
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 lg:gap-12 max-w-6xl mx-auto">
            {[
              {
                step: "1",
                title: "Choose Service",
                description: "Select from quick consults to full inspections based on your needs."
              },
              {
                step: "2",
                title: "Book Time Slot",
                description: "Pick a convenient time that works with your schedule."
              },
              {
                step: "3",
                title: "Video Consultation",
                description: "Join a video call and get expert diagnosis and advice."
              }
            ].map((step, index) => (
              <div 
                key={index}
                className="relative text-center group"
              >
                {/* Connecting line between steps */}
                {index < 2 && (
                  <div className="hidden md:block absolute top-12 left-1/2 w-full h-0.5 bg-blue-200 -z-10"></div>
                )}
                <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 group-hover:border-blue-200">
                  <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 font-bold text-xl group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    {step.step}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors duration-300">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}