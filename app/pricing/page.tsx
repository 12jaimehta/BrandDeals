import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { AGENCY_MONTHLY_INR, DEAL_SHARE } from "@/lib/commercial.mjs";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pricing — Creator Rate Enforcement",
  description: "Eight percent of each closed deal, or a monthly plan for managed creators and small agencies.",
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
        <h1 className="mt-3 max-w-3xl font-serif text-5xl tracking-tight md:text-6xl">You pay when a rate is enforced.</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[#f6f1e8]/65">
          This is a rate desk for managed creators and small agencies, not a place that collects every chat. Two ways to pay. Pick one on the desk. Card billing is not switched on yet, so choosing a plan records the cut without charging you.
        </p>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <article className="rounded-3xl border border-white/10 bg-white/[0.03] p-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#ff5a36]">Closed deals</p>
            <h2 className="mt-3 font-serif text-4xl tracking-tight">{share}% of the fee</h2>
            <p className="mt-3 text-sm leading-7 text-[#f6f1e8]/60">
              For a creator closing their own brand work. When you mark a deal closed and enter the fee that was agreed, the desk records {share}% of that fee. Nothing is owed on offers you decline.
            </p>
          </article>
          <article className="rounded-3xl border border-[#ff5a36]/40 bg-[#ff5a36]/10 p-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#ff5a36]">Agency</p>
            <h2 className="mt-3 font-serif text-4xl tracking-tight">₹{monthly} / month</h2>
            <p className="mt-3 text-sm leading-7 text-[#f6f1e8]/70">
              For managed creators and small agencies. One plan covers the roster. Closed deals are recorded, and the percentage is not added on top.
            </p>
          </article>
        </div>
        <p className="mt-8 text-sm text-[#f6f1e8]/50">
          The floor on a new offer comes from fees you have already closed, or from a published Modash or HypeAuditor price when that key is connected. Follower count is not turned into a fee.
        </p>
        <Link href="/deals" className="mt-6 inline-block rounded-full bg-[#f6f1e8] px-5 py-2.5 text-sm font-semibold text-[#14110e]">Open the desk</Link>
      </main>
      <SiteFooter />
    </div>
  );
}
