"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { buildAgreement, scanContract, type AgreementInput, type ContractFlag } from "@/lib/contract.mjs";
import { api, buttonGhostLight, buttonInk, ease, inputLight } from "@/components/ui";

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function printText(title: string, text: string) {
  const win = window.open("", "_blank", "width=820,height=900");
  if (!win) return;
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  win.document.write(`<!doctype html><title>${title}</title><body style="font:14px/1.6 Georgia,serif;max-width:720px;margin:40px auto;padding:0 24px;white-space:pre-wrap">${escaped}</body>`);
  win.document.close();
  win.focus();
  win.print();
}

export function AgreementBuilder({ initial, fileName = "agreement.txt" }: { initial: AgreementInput; fileName?: string }) {
  const [brand, setBrand] = useState(initial.brand?.name ?? "");
  const [contact, setContact] = useState(initial.brand?.contactName ?? "");
  const [email, setEmail] = useState(initial.brand?.email ?? "");
  const [campaign, setCampaign] = useState(initial.deal?.campaign ?? "");
  const [deliverables, setDeliverables] = useState((initial.deal?.deliverables ?? []).join(", "));
  const [fee, setFee] = useState(initial.deal?.fee ? String(initial.deal.fee) : "");
  const [advance, setAdvance] = useState(String(initial.deal?.advancePercent ?? 50));
  const [usage, setUsage] = useState(String(initial.deal?.usageDays ?? 30));
  const [exclusivity, setExclusivity] = useState(String(initial.deal?.exclusivityDays ?? 0));
  const [deadline, setDeadline] = useState(initial.deal?.deadline ?? "");
  const [gst, setGst] = useState(Boolean(initial.deal?.gstRate));
  const [copied, setCopied] = useState(false);

  const text = useMemo(() => buildAgreement({
    creator: initial.creator,
    brand: { name: brand, contactName: contact, email },
    deal: {
      campaign,
      deliverables: deliverables.split(",").map((item) => item.trim()).filter(Boolean),
      fee: Number(fee) || null,
      advancePercent: Number(advance) || 0,
      usageDays: usage === "" ? null : Number(usage),
      exclusivityDays: Number(exclusivity) || 0,
      deadline: deadline || null,
      gstRate: gst ? 18 : 0,
    },
  }), [initial.creator, brand, contact, email, campaign, deliverables, fee, advance, usage, exclusivity, deadline, gst]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Brand"><input className={inputLight} value={brand} onChange={(event) => setBrand(event.target.value)} /></Field>
        <Field label="Campaign"><input className={inputLight} value={campaign} onChange={(event) => setCampaign(event.target.value)} /></Field>
        <Field label="Brand contact"><input className={inputLight} value={contact} onChange={(event) => setContact(event.target.value)} /></Field>
        <Field label="Contact email"><input className={inputLight} value={email} onChange={(event) => setEmail(event.target.value)} /></Field>
        <Field label="Deliverables, comma separated" wide><input className={inputLight} value={deliverables} onChange={(event) => setDeliverables(event.target.value)} /></Field>
        <Field label="Fee, ₹"><input className={inputLight} inputMode="numeric" value={fee} onChange={(event) => setFee(event.target.value.replace(/[^\d]/g, ""))} /></Field>
        <Field label="Advance, %"><input className={inputLight} inputMode="numeric" value={advance} onChange={(event) => setAdvance(event.target.value.replace(/[^\d]/g, ""))} /></Field>
        <Field label="Usage window, days"><input className={inputLight} inputMode="numeric" value={usage} onChange={(event) => setUsage(event.target.value.replace(/[^\d]/g, ""))} /></Field>
        <Field label="Exclusivity, days"><input className={inputLight} inputMode="numeric" value={exclusivity} onChange={(event) => setExclusivity(event.target.value.replace(/[^\d]/g, ""))} /></Field>
        <Field label="Go-live by"><input className={inputLight} type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} /></Field>
        <label className="flex items-center gap-2 self-end pb-2 text-sm text-[#14110e]/70">
          <input type="checkbox" className="h-4 w-4 accent-[#ff5a36]" checked={gst} onChange={(event) => setGst(event.target.checked)} />
          Add 18% GST
        </label>
      </div>
      <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-2xl border border-[#14110e]/10 bg-white p-4 font-serif text-[13px] leading-6 text-[#14110e]/85">{text}</pre>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={buttonInk} onClick={() => {
          navigator.clipboard?.writeText(text).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1500); }, () => undefined);
        }}>{copied ? "Copied" : "Copy"}</button>
        <button type="button" className={buttonGhostLight} onClick={() => download(fileName, text)}>Download</button>
        <button type="button" className={buttonGhostLight} onClick={() => printText("Agreement", text)}>Print or save as PDF</button>
      </div>
      <p className="text-xs leading-5 text-[#14110e]/50">The wording is a fixed template, not AI-written. Only the facts above change. Have a lawyer review it before you rely on it. You sign; the app never does.</p>
    </div>
  );
}

