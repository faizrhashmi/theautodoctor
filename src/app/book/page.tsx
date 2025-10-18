'use client'
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

type Service = { id:number; code:string; name:string; price_cents:number; duration_min:number }
type Slot = { id:number; start_at:string; end_at:string }

export default function Book() {
  const [services,setServices]=useState<Service[]>([])
  const [service,setService]=useState<Service|undefined>()
  const [slots,setSlots]=useState<Slot[]>([])
  const [slotId,setSlotId]=useState<number|undefined>()

  useEffect(()=>{
    supabase.from('services').select('*').then(({data})=>setServices(data||[]))
  },[])
  
  useEffect(()=>{
    if (!service) return
    supabase.from('slots').select('id,start_at,end_at').eq('status','open')
      .then(({data})=>setSlots(data||[]))
  },[service])

  async function checkout() {
    if (!service || !slotId) return
    
    const res = await fetch('/api/checkout', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ service_code: service.code, slot_id: slotId })
    })
    const { url, error } = await res.json()
    if (url) window.location.href = url
    else alert(error || 'Checkout failed')
  }

  return (
    <main className="mx-auto max-w-2xl p-6 space-y-6">
      <h1 className="text-2xl font-bold">Book a session</h1>
      <div>
        <label className="block mb-2">Service</label>
        <select className="border p-3 rounded w-full" value={service?.code||''}
          onChange={e=>setService(services.find(s=>s.code===e.target.value))}>
          <option value="">Select...</option>
          {services.map(s=><option key={s.id} value={s.code}>{s.name} - ${(s.price_cents/100).toFixed(2)}</option>)}
        </select>
      </div>
      {service && (
        <div>
          <label className="block mb-2">Available slots</label>
          <select className="border p-3 rounded w-full" value={slotId||''}
            onChange={e=>setSlotId(Number(e.target.value))}>
            <option value="">Select...</option>
            {slots.map(sl=><option key={sl.id} value={sl.id}>
              {new Date(sl.start_at).toLocaleString()} – {new Date(sl.end_at).toLocaleTimeString()}
            </option>)}
          </select>
        </div>
      )}
      <button disabled={!slotId||!service} onClick={checkout}
        className="bg-black text-white p-3 rounded disabled:opacity-50 w-full">
        Go to checkout - {service ? `$${(service.price_cents/100).toFixed(2)}` : ''}
      </button>
    </main>
  )
}