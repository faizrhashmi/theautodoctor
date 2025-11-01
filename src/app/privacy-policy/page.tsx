import Link from 'next/link'
import { Shield, FileText, Lock, Mail } from 'lucide-react'

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header */}
      <section className="border-b border-white/10 bg-slate-900/50">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-8 w-8 text-emerald-400" />
            <h1 className="text-3xl font-bold sm:text-4xl">Privacy Policy</h1>
          </div>
          <p className="text-slate-300">
            Last Updated: January 2025 | Effective Date: January 2025
          </p>
        </div>
      </section>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="prose prose-invert prose-slate max-w-none">

          {/* Introduction */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-white mb-4">Introduction</h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              The Auto Doctor Inc. ("we", "our", or "us") operates a digital platform connecting vehicle owners
              with automotive mechanics and repair workshops in Ontario, Canada. We are committed to protecting
              your personal information and your right to privacy.
            </p>
            <p className="text-slate-300 leading-relaxed mb-4">
              This Privacy Policy explains:
            </p>
            <ul className="list-disc pl-6 text-slate-300 space-y-2 mb-4">
              <li>What personal information we collect</li>
              <li>Why we collect it</li>
              <li>How we use it</li>
              <li>Who we share it with</li>
              <li>Your rights regarding your personal information</li>
            </ul>
            <div className="bg-emerald-500/10 border border-emerald-400/30 rounded-lg p-4">
              <p className="text-emerald-100 font-medium">
                By using The Auto Doctor platform, you consent to the collection, use, and disclosure of your
                personal information as described in this Privacy Policy.
              </p>
            </div>
          </section>

          {/* 1. Information We Collect */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
              <FileText className="h-6 w-6 text-emerald-400" />
              1. Information We Collect
            </h2>

            <h3 className="text-xl font-semibold text-white mt-6 mb-3">1.1 Personal Information You Provide</h3>
            <div className="bg-slate-800/50 rounded-lg p-6 mb-4">
              <h4 className="font-semibold text-white mb-2">Account Information:</h4>
              <ul className="list-disc pl-6 text-slate-300 space-y-1">
                <li>Full name, email address, phone number</li>
                <li>Password (encrypted)</li>
                <li>Profile photo (optional)</li>
              </ul>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-6 mb-4">
              <h4 className="font-semibold text-white mb-2">Vehicle Information:</h4>
              <ul className="list-disc pl-6 text-slate-300 space-y-1">
                <li>Make, model, year, VIN</li>
                <li>Mileage and service history</li>
                <li>Photos of your vehicle (if uploaded)</li>
              </ul>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-6 mb-4">
              <h4 className="font-semibold text-white mb-2">Payment Information:</h4>
              <p className="text-slate-300 mb-2">
                Payment is processed by Stripe Inc. (PCI-DSS Level 1 compliant)
              </p>
              <ul className="list-disc pl-6 text-slate-300 space-y-1">
                <li>We store only: customer ID, payment intent IDs, transaction history</li>
                <li className="font-semibold text-emerald-400">We DO NOT store credit card numbers, CVV, or banking credentials</li>
              </ul>
            </div>

            <h3 className="text-xl font-semibold text-white mt-6 mb-3">1.2 Information We Collect Automatically</h3>
            <div className="bg-slate-800/50 rounded-lg p-6">
              <p className="text-slate-300 mb-3">We collect usage data and location information when you use our platform:</p>
              <ul className="list-disc pl-6 text-slate-300 space-y-2">
                <li>Device type, browser, IP address</li>
                <li>GPS coordinates when you search for mechanics or request mobile service</li>
                <li>Session cookies (essential) and analytics cookies (can opt out)</li>
              </ul>
            </div>
          </section>

          {/* 2. How We Use Your Information */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
              <Lock className="h-6 w-6 text-emerald-400" />
              2. How We Use Your Information
            </h2>

            <div className="space-y-4">
              <div className="bg-slate-800/50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-2">Service Fulfillment (PIPEDA)</h3>
                <ul className="list-disc pl-6 text-slate-300 space-y-1">
                  <li>Match you with nearby mechanics and workshops</li>
                  <li>Facilitate diagnostic sessions (video, chat)</li>
                  <li>Process payments securely</li>
                  <li>Provide customer support</li>
                </ul>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-2">Platform Improvement</h3>
                <ul className="list-disc pl-6 text-slate-300 space-y-1">
                  <li>Analyze usage patterns to improve features</li>
                  <li>Develop new features based on user needs</li>
                  <li>Monitor platform performance</li>
                </ul>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-2">Communications</h3>
                <p className="text-slate-300 mb-3">
                  <strong className="text-white">Transactional</strong> (you cannot opt out):
                </p>
                <ul className="list-disc pl-6 text-slate-300 space-y-1 mb-3">
                  <li>Booking confirmations, session reminders, payment receipts</li>
                  <li>Security alerts and important account updates</li>
                </ul>
                <p className="text-slate-300 mb-3">
                  <strong className="text-white">Marketing</strong> (you can opt out anytime):
                </p>
                <ul className="list-disc pl-6 text-slate-300 space-y-1">
                  <li>Newsletter with automotive tips</li>
                  <li>New feature announcements and special promotions</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 3. How We Share Your Information */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-white mb-4">3. How We Share Your Information</h2>

            <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-yellow-100 mb-2">With Mechanics & Workshops</h3>
              <p className="text-yellow-100/80 mb-3">
                When you book a diagnostic session, we share with the assigned mechanic:
              </p>
              <ul className="list-disc pl-6 text-yellow-100/80 space-y-1">
                <li>Your name, phone number, email</li>
                <li>Your vehicle information</li>
                <li>Your location (city, postal code, or exact address if mobile service)</li>
                <li>Photos/videos and notes you provided</li>
              </ul>
              <p className="text-yellow-100 font-medium mt-3">
                Mechanics and workshops cannot use your information for their own marketing without your separate consent.
              </p>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-6 mb-4">
              <h3 className="text-lg font-semibold text-white mb-2">With Payment Processors</h3>
              <p className="text-slate-300">
                Stripe Inc. processes all payments. See their privacy policy at:
                <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 ml-1">
                  stripe.com/privacy
                </a>
              </p>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-2">For Legal Reasons</h3>
              <p className="text-slate-300 mb-2">We may disclose your information when required by law:</p>
              <ul className="list-disc pl-6 text-slate-300 space-y-1">
                <li>In response to subpoenas or court orders</li>
                <li>To comply with tax reporting obligations (CRA)</li>
                <li>To report suspected fraud to authorities</li>
              </ul>
            </div>
          </section>

          {/* 4. Data Retention */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-white mb-4">4. Data Retention</h2>

            <div className="overflow-x-auto">
              <table className="min-w-full border border-slate-700 rounded-lg overflow-hidden">
                <thead className="bg-slate-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-white border-b border-slate-700">Data Type</th>
                    <th className="px-4 py-3 text-left text-white border-b border-slate-700">Retention Period</th>
                  </tr>
                </thead>
                <tbody className="bg-slate-900/50">
                  <tr className="border-b border-slate-700/50">
                    <td className="px-4 py-3 text-slate-300">Account information</td>
                    <td className="px-4 py-3 text-slate-300">While account is active</td>
                  </tr>
                  <tr className="border-b border-slate-700/50">
                    <td className="px-4 py-3 text-slate-300">Diagnostic session data</td>
                    <td className="px-4 py-3 text-slate-300">1 year (anonymized after 2 years)</td>
                  </tr>
                  <tr className="border-b border-slate-700/50">
                    <td className="px-4 py-3 text-slate-300">Payment records</td>
                    <td className="px-4 py-3 text-slate-300">7 years (CRA requirement)</td>
                  </tr>
                  <tr className="border-b border-slate-700/50">
                    <td className="px-4 py-3 text-slate-300">Video recordings</td>
                    <td className="px-4 py-3 text-slate-300">90 days</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-slate-300">Inactive accounts</td>
                    <td className="px-4 py-3 text-slate-300">Deleted after 3 years of inactivity</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 5. Your Privacy Rights */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-white mb-4">5. Your Privacy Rights (PIPEDA)</h2>

            <div className="bg-emerald-500/10 border border-emerald-400/30 rounded-lg p-6 mb-6">
              <p className="text-emerald-100 mb-4">
                Under Canadian federal privacy law (PIPEDA), you have the following rights:
              </p>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-white mb-1">Right to Access</h3>
                  <p className="text-emerald-100/80 text-sm">
                    Request a copy of all personal information we hold about you
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-white mb-1">Right to Correction</h3>
                  <p className="text-emerald-100/80 text-sm">
                    Request correction of inaccurate or incomplete information
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-white mb-1">Right to Deletion</h3>
                  <p className="text-emerald-100/80 text-sm">
                    Request deletion of your personal information (subject to legal exceptions)
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-white mb-1">Right to Withdraw Consent</h3>
                  <p className="text-emerald-100/80 text-sm">
                    Unsubscribe from marketing communications at any time
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-2">How to Exercise Your Rights</h3>
              <p className="text-slate-300 mb-3">
                Visit your account settings or contact us at:
              </p>
              <p className="text-emerald-400 font-medium">privacy@theautodoctor.ca</p>
              <p className="text-slate-400 text-sm mt-2">We will respond within 30 days as required by PIPEDA</p>
            </div>
          </section>

          {/* 6. Referral Fee Disclosure */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-white mb-4">6. Referral Fee Disclosure (Competition Act)</h2>

            <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-100 mb-3">Important Transparency Notice</h3>
              <p className="text-blue-100/80 mb-4">
                When a virtual mechanic diagnoses your vehicle and recommends a workshop for repairs,
                that mechanic may receive a 5% referral bonus from the workshop if you proceed with the repair.
              </p>
              <p className="text-blue-100 font-medium mb-4">
                This DOES NOT increase your price. Workshops compete for your business by submitting competing quotes.
              </p>
              <div className="bg-blue-500/20 rounded-lg p-4">
                <p className="text-blue-100 font-semibold mb-2">Your Protection:</p>
                <ul className="list-disc pl-6 text-blue-100/80 space-y-1">
                  <li>You always see competing quotes from multiple workshops</li>
                  <li>You choose which workshop to use</li>
                  <li>Referral fees are capped at 5%</li>
                  <li>Mechanics who refer to poor-quality workshops are removed from our platform</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 7. Contact Information */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
              <Mail className="h-6 w-6 text-emerald-400" />
              7. Contact Information
            </h2>

            <div className="bg-slate-800/50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-3">Privacy Officer</h3>
              <p className="text-slate-300 mb-2">The Auto Doctor Inc.</p>
              <p className="text-slate-300 mb-4">Toronto, ON, Canada</p>

              <div className="space-y-2">
                <p className="text-slate-300">
                  <strong className="text-white">Email:</strong>{' '}
                  <a href="mailto:privacy@theautodoctor.ca" className="text-emerald-400 hover:text-emerald-300">
                    privacy@theautodoctor.ca
                  </a>
                </p>
                <p className="text-slate-300">
                  <strong className="text-white">General Support:</strong>{' '}
                  <a href="mailto:support@theautodoctor.ca" className="text-emerald-400 hover:text-emerald-300">
                    support@theautodoctor.ca
                  </a>
                </p>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-700">
                <p className="text-slate-400 text-sm">
                  Response Time: We will respond to all privacy requests within 30 days as required by PIPEDA
                </p>
              </div>
            </div>
          </section>

          {/* 8. File a Complaint */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-white mb-4">8. File a Privacy Complaint</h2>

            <div className="bg-slate-800/50 rounded-lg p-6">
              <p className="text-slate-300 mb-3">
                If you believe we have mishandled your personal information, you have the right to file a complaint with:
              </p>
              <div className="bg-slate-900/50 rounded-lg p-4">
                <p className="text-white font-semibold mb-2">Office of the Privacy Commissioner of Canada</p>
                <p className="text-slate-300 mb-1">Phone: 1-800-282-1376</p>
                <p className="text-slate-300">
                  Website:{' '}
                  <a
                    href="https://www.priv.gc.ca/en/report-a-concern/file-a-formal-privacy-complaint/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300"
                  >
                    priv.gc.ca
                  </a>
                </p>
              </div>
            </div>
          </section>

          {/* 9. Governing Law */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-white mb-4">9. Governing Law</h2>

            <div className="bg-slate-800/50 rounded-lg p-6">
              <p className="text-slate-300">
                This Privacy Policy is governed by the laws of Ontario and Canada, including:
              </p>
              <ul className="list-disc pl-6 text-slate-300 space-y-1 mt-3">
                <li>Personal Information Protection and Electronic Documents Act (PIPEDA)</li>
                <li>Canada's Anti-Spam Legislation (CASL)</li>
                <li>Ontario Consumer Protection Act</li>
              </ul>
            </div>
          </section>

        </div>

        {/* Footer CTA */}
        <div className="mt-12 pt-8 border-t border-white/10">
          <div className="text-center">
            <p className="text-slate-300 mb-4">
              Have questions about this privacy policy?
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
