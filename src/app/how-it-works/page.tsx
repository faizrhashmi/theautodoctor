export default function HowItWorks() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-4xl font-bold">How AskAutoDoctor works</h1>
      <ol className="mt-6 space-y-4 text-slate-700">
        <li><b>1) Intake:</b> Fill vehicle details (VIN decoder) & upload photos.</li>
        <li><b>2) Pay or Start Trial:</b> Secure checkout for paid plans.</li>
        <li><b>3) Start:</b> We mint a private room token and connect you.</li>
        <li><b>4) Mechanic joins:</b> Share the invite link for the mechanic to join.</li>
      </ol>
    </main>
  );
}
