'use client'
import { useState } from "react"
import { supabase } from "@/lib/supabase"

export default function Login() {
  const [email,setEmail] = useState(""); const [sent,setSent]=useState(false)
  async function send() {
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (!error) setSent(true); else alert(error.message)
  }
  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-bold">Sign in</h1>
      <input className="mt-4 w-full border p-3 rounded" placeholder="you@email.com"
        value={email} onChange={e=>setEmail(e.target.value)} />
      <button className="mt-3 w-full bg-black text-white p-3 rounded" onClick={send}>Send magic link</button>
      {sent && <p className="mt-2 text-green-600">Check your email for the link.</p>}
    </main>
  )
}