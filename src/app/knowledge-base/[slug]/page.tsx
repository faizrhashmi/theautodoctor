import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ArrowLeft, BookmarkCheck, CheckCircle2 } from 'lucide-react'
import { KNOWLEDGE_BASE_ARTICLES } from '../articles'

type PageProps = {
  params: { slug: string }
}

export function generateMetadata({ params }: PageProps): Metadata {
  const article = KNOWLEDGE_BASE_ARTICLES.find((item) => item.slug === params.slug)
  if (!article) {
    return { title: 'Knowledge Base | AskAutoDoctor' }
  }

  return {
    title: `${article.title} | AskAutoDoctor`,
    description: article.description
  }
}

export default function KnowledgeBaseArticlePage({ params }: PageProps) {
  const article = KNOWLEDGE_BASE_ARTICLES.find((item) => item.slug === params.slug)

  if (!article) {
    notFound()
  }

  return (
    <article className="bg-slate-50">
      <div className="border-b border-slate-200 bg-gradient-to-br from-blue-600 via-blue-700 to-slate-900 text-white">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <Link
            href="/knowledge-base"
            className="inline-flex items-center gap-2 text-sm text-blue-100 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Knowledge Base
          </Link>
          <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-blue-100">
            <BookmarkCheck className="h-3.5 w-3.5" />
            {article.category}
          </p>
          <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">{article.title}</h1>
          <p className="mt-4 max-w-3xl text-sm text-blue-100 sm:text-base">{article.description}</p>
          <p className="mt-6 text-xs uppercase tracking-[0.3em] text-blue-200">{article.readingTime}</p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="space-y-12 text-slate-700">
          {article.sections.map((section) => (
            <section key={section.heading} className="space-y-4">
              <h2 className="text-xl font-semibold text-slate-900">{section.heading}</h2>
              {section.body.map((paragraph) => (
                <p key={paragraph} className="text-sm leading-relaxed text-slate-600">
                  {paragraph}
                </p>
              ))}
              {section.list && (
                <ul className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                  {section.list.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-blue-600" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <aside className="mt-16 rounded-3xl border border-blue-200 bg-blue-50/70 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-700">Quick Takeaways</p>
          <ul className="mt-4 grid gap-3 text-sm text-blue-900 sm:grid-cols-2">
            {article.takeaways.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-blue-600" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </article>
  )
}

export function generateStaticParams() {
  return KNOWLEDGE_BASE_ARTICLES.map((article) => ({ slug: article.slug }))
}
