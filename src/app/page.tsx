import Link from 'next/link'

/*
 * Home page
 *
 * The landing page introduces visitors to AutoDoctor with a bold hero
 * section, highlights core benefits and walks through the simple three‑step
 * process.  A decorative abstract image reinforces the automotive theme
 * without relying on stock photos of real cars.  The hero is spaced down
 * to account for the fixed navigation bar.
 */
export default function Home() {
  return (
    <div className="pt-4">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-50 to-indigo-100 overflow-hidden">
        <div className="container flex flex-col lg:flex-row items-center py-20">
          {/* Text column */}
          <div className="lg:w-1/2 mb-12 lg:mb-0 text-center lg:text-left">
            <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 mb-6 leading-tight">
              Expert Auto Mechanics <span className="text-blue-600">On Demand</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Get instant video consultations with certified mechanics. Diagnose issues, get repair advice, and pre‑purchase inspections from anywhere.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link href="/book" className="btn-primary text-center">
                Book a Consultation
              </Link>
              <Link href="/pricing" className="btn-secondary text-center">
                View Pricing
              </Link>
            </div>
          </div>
          {/* Image column */}
          <div className="lg:w-1/2 flex justify-center">
            {/*
             * The image used here is an abstract automotive‑themed background.  To
             * display your own photo, place it in the `public` folder and update
             * the `src` below accordingly.  See the attached `hero-bg.png` file
             * included in this report for an example.
             */}
            <img
              src="/hero-bg.png"
              alt="Automotive abstract background"
              className="w-full max-w-md rounded-xl shadow-xl"
            />
          </div>
        </div>
        {/* Decorative blurred circles */}
        <div className="absolute -top-20 -left-20 w-80 h-80 bg-blue-300 opacity-30 rounded-full filter blur-3xl"></div>
        <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-indigo-400 opacity-30 rounded-full filter blur-3xl"></div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-white">
        <div className="container">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
            Why Choose AutoDoctor?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="card text-center">
              <div className="flex justify-center mb-4">
                <i className="fas fa-video fa-2x text-blue-600"></i>
              </div>
              <h3 className="text-xl font-semibold mb-2">Video Consultations</h3>
              <p className="text-gray-600">
                Connect with certified mechanics via video calls for real‑time diagnostics.
              </p>
            </div>
            <div className="card text-center">
              <div className="flex justify-center mb-4">
                <i className="fas fa-tools fa-2x text-blue-600"></i>
              </div>
              <h3 className="text-xl font-semibold mb-2">Expert Advice</h3>
              <p className="text-gray-600">
                Get reliable repair guidance and parts recommendations tailored to your vehicle.
              </p>
            </div>
            <div className="card text-center">
              <div className="flex justify-center mb-4">
                <i className="fas fa-car-side fa-2x text-blue-600"></i>
              </div>
              <h3 className="text-xl font-semibold mb-2">Pre‑Purchase Inspections</h3>
              <p className="text-gray-600">
                Make informed buying decisions with comprehensive vehicle checks and detailed reports.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gray-50">
        <div className="container">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="card text-center">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-xl">
                1
              </div>
              <h3 className="text-xl font-semibold mb-2">Choose Service</h3>
              <p className="text-gray-600">Select from quick consults to full inspections.</p>
            </div>
            <div className="card text-center">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-xl">
                2
              </div>
              <h3 className="text-xl font-semibold mb-2">Book Time Slot</h3>
              <p className="text-gray-600">Pick a convenient time with certified mechanics.</p>
            </div>
            <div className="card text-center">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-xl">
                3
              </div>
              <h3 className="text-xl font-semibold mb-2">Video Consultation</h3>
              <p className="text-gray-600">Join a video call and get expert diagnosis.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}