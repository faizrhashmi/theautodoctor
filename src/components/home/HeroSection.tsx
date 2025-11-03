'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Wrench, Zap, Star, Play, Video, CheckCircle2, Shield } from 'lucide-react'
import MechanicPresenceIndicator from '@/components/realtime/MechanicPresenceIndicator'

export default function HeroSection() {
  return (
    <section className="relative isolate flex min-h-screen items-center overflow-hidden bg-slate-950">
      <div className="absolute inset-0 -z-10">
        <Image
          src="/images/mechanic-hero.jpg"
          alt="Professional auto mechanic workspace"
          className="object-cover object-center brightness-[0.72] saturate-[0.9]"
          fill
          priority
          sizes="100vw"
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.src =
              'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 1920 1080%22%3E%3Cdefs%3E%3ClinearGradient id=%22grad%22 x1=%220%25%22 y1=%220%25%22 x2=%22100%25%22 y2=%22100%25%22%3E%3Cstop offset=%220%25%22 style=%22stop-color:rgb(234,88,12);stop-opacity:0.35%22 /%3E%3Cstop offset=%2250%25%22 style=%22stop-color:rgb(14,23,42);stop-opacity:0.82%22 /%3E%3Cstop offset=%22100%25%22 style=%22stop-color:rgb(15,23,42);stop-opacity:0.95%22 /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill=%22url(%23grad)%22 width=%221920%22 height=%221080%22/%3E%3C/svg%3E'
            target.className = 'h-full w-full object-cover brightness-[0.65]'
          }}
        />
        <div
          className="absolute inset-0 bg-slate-950/75"
          style={{
            maskImage:
              'linear-gradient(90deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.9) 25%, rgba(0,0,0,0.65) 50%, rgba(0,0,0,0.35) 70%, rgba(0,0,0,0.1) 85%, rgba(0,0,0,0) 100%)',
            WebkitMaskImage:
              'linear-gradient(90deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.9) 25%, rgba(0,0,0,0.65) 50%, rgba(0,0,0,0.35) 70%, rgba(0,0,0,0.1) 85%, rgba(0,0,0,0) 100%)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/85 via-transparent to-slate-950/90" />
        <div className="absolute inset-y-0 left-0 w-[48%] bg-gradient-to-r from-slate-950 via-slate-950/75 to-transparent" />
        <div className="absolute -left-16 top-1/3 h-80 w-80 rounded-full bg-orange-500/25 blur-3xl" />
        <div className="absolute right-[-12%] top-1/4 h-[26rem] w-[26rem] rounded-full bg-amber-500/15 blur-[140px]" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-24 sm:px-8 lg:px-12">
        <div className="max-w-3xl space-y-6">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.35em] text-orange-200 backdrop-blur-sm">
            <Wrench className="h-3.5 w-3.5" />
            Virtual Auto Diagnostics
          </div>

          <h1 className="text-5xl font-bold leading-tight text-white drop-shadow-2xl md:text-6xl lg:text-7xl">
            Expert Auto Help
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-red-500 to-red-600">
              From Anywhere
            </span>
          </h1>

          <p className="text-lg leading-relaxed text-slate-200/90 md:text-xl">
            Connect with real certified mechanics and brand specialists instantly via HD video or chat. Get professional diagnostics,
            troubleshooting, and repair guidance without leaving home.
          </p>

          <div className="flex flex-col gap-4 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-red-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-orange-500/30 transition hover:from-orange-600 hover:to-red-700 hover:shadow-xl hover:shadow-orange-500/40"
            >
              Get Started Free
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="#how-it-works"
              className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-white/20 bg-white/5 px-8 py-4 text-base font-semibold text-white backdrop-blur transition hover:border-orange-400/50 hover:bg-orange-500/10"
            >
              <Play className="h-5 w-5" />
              How It Works
            </Link>
          </div>

          <div className="mt-8">
            <MechanicPresenceIndicator variant="dark" className="text-slate-200" />
          </div>
        </div>

        <div className="max-w-4xl space-y-10">
          {/* Promo box — small version, $0 removed */}
          <div className="relative max-w-sm">
            <div className="pointer-events-none absolute -inset-1 rounded-2xl bg-gradient-to-r from-orange-500 via-red-500 to-orange-500 opacity-70 blur-lg animate-pulse" />
            <div className="relative overflow-visible rounded-2xl border border-orange-500/50 bg-gradient-to-br from-orange-500/15 to-red-600/15 p-3 sm:p-4 backdrop-blur-md">
              <div className="absolute -top-4 left-6 flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-red-600 px-4 py-1 shadow-lg">
                <Zap className="h-4 w-4 text-white animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-white">Limited Time Offer</span>
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-xl font-bold text-white">FREE Trial Session</p>
                <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-orange-200/80">
                  Limited slots this month
                </p>
                <p className="text-xs text-orange-100/80">
                  Get expert help at zero cost while it lasts.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/15 bg-slate-950/60 p-5 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-600 shadow-lg shadow-orange-500/30">
                  <Video className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Live Video Sessions</p>
                  <p className="text-xs text-slate-300/90">HD troubleshooting within minutes</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/15 bg-slate-950/60 p-5 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-600">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Certified Professionals</p>
                  <p className="text-xs text-slate-300/90">Trusted and experienced mechanics</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/15 bg-slate-950/60 p-5 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30">
                  <CheckCircle2 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Money-Back Guarantee</p>
                  <p className="text-xs text-slate-300/90">100% satisfaction promise</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-8">
            <div>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-orange-400 text-orange-400" />
                ))}
              </div>
              <p className="mt-1 text-sm text-slate-300/90">500+ Happy Customers</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
