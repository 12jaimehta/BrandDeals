import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BriefForm } from "@/components/BriefForm";
import { PageShell } from "@/components/ui";
import { PRODUCT } from "@/lib/brand";
import { secretKey } from "@/lib/config";
import { loadProfileByHandle } from "@/lib/profile";
import { formatINR } from "@/lib/read-deal.mjs";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function load(handle: string) {
  if (!secretKey()) return null;
  return loadProfileByHandle(createAdminClient(), handle);
}

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const profile = await load((await params).handle);
  const name = profile?.displayName || profile?.handle || "Creator";
  return { title: `Work with ${name}`, description: profile?.bio || `Send ${name} a brand brief.` };
}

export default async function DealLinkPage({ params }: { params: Promise<{ handle: string }> }) {
  const profile = await load((await params).handle);
  if (!profile) notFound();
  const name = profile.displayName || `@${profile.handle}`;

  return (
    <PageShell>
      <main className="relative mx-auto grid max-w-5xl gap-10 px-5 pb-20 pt-16 sm:px-8 lg:grid-cols-[1fr_1.2fr] lg:pt-24">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-[#ff5a36] font-serif text-3xl text-[#14110e]">{name.replace("@", "").charAt(0).toUpperCase()}</div>
          <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ff5a36]">Brand collaborations</p>
          <h1 className="mt-2 font-serif text-5xl tracking-tight sm:text-6xl">Work with {name}</h1>
          {profile.bio ? <p className="mt-4 max-w-md text-lg leading-7 text-[#f6f1e8]/65">{profile.bio}</p> : null}
          <div className="mt-6 flex flex-wrap gap-2">
            {profile.niches.filter(Boolean).map((niche) => <span key={niche} className="rounded-full border border-white/15 px-3 py-1 text-sm text-[#f6f1e8]/70">{niche}</span>)}
          </div>
          {profile.startingPrice ? <p className="mt-6 text-sm text-[#f6f1e8]/55">Collaborations from <span className="font-semibold text-[#f6f1e8]">{formatINR(profile.startingPrice)}</span></p> : null}
          <p className="mt-10 text-xs text-[#f6f1e8]/35">Deal desk by <Link href="/" className="underline">{PRODUCT.name}</Link></p>
        </div>
        <div className="relative">
          {profile.accepting ? (
            <BriefForm handle={profile.handle} name={name} />
          ) : (
            <div className="rounded-3xl bg-[#f6f1e8] p-8 text-[#14110e]">
              <h2 className="font-serif text-3xl tracking-tight">Not taking new briefs right now</h2>
              <p className="mt-2 text-[#14110e]/60">{name} has paused new collaborations. Check back soon.</p>
            </div>
          )}
        </div>
      </main>
    </PageShell>
  );
}
