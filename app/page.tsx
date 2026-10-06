import Link from "next/link";

const sources = [
  { name: "Gmail", detail: "Brand mail, read with the Gmail API.", state: "Connect now" },
  { name: "Instagram", detail: "DMs on a professional account.", state: "Connect now" },
  { name: "Outlook", detail: "Brand mail via Microsoft Graph.", state: "Official API" },
  { name: "X", detail: "Direct messages via the X API.", state: "Official API" },
  { name: "Messenger", detail: "Page inbox via the Messenger API.", state: "Official API" },
  { name: "WhatsApp Business", detail: "Business inbox via the Cloud API.", state: "Official API" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-zinc-950 text-sm font-semibold text-white">B</span>
          <span className="font-serif text-lg tracking-tight">Brand Deal Inbox</span>
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link href="/connect" className="rounded-lg px-3 py-2 text-zinc-600 hover:text-zinc-950">Inboxes</Link>
          <Link href="/deals" className="rounded-lg bg-zinc-950 px-3 py-2 font-medium text-white hover:bg-zinc-800">Open desk</Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl gap-12 px-6 pb-20 pt-16 md:grid-cols-[1.2fr_0.8fr] md:pt-24">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-700">For working creators</p>
            <h1 className="mt-4 max-w-xl font-serif text-5xl leading-[0.95] tracking-tight md:text-7xl">
              Your brand deals, read before you reply.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-zinc-600">
              Connect the inboxes where brands already write. The desk extracts the fee, the usage, and the deadline, then tells you what to charge. You still send the reply.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/connect" className="rounded-xl bg-zinc-950 px-5 py-3 text-sm font-medium text-white hover:bg-zinc-800">Connect inboxes</Link>
              <Link href="/deals" className="rounded-xl border border-zinc-200 bg-white px-5 py-3 text-sm font-medium hover:bg-zinc-50">Go to the desk</Link>
            </div>
          </div>
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">From one thread</p>
            <p className="mt-4 font-serif text-3xl tracking-tight">Galaxy AI</p>
            <p className="mt-2 text-sm text-zinc-500">Samsung · 2 Reels + 3 Stories</p>
            <dl className="mt-6 divide-y divide-zinc-100 text-sm">
              {[
                ["Offer", "₹80,000"],
                ["Usage", "90 days"],
                ["Rate advice", "+ ₹25,000"],
                ["Follow up", "In 2 days"],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between py-3">
                  <dt className="text-zinc-500">{label}</dt>
                  <dd className="font-medium">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 rounded-2xl bg-orange-50 px-4 py-3 text-sm leading-6 text-orange-950">
              They&apos;re asking for 90-day usage rights. Your normal rate should increase by ₹25,000.
            </p>
          </div>
        </section>

        <section className="border-y border-zinc-200 bg-white">
          <div className="mx-auto grid max-w-6xl gap-8 px-6 py-16 md:grid-cols-3">
            {[
              ["01", "Choose the inboxes", "Gmail and Instagram connect today. Outlook, X, Messenger, and WhatsApp Business are the other official inboxes."],
              ["02", "The desk reads the deal", "Fee, deliverables, deadline, usage, exclusivity, and payment. A missing number stays blank."],
              ["03", "You approve the reply", "Low offers leave the main list. The draft names your minimum when they never stated a fee. Nothing is sent for you."],
            ].map(([step, title, copy]) => (
              <div key={step}>
                <p className="text-xs font-semibold tracking-[0.16em] text-zinc-400">{step}</p>
                <h2 className="mt-3 font-serif text-3xl tracking-tight">{title}</h2>
                <p className="mt-3 text-sm leading-6 text-zinc-600">{copy}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="flex items-end justify-between gap-6">
            <div>
              <h2 className="font-serif text-4xl tracking-tight">Where brand deals arrive</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-600">Only inboxes with an official API. Personal apps with no inbox API are not listed.</p>
            </div>
            <Link href="/connect" className="hidden shrink-0 rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white sm:inline">Add yours</Link>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sources.map((source) => (
              <div key={source.name} className="rounded-2xl border border-zinc-200 bg-white px-5 py-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-medium">{source.name}</h3>
                  <span className="rounded-full bg-zinc-100 px-2 py-1 text-[11px] font-medium text-zinc-600">{source.state}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-zinc-500">{source.detail}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-200 px-6 py-8 text-sm text-zinc-500">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <span>Brand Deal Inbox</span>
          <Link href="/deals" className="hover:text-zinc-950">Open the desk</Link>
        </div>
      </footer>
    </div>
  );
}
