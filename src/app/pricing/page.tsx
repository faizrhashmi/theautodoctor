export default function Pricing() {
  const items = [
    { name: "Quick 15-min Consult", price: "$25", code: "quick_15" },
    { name: "Standard 30-min Consult", price: "$45", code: "standard_30" },
    { name: "Pre-Purchase Remote Inspection", price: "$90", code: "prepurchase" },
  ]
  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-3xl font-bold mb-6">Pricing</h1>
      <div className="grid md:grid-cols-3 gap-6">
        {items.map(i=>(
          <div key={i.code} className="rounded-xl border p-6 bg-white">
            <h3 className="font-semibold">{i.name}</h3>
            <p className="text-2xl mt-2">{i.price}</p>
          </div>
        ))}
      </div>
    </main>
  )
}