export function ContractChecker({ maxUsageDays = null, maxExclusivityDays = null, onUseInReply }: {
  maxUsageDays?: number | null;
  maxExclusivityDays?: number | null;
  onUseInReply?: (text: string) => void;
}) {
  const [text, setText] = useState("");
  const [flags, setFlags] = useState<ContractFlag[] | null>(null);
  const [ai, setAi] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function review() {
    if (text.trim().length < 40) {
      setNote("Paste the contract text first.");
      return;
    }
    setBusy(true);
    setNote(null);
    setFlags(scanContract(text, { maxUsageDays, maxExclusivityDays }));
    try {
      const result = await api<{ flags: ContractFlag[]; ai: boolean }>("/api/contract/review", { method: "POST", json: { text, maxUsageDays, maxExclusivityDays } });
      setFlags(result.flags);
      setAi(result.ai);
    } catch (error) {
      setAi(false);
      setNote(error instanceof Error && error.message !== "Sign in first." ? error.message : "Rules check only. Sign in for the AI read.");
    } finally {
      setBusy(false);
    }
  }

  function replyFromFlags(list: ContractFlag[]) {
    const asks = list.map((flag) => `- ${flag.title}: ${flag.ask}`);
    return `Hi,\n\nThanks for sending the agreement. Before I sign, could we update a few points?\n\n${asks.join("\n")}\n\nHappy to sign once these are in.`;
  }

  return (
    <div className="space-y-4">
      <textarea
        className={`${inputLight} min-h-40 font-serif leading-6`}
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Paste the brand's contract here."
        aria-label="Contract text"
      />
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={buttonInk} onClick={() => void review()} disabled={busy}>{busy ? "Reading…" : "Check the contract"}</button>
        {flags ? <span className="text-xs text-[#14110e]/50">{flags.length ? `${flags.length} ${flags.length === 1 ? "clause" : "clauses"} to push back on` : "Nothing risky found"}{ai ? " · rules + AI" : " · rules"}</span> : null}
      </div>
      {note ? <p className="text-xs text-[#14110e]/55">{note}</p> : null}
      <AnimatePresence initial={false}>
        {flags?.length ? (
          <motion.ul initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
            {flags.map((flag, index) => (
              <motion.li
                key={`${flag.id}-${index}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04, duration: 0.25, ease }}
                className="rounded-2xl border border-[#14110e]/10 bg-white p-4"
              >
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${flag.severity === "high" ? "bg-[#ff5a36] text-[#14110e]" : "bg-[#14110e]/10 text-[#14110e]/70"}`}>{flag.severity}</span>
                  <h4 className="text-sm font-semibold">{flag.title}</h4>
                  {flag.id.startsWith("ai-") ? <span className="ml-auto text-[10px] uppercase tracking-wide text-[#14110e]/40">AI</span> : null}
                </div>
                {flag.quote ? <blockquote className="mt-2 border-l-2 border-[#ff5a36] pl-3 font-serif text-[13px] italic leading-6 text-[#14110e]/70">“{flag.quote}”</blockquote> : null}
                <p className="mt-2 text-xs leading-5 text-[#14110e]/60">{flag.why}</p>
                <p className="mt-1 text-xs font-medium leading-5 text-[#14110e]">Ask: {flag.ask}</p>
              </motion.li>
            ))}
          </motion.ul>
        ) : null}
      </AnimatePresence>
      {flags?.length && onUseInReply ? (
        <button type="button" className={buttonGhostLight} onClick={() => onUseInReply(replyFromFlags(flags))}>Draft a reply asking for these changes</button>
      ) : null}
      <p className="text-xs leading-5 text-[#14110e]/50">Every flag quotes the contract word for word. AI flags without an exact quote are thrown away. This is a negotiation aid, not legal advice.</p>
    </div>
  );
}

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={`grid gap-1 text-xs text-[#14110e]/55 ${wide ? "sm:col-span-2" : ""}`}>
      {label}
      {children}
    </label>
  );
}
