'use client'

import { useState } from 'react'

type WaiverModalProps = {
  isOpen: boolean
  onAccept: () => void
  onDecline: () => void
}

export default function WaiverModal({ isOpen, onAccept, onDecline }: WaiverModalProps) {
  const [hasScrolled, setHasScrolled] = useState(false)

  if (!isOpen) return null

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const element = e.currentTarget
    const isAtBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 50
    if (isAtBottom && !hasScrolled) {
      setHasScrolled(true)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-2xl font-bold text-slate-900">Terms of Service & Waiver</h2>
          <p className="mt-1 text-sm text-slate-600">Please read carefully before proceeding</p>
        </div>

        {/* Content */}
        <div
          onScroll={handleScroll}
          className="max-h-[60vh] overflow-y-auto px-6 py-4 text-sm text-slate-700"
        >
          <div className="space-y-6">
            {/* Age Requirement */}
            <section>
              <h3 className="mb-2 font-semibold text-slate-900">1. Age Requirement (18+)</h3>
              <p>
                By using AskAutoDoctor services, you confirm that you are at least 18 years of age. Our services are
                intended solely for adults. If you are under 18, you may not use our platform.
              </p>
            </section>

            {/* Service Description */}
            <section>
              <h3 className="mb-2 font-semibold text-slate-900">2. Service Description</h3>
              <p>
                AskAutoDoctor provides remote automotive diagnostic consultation services via text chat and video. Our
                mechanics provide professional advice based on the information you provide, but cannot physically
                inspect your vehicle.
              </p>
            </section>

            {/* Disclaimer of Liability */}
            <section>
              <h3 className="mb-2 font-semibold text-slate-900">3. Disclaimer of Liability</h3>
              <p className="mb-2">
                <strong>IMPORTANT:</strong> By using AskAutoDoctor, you acknowledge and agree that:
              </p>
              <ul className="ml-6 list-disc space-y-2">
                <li>
                  <strong>Remote Diagnosis Limitations:</strong> Our mechanics provide advice based on your description
                  and media. We cannot guarantee accuracy without physical inspection.
                </li>
                <li>
                  <strong>Not a Replacement for In-Person Service:</strong> Our consultations are supplementary and do
                  not replace professional in-person mechanical inspection and repair.
                </li>
                <li>
                  <strong>Follow Advice at Your Own Risk:</strong>{' '}
                  {"Any actions you take based on our mechanics' advice are done at your own risk. "}
                  {'We are not liable for damages, injuries, or losses resulting from following or not following the advice provided.'}
                </li>
                <li>
                  <strong>Vehicle Safety:</strong> If you suspect your vehicle is unsafe to operate, do not drive it.
                  Seek immediate professional assistance.
                </li>
                <li>
                  <strong>Emergency Situations:</strong> Do not use AskAutoDoctor for emergency situations. If your
                  vehicle poses an immediate safety risk, contact emergency services or a local mechanic immediately.
                </li>
              </ul>
            </section>

            {/* Limitation of Liability */}
            <section>
              <h3 className="mb-2 font-semibold text-slate-900">4. Limitation of Liability</h3>
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, ASKAUTODOCTOR, ITS MECHANICS, EMPLOYEES, AND AFFILIATES SHALL
                NOT BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING
                FROM:
              </p>
              <ul className="ml-6 mt-2 list-disc space-y-1">
                <li>Use or inability to use our services</li>
                <li>Vehicle damage or malfunction</li>
                <li>Personal injury or death</li>
                <li>Property damage</li>
                <li>Loss of profits or data</li>
                <li>Any other claims related to our services</li>
              </ul>
            </section>

            {/* User Responsibilities */}
            <section>
              <h3 className="mb-2 font-semibold text-slate-900">5. Your Responsibilities</h3>
              <p>You agree to:</p>
              <ul className="ml-6 mt-2 list-disc space-y-1">
                <li>Provide accurate and complete information about your vehicle and issues</li>
                <li>Use professional judgment when following advice</li>
                <li>Seek in-person professional inspection when necessary</li>
                <li>Not hold AskAutoDoctor liable for any outcomes</li>
                <li>Comply with all applicable laws and safety regulations</li>
              </ul>
            </section>

            {/* Payment & Refunds */}
            <section>
              <h3 className="mb-2 font-semibold text-slate-900">6. Payment & Refunds</h3>
              <p>
                All services are paid upfront via Stripe. Refunds are at our discretion and only provided in cases of
                technical failure preventing service delivery. Dissatisfaction with advice provided does not qualify
                for a refund.
              </p>
            </section>

            {/* Data & Privacy */}
            <section>
              <h3 className="mb-2 font-semibold text-slate-900">7. Data & Privacy</h3>
              <p>
                We collect and store your information (name, email, phone, vehicle data, chat history, uploaded media)
                to provide our services. We do not sell your data. Chat sessions may be reviewed for quality assurance.
              </p>
            </section>

            {/* Modifications */}
            <section>
              <h3 className="mb-2 font-semibold text-slate-900">8. Modifications to Terms</h3>
              <p>
                We reserve the right to modify these terms at any time. Continued use of our services after changes
                constitutes acceptance of the modified terms.
              </p>
            </section>

            {/* Governing Law */}
            <section>
              <h3 className="mb-2 font-semibold text-slate-900">9. Governing Law</h3>
              <p>
                These terms are governed by the laws of [Your Jurisdiction]. Any disputes shall be resolved in the
                courts of [Your Jurisdiction].
              </p>
            </section>

            {/* Contact */}
            <section>
              <h3 className="mb-2 font-semibold text-slate-900">10. Contact Us</h3>
              <p>
                Questions about these terms? Contact us at:{' '}
                <a href="mailto:legal@askautodoctor.com" className="text-orange-600 hover:underline">
                  legal@askautodoctor.com
                </a>
              </p>
            </section>

            {/* Acknowledgment */}
            <section className="rounded-lg bg-amber-50 p-4">
              <h3 className="mb-2 font-semibold text-amber-900">Acknowledgment</h3>
              <p className="text-amber-800">
                {'By clicking "I Accept", you acknowledge that you have read, understood, and agree to be bound by these Terms of Service and Waiver. '}
                {'You confirm that you are 18 years or older and that you will use AskAutoDoctor services at your own risk.'}
              </p>
            </section>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-6 py-4">
          {!hasScrolled && (
            <p className="mb-3 text-center text-xs text-amber-600">
              Warning: Please scroll to the bottom to read all terms
            </p>
          )}
          <div className="flex gap-3">
            <button
              onClick={onDecline}
              className="flex-1 rounded-lg border border-slate-300 px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Decline
            </button>
            <button
              onClick={onAccept}
              disabled={!hasScrolled}
              className="flex-1 rounded-lg bg-orange-600 px-4 py-3 font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              I Accept (18+)
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
