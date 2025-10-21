import Link from 'next/link'
import type { Metadata } from 'next'
import { BookOpen, CalendarClock, Search, Sparkles, UserRound } from 'lucide-react'
import { KNOWLEDGE_BASE_ARTICLES } from './articles'

export const metadata: Metadata = {
  title: 'Knowledge Base | AskAutoDoctor',
  description: 'Browse step-by-step guides for preparing your vehicle information and getting the most out of live mechanic sessions.'
}

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })

export default function KnowledgeBasePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <div className="h-full w-full bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.4),_transparent_60%)]" />
        </div>
        <div className="relative mx-auto flex max-w-6xl flex-col gap-6 px-4 py-20 sm:px-6 lg:px-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-orange-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-orange-200">
              <Sparkles className="h-4 w-4" />
              Help Center
            </div>
            <h1 className="text-4xl font-bold md:text-5xl">Knowledge Base</h1>
            <p className="max-w-2xl text-lg text-slate-300">
              Quick guides from real mechanics to help you prep for live sessions, manage your account and understand what happens after we diagnose your vehicle.
            </p>
          </div>
          <div className="flex w-full max-w-sm items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm backdrop-blur">
            <Search className="h-4 w-4 text-orange-300" />
            <p className="text-slate-300">More articles coming soon.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 sm:grid-cols-2">
          {KNOWLEDGE_BASE_ARTICLES.map((article) => {
            const publishedOn = formatDate(article.publishedAt)
            const updatedOn = article.updatedAt ? formatDate(article.updatedAt) : null
            return (
              <article
                key={article.slug}
                className="group flex h-full flex-col justify-between rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur transition hover:border-orange-400/40"
              >
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 rounded-full bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-200">
                    <BookOpen className="h-3.5 w-3.5" />
                    {article.category}
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold text-white">{article.title}</h2>
                    <p className="text-sm text-slate-300">{article.description}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <UserRound className="h-3.5 w-3.5" />
                      {article.author}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarClock className="h-3.5 w-3.5" />
                      {updatedOn ? `Updated ${updatedOn}` : `Published ${publishedOn}`}
                    </span>
                  </div>
                </div>
                <div className="mt-6 flex items-center justify-between text-xs">
                  <span className="text-slate-400">{article.readingTime}</span>
                  <Link
                    href={`/knowledge-base/${article.slug}`}
                    className="text-sm font-semibold text-orange-400 transition group-hover:text-orange-300"
                  >
                    Read article →
                  </Link>
                </div>
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}
