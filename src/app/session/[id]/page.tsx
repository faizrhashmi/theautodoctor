'use client'
import { useEffect, useState } from "react"
export default function Session({ params }: { params: { id: string } }) {
  const [token,setToken] = useState<string|undefined>()
  useEffect(()=>{ fetch(`/api/livekit?room=session_${params.id}`).then(r=>r.json()).then(d=>setToken(d.token)) },[params.id])
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold">Session #{params.id}</h1>
      <p className="mt-2">Video UI TBD — token: {token ? "ok" : "loading..."}</p>
    </main>
  )
}
