import Link from "next/link"

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Ask Auto Doctor</h1>
        <nav className="space-x-4">
          <Link href="/pricing">Pricing</Link>
          <Link className="px-4 py-2 rounded bg-black text-white" href="/login">Sign in</Link>
        </nav>
      </header>
      <section className="mt-12 grid md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-4xl font-semibold">Talk to a certified mechanic today</h2>
          <p className="mt-4 text-lg">Video consults, quick answers, and pre-purchase checks.</p>
          <div className="mt-6 space-x-3">
            <Link className="px-5 py-3 rounded bg-black text-white" href="/book">Book a session</Link>
            <Link className="px-5 py-3 rounded border" href="/pricing">View pricing</Link>
          </div>
        </div>
        <div className="rounded-xl border p-6 bg-white">
          <h3 className="font-medium mb-3">How it works</h3>
          <ol className="list-decimal ml-5 space-y-2">
            <li>Choose a service</li>
            <li>Select a time slot</li>
            <li>Pay securely online</li>
            <li>Join video call with mechanic</li>
          </ol>
        </div>
      </section>
    </main>
  )
}