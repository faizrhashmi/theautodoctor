import Link from 'next/link'
import type { Metadata } from 'next'
import { BookOpen, Search, Sparkles } from 'lucide-react'
import { KNOWLEDGE_BASE_ARTICLES } from './articles'

export const metadata: Metadata = {
  title: 'Knowledge Base | AskAutoDoctor',
  description: 'Browse step-by-step guides for preparing your vehicle information and getting the most out of live mechanic sessions.'
}

export default function KnowledgeBasePage() {
  return (
    <div className="bg-slate-50">
      <section className="border-b border-slate-200 bg-gradient-to-br from-blue-600 via-blue-700 to-slate-900 text-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-16 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-4">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-blue-100">
              <Sparkles className="h-3.5 w-3.5" />
              Help Center
            </p>
            <h1 className="text-3xl font-semibold sm:text-4xl">Knowledge Base</h1>
            <p className="max-w-2xl text-sm text-blue-100 sm:text-base">
              Quick guides from real mechanics to help you prep for live sessions, manage your account and understand what happens after we diagnose your vehicle.
            </p>
          </div>
          <div className="flex w-full max-w-sm items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm backdrop-blur-sm">
            <Search className="h-4 w-4 text-blue-100" />
            <p className="text-blue-100">More articles coming soon.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-12">
        <div className="grid gap-6 sm:grid-cols-2">
          {KNOWLEDGE_BASE_ARTICLES.map((article) => (
            <article
              key={article.slug}
              className="group flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="space-y-4">
                <p className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                  <BookOpen className="h-3.5 w-3.5" />
                  {article.category}
                </p>
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold text-slate-900">{article.title}</h2>
                  <p className="text-sm text-slate-600">{article.description}</p>
                </div>
              </div>
              <div className="mt-6 flex items-center justify-between text-xs text-slate-500">
                <span>{article.readingTime}</span>
                <Link
                  href={`/knowledge-base/${article.slug}`}
                  className="text-sm font-semibold text-blue-600 transition group-hover:text-blue-700"
                >
                  Read article →
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
