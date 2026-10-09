"use client";

import { useEffect, useMemo, useState } from "react";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { DEFAULT_RULES, buildAdvice, extractDeal, formatINR, listGaps, type Conversation, type RateRules } from "@/lib/read-deal.mjs";

const STORAGE_RULES = "brand-deal-inbox:rules";

export function EmailDesk({ email }: { email: string | null }) {
  const [text, setText] = useState("");
  const [subject, setSubject] = useState("");
  const [fromName, setFromName] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const incoming = params.get("text");
    if (incoming) setText(incoming.slice(0, 20000));
    const box = document.querySelector("textarea");
    if (box instanceof HTMLTextAreaElement && box.dataset.extension === "pending" && box.value) {
      setText(box.value);
    }
  }, []);

  const reading = useMemo(() => {
    const body = text.trim();
    if (body.length < 20) return null;
    const conversation: Conversation = {
      id: "email:paste",
      source: "gmail",
      fromName: fromName.trim() || "Brand",
      fromHandle: "",
      subject: subject.trim(),
      receivedAt: new Date().toISOString(),
      messages: [{ from: "them", at: new Date().toISOString(), text: body }],
    };
    let minimum = 0;
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_RULES) || "{}") as { minimumOffer?: number };
      if (typeof stored.minimumOffer === "number") minimum = stored.minimumOffer;
    } catch {
      minimum = 0;
    }
    const extraction = extractDeal(conversation);
    extraction.gaps = listGaps(extraction);
    const rules: RateRules = { ...DEFAULT_RULES, minimumOffer: minimum };
    const advice = buildAdvice(extraction, rules);
    return { extraction, advice };
  }, [text, subject, fromName]);

  return (
    <div className="relative min-h-screen bg-[#14110e] text-[#f6f1e8]">
      <div className="site-grain" aria-hidden="true" />
      <SiteHeader email={email} active="email" />
      <main className="relative z-10 mx-auto grid max-w-6xl gap-6 px-6 pb-24 pt-28 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#ff5a36]">Email first</p>
          <h1 className="mt-3 font-serif text-5xl tracking-tight">Paste the brand email.</h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-[#f6f1e8]/60">
            This is the path that does not depend on Meta. If Instagram app review or a rate limit blocks DMs, the offer still gets read from Gmail. The Chrome extension on an open Gmail thread fills this box. Nothing is sent.
          </p>
          <label className="mt-6 block text-xs text-[#f6f1e8]/50">
            From
            <input value={fromName} onChange={(event) => setFromName(event.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-[#f6f1e8]" />
          </label>
          <label className="mt-3 block text-xs text-[#f6f1e8]/50">
            Subject
            <input value={subject} onChange={(event) => setSubject(event.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-[#f6f1e8]" />
          </label>
          <label className="mt-3 block text-xs text-[#f6f1e8]/50">
            Email
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={16}
              placeholder="Paste the brand's email here."
              className="mt-1 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-[#f6f1e8]"
            />
          </label>
        </section>
        <aside className="h-fit rounded-3xl bg-[#f6f1e8] p-6 text-[#14110e]">
          {!reading ? (
            <p className="text-sm leading-6 text-[#14110e]/60">Paste at least a few lines. The fee stays blank if the email does not state one.</p>
          ) : !reading.extraction.isBrandOpportunity ? (
            <>
              <h2 className="font-serif text-3xl tracking-tight">Not a brand offer</h2>
              <p className="mt-3 text-sm leading-6 text-[#14110e]/60">{reading.extraction.detectionReason}</p>
            </>
          ) : (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#c2410c]">Extracted</p>
              <h2 className="mt-2 font-serif text-3xl tracking-tight">{reading.extraction.brand || "Brand not named"}</h2>
              <dl className="mt-4 space-y-2 text-sm">
                <Row label="Offer" value={reading.extraction.offerAmount == null ? "Not stated" : formatINR(reading.extraction.offerAmount)} />
                <Row label="Deliverables" value={reading.extraction.deliverables.join(" + ") || "Not stated"} />
                <Row label="Usage" value={reading.extraction.usageRightsDays == null ? "Not stated" : `${reading.extraction.usageRightsDays} days`} />
                <Row label="Usage uplift" value={reading.advice.usageAmount > 0 ? formatINR(reading.advice.usageAmount) : "None"} />
                <Row label="Counter" value={reading.advice.suggestedOffer == null ? "Needs a stated fee" : formatINR(reading.advice.suggestedOffer)} />
              </dl>
              {reading.extraction.gaps.length ? (
                <p className="mt-4 text-xs leading-5 text-[#14110e]/55">Still missing: {reading.extraction.gaps.join(", ")}.</p>
              ) : null}
            </>
          )}
        </aside>
      </main>
      <SiteFooter />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#14110e]/10 py-2">
      <dt className="text-[#14110e]/50">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
