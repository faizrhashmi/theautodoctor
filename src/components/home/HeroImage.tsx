'use client'

import { Video, CheckCircle2 } from 'lucide-react'

export default function HeroImage() {
  return (
    <div className="relative flex items-center justify-center">
      <div className="relative w-full">
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-orange-500/20 to-red-600/20 blur-3xl" />

        {/* Main Image Container */}
        <div className="relative rounded-3xl border border-white/10 bg-gradient-to-br from-slate-800/50 to-slate-900/50 overflow-hidden backdrop-blur">
          {/* Hero Image */}
          <div className="relative h-80 w-full overflow-hidden rounded-t-3xl">
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent z-10" />
            <img
              src="/images/mechanic-hero.jpg"
              alt="Professional mechanic providing virtual diagnostic service"
              className="h-full w-full object-cover"
              onError={(e) => {
                // Fallback to a beautiful gradient with icon if image not found
                const target = e.currentTarget as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  parent.innerHTML = `
                    <div class="flex h-full w-full items-center justify-center bg-gradient-to-br from-orange-600 to-red-700">
                      <div class="text-center px-8">
                        <svg class="mx-auto h-24 w-24 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <p class="mt-4 text-xl text-white/90 font-semibold">Virtual Auto Diagnostics</p>
                        <p class="text-white/70">Expert Help From Home</p>
                      </div>
                    </div>
                  `;
                }
              }}
            />
          </div>

          {/* Feature Badges Below Image */}
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-600 shadow-lg">
                <Video className="h-7 w-7 text-white" />
              </div>
              <div>
                <p className="font-semibold text-white">Live Video Session</p>
                <p className="text-sm text-slate-400">Connect in seconds</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-red-600 to-red-800 border border-red-500/30 shadow-lg">
                <img
                  src="https://www.red-seal.ca/images/redsealmapleleafbilingual-eng.png"
                  alt="Red Seal"
                  className="h-9 w-9 object-contain"
                />
              </div>
              <div>
                <p className="font-semibold text-white">Red Seal Certified</p>
                <p className="text-sm text-slate-400">Licensed mechanics only</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg">
                <CheckCircle2 className="h-7 w-7 text-white" />
              </div>
              <div>
                <p className="font-semibold text-white">Money-Back Guarantee</p>
                <p className="text-sm text-slate-400">100% satisfaction</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
