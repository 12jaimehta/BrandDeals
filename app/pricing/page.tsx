import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { AGENCY_MONTHLY_INR, DEAL_SHARE } from "@/lib/commercial.mjs";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pricing",
  description: "5% of each deal you close. Nothing on deals you don't. A flat monthly plan for agencies.",
};

export default async function PricingPage() {
  const viewer = await getViewer();
  const share = Math.round(DEAL_SHARE * 100);
  const monthly = new Intl.NumberFormat("en-IN").format(AGENCY_MONTHLY_INR);

  return (
    <div className="relative min-h-screen bg-[#14110e] text-[#f6f1e8]">
      <div className="site-grain" aria-hidden="true" />
      <SiteHeader email={viewer?.email ?? null} active="pricing" />
      <main className="relative z-10 mx-auto max-w-5xl px-6 pb-24 pt-28">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#ff5a36]">Pricing</p>
        <h1 className="mt-3 max-w-3xl font-serif text-5xl tracking-tight md:text-6xl">You pay when you get paid.</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[#f6f1e8]/65">
          No subscription to justify in a slow month. Counter earns when a deal closes, so it is on your side of the table: it wants the higher fee, the faster payment, and the cleaner contract as much as you do. Card billing is not switched on yet, so the desk records the cut without charging you.
        </p>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <article className="rounded-3xl border border-white/10 bg-white/[0.03] p-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#ff5a36]">Closed deals</p>
            <h2 className="mt-3 font-serif text-4xl tracking-tight">{share}% of the fee</h2>
            <p className="mt-3 text-sm leading-7 text-[#f6f1e8]/60">
              For creators managing their own brand work. When you mark a deal won and enter the agreed fee, the desk records {share}% of it. Nothing on offers you decline. A talent manager typically takes 15–30%.
            </p>
          </article>
          <article className="rounded-3xl border border-[#ff5a36]/40 bg-[#ff5a36]/10 p-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#ff5a36]">Agency</p>
            <h2 className="mt-3 font-serif text-4xl tracking-tight">₹{monthly} / month</h2>
            <p className="mt-3 text-sm leading-7 text-[#f6f1e8]/70">
              For talent managers and small agencies running a roster. One flat fee, no percentage on top. Every creator gets their own desk, rules, and deal link.
            </p>
          </article>
        </div>
        <p className="mt-8 text-sm text-[#f6f1e8]/50">
          Everything is included on both plans: Gmail and Instagram, the deal link, autopilot, contract checks, GST invoices, and payment reminders.
        </p>
        <Link href="/connect" className="mt-6 inline-block rounded-full bg-[#ff5a36] px-5 py-2.5 text-sm font-semibold text-[#14110e]">Start free</Link>
      </main>
      <SiteFooter />
    </div>
  );
}
