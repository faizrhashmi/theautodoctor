"use client";

import Link from "next/link";
import { CheckCircle2, Wrench, ShieldCheck, Clock, Video, BadgeCheck, Sparkles, Globe2, Users } from "lucide-react";
import { motion } from "framer-motion";

// If you use Next.js App Router, you can optionally export metadata from a sibling layout or this page file.
// export const metadata = {
//   title: "About Us — AskAutoDoctor",
//   description:
//     "AskAutoDoctor connects drivers with certified mechanics for live video consultations, digital inspections, and unbiased advice—anytime, anywhere.",
// };

export default function AboutPage() {
  const features = [
    {
      icon: BadgeCheck,
      title: "Certified & Verified Mechanics Only",
      desc: "Every mechanic is vetted, experienced, and highly trained.",
    },
    {
      icon: Video,
      title: "Live Video + Real Diagnostics",
      desc: "Not just chat—show and see in real time within minutes.",
    },
    {
      icon: ShieldCheck,
      title: "Honest Advice, No Upselling",
      desc: "We don’t profit from repairs, so our guidance stays 100% unbiased.",
    },
    {
      icon: Sparkles,
      title: "Clear, Simple Explanations",
      desc: "We translate ‘mechanic language’ into plain English.",
    },
    {
      icon: Clock,
      title: "Fair & Transparent Pricing",
      desc: "Flat fees. No hidden charges. No surprises.",
    },
  ];

  const helpList = [
    "Real certified mechanics (not AI, not forums)",
    "Honest advice before you spend money",
    "Second opinions on shop estimates",
    "Help reading warning lights, sounds, leaks & codes",
    "Pre‑purchase and remote vehicle inspections",
    "Guidance for DIY repairs or maintenance",
    "Support for ICE, Hybrid & EV vehicles",
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:py-24 lg:py-28">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="grid items-center gap-10 lg:grid-cols-2"
          >
            <div className="space-y-6 text-center lg:text-left">
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-700/30 px-4 py-2 text-blue-100">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                About Us
              </span>

              <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl md:text-5xl">
                AskAutoDoctor — Real Answers from Certified Mechanics
              </h1>
              <p className="text-base leading-relaxed text-blue-100 sm:text-lg">
                We make professional automotive help accessible, affordable, and effortless—anytime, anywhere.
              </p>

              <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-start">
                <Link
                  href="/start"
                  className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  Get Help Now
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  View Pricing
                </Link>
              </div>
            </div>

            <div className="relative hidden lg:block">
              <div className="absolute -inset-10 -z-10 rounded-[2.5rem] bg-gradient-to-tr from-emerald-400/30 via-cyan-400/20 to-sky-400/10 blur-3xl" />
              <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/30 backdrop-blur">
                <ul className="space-y-3 text-blue-100">
                  {helpList.map((t) => (
                    <li key={t} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== MISSION ===== */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid items-start gap-10 md:grid-cols-3">
          <div className="md:col-span-2 space-y-5">
            <h2 className="text-2xl font-bold text-slate-900">Our Mission</h2>
            <p className="text-slate-700">
              For years, vehicle owners have struggled with one common problem: <em>“I don’t know what’s wrong with my car, and I don’t know who to trust.”</em>
              We are changing that—by connecting drivers directly with licensed & certified mechanics through live video consultations, digital inspections, and step‑by‑step guidance.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <div className="flex items-center gap-3">
              <Wrench className="h-5 w-5" />
              <p className="font-semibold">Built by Industry Pros</p>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              Decades of dealership & independent shop experience across diagnostics, repairs, service management, and customer care.
            </p>
          </div>
        </div>
      </section>

      {/* ===== WHO WE ARE / WHY WE EXIST ===== */}
      <section className="mx-auto max-w-7xl px-6 pb-4">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 p-8">
            <h3 className="text-xl font-semibold text-slate-900">Who We Are</h3>
            <p className="mt-3 text-slate-700">
              AskAutoDoctor is built by real industry professionals with decades of hands‑on experience. We understand what drivers need and how mechanics think—and we built a platform that brings both sides together with clarity and transparency.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 p-8">
            <h3 className="text-xl font-semibold text-slate-900">Why We Exist</h3>
            <ul className="mt-3 grid gap-2 text-slate-700">
              {[
                "Traditional auto service is time‑consuming",
                "It’s confusing and often intimidating",
                "It can be expensive—especially without guidance",
              ].map((i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  <span>{i}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ===== WHAT WE OFFER ===== */}
      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-8 sm:p-10">
          <div className="grid gap-10 lg:grid-cols-3">
            <div className="space-y-4">
              <h3 className="text-2xl font-semibold text-white">How We Help</h3>
              <p className="text-blue-100">
                Get fast, trustworthy answers before you spend money.
              </p>
              <Link href="/pricing" className="inline-flex items-center gap-2 text-emerald-300 hover:text-emerald-200">
                See plans & pricing →
              </Link>
            </div>
            <ul className="lg:col-span-2 grid gap-3 text-blue-100">
              {helpList.map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ===== VISION ===== */}
      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              <Globe2 className="h-4 w-4" />
              Our Vision
            </div>
            <h3 className="text-2xl font-semibold text-slate-900">A Global Network of Certified Mechanics</h3>
            <p className="text-slate-700">
              Whether you’re at home, at a dealership, on the roadside, or in another country—your Auto Doctor is one click away. We’re redefining automotive service with transparency, technology, and trust.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 p-8">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5" />
              <p className="font-semibold">Community & Education</p>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              We treat every customer like family—educating drivers, protecting them from bad repairs, and helping them make smart decisions.
            </p>
          </div>
        </div>
      </section>

      {/* ===== DIFFERENTIATORS ===== */}
      <section className="mx-auto max-w-7xl px-6 py-12">
        <h3 className="text-2xl font-semibold text-slate-900">What Makes Us Different</h3>
        <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-slate-200 p-6 shadow-sm">
              <Icon className="h-6 w-6 text-emerald-600" />
              <h4 className="mt-3 font-semibold text-slate-900">{title}</h4>
              <p className="mt-2 text-sm text-slate-600">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== PROMISE ===== */}
      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-8">
          <div className="flex items-start gap-4">
            <ShieldCheck className="h-6 w-6 text-emerald-700" />
            <div>
              <h3 className="text-xl font-semibold text-emerald-900">Our Promise to Drivers</h3>
              <p className="mt-2 text-emerald-900/90">
                We will educate you, protect you from bad repairs, and help you make smart decisions. When you understand what your car needs, you’re always in control.
              </p>
              <p className="mt-3 font-medium text-emerald-900">No more guessing. No more fear. Just expert help when you need it.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FUTURE / CTA ===== */}
      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-500 to-sky-500 p-8 text-white shadow-lg">
          <div className="grid items-center gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-2">
              <h3 className="text-2xl font-semibold">The Future of Auto Care Starts Here</h3>
              <p className="text-white/90">
                AskAutoDoctor is more than a platform—it’s a movement. We are bringing trust back to the automotive industry with technology, transparency, and human expertise.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
              <Link
                href="/start"
                className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-slate-100"
              >
                Start a Session
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FOOTNOTE / QUICK OPTIONS ===== */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="rounded-2xl border border-slate-200 p-6 text-sm text-slate-600">
          <p className="font-medium text-slate-800">Need alternate formats?</p>
          <p className="mt-1">
            Ask for a shorter summary, an SEO‑optimized version, a storytelling / founder journey, or a Tailwind section‑by‑section layout.
          </p>
        </div>
      </section>
    </div>
  );
}
