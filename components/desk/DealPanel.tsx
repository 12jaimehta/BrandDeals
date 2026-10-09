"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { AgreementBuilder, ContractChecker } from "@/components/ContractTools";
import { CountTo, api, buttonGhostDark, buttonGhostLight, buttonHot, buttonInk, ease, inputLight, snap } from "@/components/ui";
import type { Planned } from "@/components/desk/Desk";
import { categoryLabel, counterFor } from "@/lib/agent.mjs";
import { closeCut } from "@/lib/commercial.mjs";
import type { DeskConversation } from "@/lib/deal-rows";
import { displayStatus, type Invoice } from "@/lib/invoice.mjs";
import type { CreatorProfile } from "@/lib/profile";
import { addDays, daysUntil, formatDate, formatINR, recommendedWaitDays, toISODate } from "@/lib/read-deal.mjs";
import type { Settings } from "@/lib/settings";

type Tab = "next" | "terms" | "contract" | "close";

const kindLabel: Record<string, string> = {
  counter: "Counter",
  ask_budget: "Ask for budget",
  ask_terms: "Missing terms",
  ready_for_yes: "Your decision",
  follow_up: "Follow up",
  decline_blocked: "Decline",
  waiting: "Waiting",
  closed: "Closed",
};

export function DealPanel({
  conversation,
  entry,
  settings,
  profile,
  creatorName,
  gmailConnected,
  autopilotOn,
  invoices,
  onBack,
  onSend,
  onPatch,
  onInvoice,
  onToast,
}: {
  conversation: DeskConversation;
  entry: Planned | null;
  settings: Settings;
  profile: CreatorProfile | null;
  creatorName: string;
  gmailConnected: boolean;
  autopilotOn: boolean;
  invoices: Invoice[];
  onBack: () => void;
  onSend: (text: string, kind: string) => Promise<boolean>;
  onPatch: (patch: Record<string, unknown>, message?: string) => Promise<boolean>;
  onInvoice: (invoice: Invoice) => void;
  onToast: (message: string) => void;
}) {
  const [tab, setTab] = useState<Tab>(conversation.meta.status === "won" ? "close" : "next");
  const [draft, setDraft] = useState<string | null>(null);
  const { extraction } = conversation;
  const shell = "flex h-full min-h-0 min-w-0 w-full flex-col overflow-x-hidden overflow-y-auto border-white/10 bg-[#f6f1e8] text-[#14110e] lg:border-l";

  if (!extraction.isBrandOpportunity) {
    return (
      <aside className={`${shell} px-6 py-8`}>
        <button className="mb-4 rounded-full border border-[#14110e]/15 px-3 py-1 text-sm lg:hidden" type="button" onClick={onBack}>Back to the thread</button>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#14110e]/40">Reader</p>
        <h2 className="mt-2 font-serif text-3xl tracking-tight">No brand deal here</h2>
        <p className="mt-3 text-sm leading-6 text-[#14110e]/55">{extraction.detectionReason}</p>
      </aside>
    );
  }

  const tabs: Array<[Tab, string]> = [["next", "Next step"], ["terms", "Terms"], ["contract", "Contract"], ["close", "Close"]];

  return (
    <aside className={shell} aria-live="polite">
      <div className="sticky top-0 z-10 border-b border-[#14110e]/10 bg-[#f6f1e8] px-5 pb-3 pt-5">
        <button className="mb-3 rounded-full border border-[#14110e]/15 px-3 py-1 text-sm lg:hidden" type="button" onClick={onBack}>Back to the thread</button>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#ff5a36]">The deal</p>
        <h2 className="mt-1 break-words font-serif text-3xl tracking-tight">{extraction.brand || extraction.campaign || "Untitled deal"}</h2>
        <LayoutGroup id="panel-tabs">
          <div className="mt-3 flex gap-1 rounded-full bg-[#14110e]/[0.06] p-1">
            {tabs.map(([id, label]) => (
              <button key={id} type="button" onClick={() => setTab(id)} className={`relative flex-1 rounded-full px-2 py-1.5 text-xs font-semibold transition ${tab === id ? "text-[#f6f1e8]" : "text-[#14110e]/55 hover:text-[#14110e]"}`}>
                {tab === id ? <motion.span layoutId="panel-tab" className="absolute inset-0 rounded-full bg-[#14110e]" transition={snap} /> : null}
                <span className="relative">{label}</span>
              </button>
            ))}
          </div>
        </LayoutGroup>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={tab} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.22, ease }} className="space-y-5 px-5 py-5">
          {tab === "next" ? (
            <NextStep
              conversation={conversation}
              entry={entry}
              settings={settings}
              gmailConnected={gmailConnected}
              autopilotOn={autopilotOn}
              draft={draft}
              onDraft={setDraft}
              onSend={onSend}
              onPatch={onPatch}
              onToast={onToast}
            />
          ) : null}
          {tab === "terms" ? <Terms conversation={conversation} settings={settings} /> : null}
          {tab === "contract" ? (
            <ContractTab
              conversation={conversation}
              entry={entry}
              settings={settings}
              profile={profile}
              creatorName={creatorName}
              onUseInReply={(text) => { setDraft(text); setTab("next"); onToast("The reply asking for changes is in Next step. Edit it, then send."); }}
            />
          ) : null}
          {tab === "close" ? (
            <CloseTab conversation={conversation} entry={entry} profile={profile} invoices={invoices} onPatch={onPatch} onInvoice={onInvoice} onToast={onToast} />
          ) : null}
        </motion.div>
      </AnimatePresence>
    </aside>
  );
}

function NextStep({ conversation, entry, settings, gmailConnected, autopilotOn, draft, onDraft, onSend, onPatch, onToast }: {
  conversation: DeskConversation;
  entry: Planned | null;
  settings: Settings;
  gmailConnected: boolean;
  autopilotOn: boolean;
  draft: string | null;
  onDraft: (text: string | null) => void;
  onSend: (text: string, kind: string) => Promise<boolean>;
  onPatch: (patch: Record<string, unknown>, message?: string) => Promise<boolean>;
  onToast: (message: string) => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [rewriting, setRewriting] = useState(false);
  const plan = entry?.plan ?? null;
  const base = plan?.text ?? "";
  const text = draft ?? base;
  const edited = draft != null && draft !== base;
  const { meta, extraction } = conversation;
  const needsGmail = (conversation.source === "gmail" || conversation.source === "link") && !gmailConnected;
  const waitDays = recommendedWaitDays(conversation);
  const reminderSet = Boolean(meta.followUpOn && !meta.followedUp);

  let status = "";
  let statusTone = "text-[#f6f1e8]/60";
  if (plan?.kind === "ready_for_yes") {
    status = "Only you can accept. Read it, then send it yourself.";
    statusTone = "text-[#ff5a36]";
  } else if (entry?.auto.ok) {
    status = "Autopilot will send this on its next run. Send it now, edit it, or set the deal aside.";
    statusTone = "text-emerald-300";
  } else if (plan?.text) {
    status = autopilotOn ? `Held for you: ${entry?.auto.reason}` : "Autopilot is off. This waits for your approval.";
  }

  async function rewrite() {
    if (!text.trim()) return;
    setRewriting(true);
    try {
      const body = await api<{ draft: string; modelError?: string }>("/api/draft", { method: "POST", json: { conversation, draft: text } });
      onDraft(body.draft);
      onToast(body.modelError || "Rewritten. Every fee and term was kept. Edit it, then send.");
    } catch (error) {
      onToast(error instanceof Error ? error.message : "The rewrite failed.");
    } finally {
      setRewriting(false);
    }
  }

  async function send() {
    setConfirm(false);
    setSending(true);
    const ok = await onSend(text.trim(), plan?.kind ?? "reply");
    setSending(false);
    if (ok) onDraft(null);
  }

  const channel = conversation.source === "instagram" ? "your Instagram account" : `Gmail to ${meta.contactEmail || conversation.fromHandle}`;

  return (
    <>
      <section className="rounded-2xl bg-[#14110e] px-4 py-4 text-[#f6f1e8]">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#ff5a36]">Agent · {kindLabel[plan?.kind ?? "waiting"]}</p>
          {meta.category ? <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-[#f6f1e8]/60">{categoryLabel(meta.category)}</span> : null}
        </div>
        <p className="mt-2 font-serif text-2xl leading-tight tracking-tight">{plan?.title || "Nothing to do"}</p>
        {plan?.kind === "counter" && plan.amount != null && extraction.offerAmount != null ? (
          <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-serif text-4xl tracking-tight text-[#ff5a36]"><CountTo key={`${conversation.id}-${plan.amount}`} from={extraction.offerAmount} to={plan.amount} /></span>
            <span className="text-xs text-[#f6f1e8]/45">from {formatINR(extraction.offerAmount)} · +{formatINR(plan.amount - extraction.offerAmount)}</span>
          </div>
        ) : null}
        {plan?.reason ? <p className="mt-2 text-sm leading-6 text-[#f6f1e8]/65">{plan.reason}</p> : null}
        {status ? <p className={`mt-3 text-xs leading-5 ${statusTone}`}>{status}</p> : null}
      </section>

      {plan?.text || draft ? (
        <section className="rounded-2xl bg-[#14110e] p-4 text-white">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">{edited ? "Your edit" : "Draft"}</h3>
            {edited ? <button type="button" onClick={() => onDraft(null)} className="text-xs text-[#f6f1e8]/55 underline hover:text-white">Back to the agent's draft</button> : null}
          </div>
          <textarea
            value={text}
            onChange={(event) => onDraft(event.target.value)}
            rows={Math.min(16, Math.max(6, text.split("\n").length + 1))}
            aria-label="Reply draft"
            className={`mt-3 w-full resize-y rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm leading-6 text-[#f6f1e8] outline-none transition focus:border-[#ff5a36]/60 ${rewriting ? "opacity-40" : ""}`}
          />
          {needsGmail ? <p className="mt-2 text-xs text-[#ff5a36]">Connect Gmail to send this. <Link className="underline" href="/connect">Connect</Link></p> : null}
          <AnimatePresence initial={false}>
            {confirm ? (
              <motion.div key="confirm" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25, ease }} className="overflow-hidden">
                <div className="mt-3 rounded-xl border border-[#ff5a36]/40 bg-[#ff5a36]/10 p-3">
                  <p className="text-xs leading-5 text-[#f6f1e8]/85">Send this to {extraction.brand || conversation.fromName} via {channel}?</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className={buttonHot} type="button" onClick={() => void send()} disabled={sending}>Yes, send it</button>
                    <button className={buttonGhostDark} type="button" onClick={() => setConfirm(false)}>Keep editing</button>
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className={buttonHot} type="button" onClick={() => setConfirm(true)} disabled={sending || rewriting || confirm || !text.trim() || needsGmail}>{sending ? "Sending…" : plan?.kind === "ready_for_yes" ? "Accept and send" : "Approve and send"}</button>
            <button className={buttonGhostDark} type="button" onClick={() => void rewrite()} disabled={rewriting || sending}>{rewriting ? "Writing…" : "Rewrite with AI"}</button>
            <button className={buttonGhostDark} type="button" onClick={() => navigator.clipboard?.writeText(text).then(() => onToast("Copied. Nothing was sent."), () => undefined)}>Copy</button>
          </div>
          <p className="mt-2 text-[11px] leading-4 text-[#f6f1e8]/40">AI rewrites that change a fee are thrown away. Nothing is sent until you confirm.</p>
        </section>
      ) : null}

      <section className="rounded-2xl border border-[#14110e]/12 bg-white px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">{reminderSet ? `Reminder ${daysUntil(meta.followUpOn!) <= 0 ? "due" : "set"} for ${formatDate(meta.followUpOn!)}` : "Remind me"}</h3>
            <p className="mt-0.5 text-xs text-[#14110e]/55">{reminderSet ? "Shows under Needs you when it's due." : waitDays === 1 ? "They said tomorrow, so 1 day." : `In ${waitDays} days, if you'd rather handle it yourself.`}</p>
          </div>
          {reminderSet ? (
            <div className="flex gap-2">
              <button type="button" className={buttonInk} onClick={() => void onPatch({ followedUp: true }, "Marked done.")}>Done</button>
              <button type="button" className={buttonGhostLight} onClick={() => void onPatch({ followUpOn: null, followedUp: false })}>Clear</button>
            </div>
          ) : (
            <button type="button" className={buttonInk} onClick={() => {
              const on = toISODate(addDays(waitDays));
              void onPatch({ followUpOn: on, followedUp: false }, `Reminder set for ${formatDate(on)}.`);
            }}>Set</button>
          )}
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <button type="button" className={buttonGhostLight} onClick={() => void onPatch({ dismissed: !meta.dismissed }, meta.dismissed ? "Moved back to your deals." : "Set aside. Autopilot leaves it alone.")}>{meta.dismissed ? "Move back to deals" : "Set aside"}</button>
        <Link href="/settings#autopilot" className={buttonGhostLight}>Autopilot rules</Link>
      </div>
      {settings.rules.minimumOffer === 0 ? <p className="text-xs leading-5 text-[#14110e]/50">You haven't set a minimum fee. <Link href="/settings" className="underline">Set one</Link> so counters never go below it.</p> : null}
    </>
  );
}

function Terms({ conversation, settings }: { conversation: DeskConversation; settings: Settings }) {
  const { extraction, meta } = conversation;
  const counter = counterFor(extraction, settings.rules);
  const rules = settings.rules;
  const fields: Array<[string, string | null]> = [
    ["Brand", extraction.brand],
    ["Campaign", extraction.campaign],
    ["Offer", extraction.offerAmount == null ? null : `${extraction.offerApproximate ? "≈ " : ""}${formatINR(extraction.offerAmount)}`],
    ["Deliverables", extraction.deliverables.join(" + ") || null],
    ["Deadline", extraction.deadline ? `${formatDate(extraction.deadline)}` : null],
    ["Usage rights", extraction.usageRightsDays == null ? null : `${extraction.usageRightsDays} days`],
    ["Exclusivity", extraction.exclusivityDays == null ? null : extraction.exclusivityDays === 0 ? "None" : `${extraction.exclusivityDays} days`],
    ["Payment", extraction.payment],
    ["Category", meta.category ? categoryLabel(meta.category) : null],
  ];
  const stated = fields.slice(0, 8).filter(([, value]) => value).length;
  return (
    <>
      <div>
        <div className="flex items-center justify-between text-xs text-[#14110e]/55">
          <span>{stated} of 8 terms stated</span>
          <span>{stated < 8 ? "The agent asks for the rest" : "Complete"}</span>
        </div>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[#14110e]/10">
          <motion.div className="h-full rounded-full bg-[#14110e]" initial={{ width: 0 }} animate={{ width: `${(stated / 8) * 100}%` }} transition={{ duration: 0.6, ease }} />
        </div>
        <dl className="mt-3 divide-y divide-[#14110e]/10 rounded-2xl border border-[#14110e]/12 bg-white">
          {fields.map(([label, value]) => (
            <div key={label} className="flex items-start justify-between gap-4 px-4 py-3 text-sm">
              <dt className="text-[#14110e]/50">{label}</dt>
              <dd className={`text-right font-medium ${value ? "" : "font-normal text-[#14110e]/35"}`}>{value || "Not stated"}</dd>
            </div>
          ))}
        </dl>
      </div>
      {extraction.offerAmount != null ? (
        <section className="rounded-2xl bg-[#14110e] p-4 text-sm text-[#f6f1e8]/75">
          <h3 className="font-semibold text-[#f6f1e8]">How the counter is worked out</h3>
          <ul className="mt-2 space-y-1 text-xs leading-5">
            <li>Offer: {formatINR(extraction.offerAmount)}</li>
            {counter.advice.blocks > 0 ? <li>Usage: {counter.usageDays} days asked, {rules.usageIncludedDays} included → {counter.advice.blocks} × {formatINR(rules.usageUpliftPer30Days)} = +{formatINR(counter.advice.usageAmount)}</li> : <li>Usage: inside the {rules.usageIncludedDays} days you include</li>}
            {counter.advice.exclusivityAmount > 0 ? <li>Exclusivity: +{formatINR(counter.advice.exclusivityAmount)}</li> : null}
            {counter.usageCapped ? <li>Usage capped at your {rules.maxUsageDays}-day limit</li> : null}
            {counter.exclusivityCapped ? <li>Exclusivity capped at your {rules.maxExclusivityDays}-day limit</li> : null}
            {rules.minimumOffer > 0 ? <li>Your minimum: {formatINR(rules.minimumOffer)}</li> : null}
            <li className="pt-1 font-semibold text-[#ff5a36]">Target: {counter.target != null ? formatINR(counter.target) : "—"}</li>
          </ul>
        </section>
      ) : null}
      {extraction.notes.length ? <ul className="space-y-1 text-sm text-[#14110e]/55">{extraction.notes.map((note) => <li key={note}>{note}</li>)}</ul> : null}
      <section className="rounded-2xl border border-[#14110e]/12 bg-white px-4 py-4 text-xs leading-5 text-[#14110e]/60">
        <h3 className="text-sm font-semibold text-[#14110e]">Your guardrails</h3>
        <p className="mt-1">Minimum {rules.minimumOffer ? formatINR(rules.minimumOffer) : "not set"} · usage cap {rules.maxUsageDays != null ? `${rules.maxUsageDays} days` : "none"} · exclusivity cap {rules.maxExclusivityDays != null ? `${rules.maxExclusivityDays} days` : "none"}</p>
        <p>Blocked: {rules.blockedCategories.length ? rules.blockedCategories.map(categoryLabel).join(", ") : "nothing yet"}</p>
        <Link href="/settings" className="mt-2 inline-block font-semibold text-[#14110e] underline">Edit guardrails</Link>
      </section>
      <p className="text-xs text-[#14110e]/40">{conversation.reader === "form" ? "Terms came from the brand's own form." : conversation.reader === "openai" ? "Read by AI. A fee or brand not written in the message is thrown away." : "Read by the rules reader."}</p>
    </>
  );
}

function ContractTab({ conversation, entry, settings, profile, creatorName, onUseInReply }: {
  conversation: DeskConversation;
  entry: Planned | null;
  settings: Settings;
  profile: CreatorProfile | null;
  creatorName: string;
  onUseInReply: (text: string) => void;
}) {
  const [mode, setMode] = useState<"check" | "make">("check");
  const { extraction, meta } = conversation;
  const fee = meta.agreedFee ?? entry?.plan?.amount ?? extraction.offerAmount;
  const usage = settings.rules.maxUsageDays != null && extraction.usageRightsDays != null ? Math.min(extraction.usageRightsDays, settings.rules.maxUsageDays) : extraction.usageRightsDays;
  return (
    <>
      <div className="flex gap-2">
        <button type="button" onClick={() => setMode("check")} className={mode === "check" ? buttonInk : buttonGhostLight}>Check their contract</button>
        <button type="button" onClick={() => setMode("make")} className={mode === "make" ? buttonInk : buttonGhostLight}>Make an agreement</button>
      </div>
      {mode === "check" ? (
        <ContractChecker maxUsageDays={settings.rules.maxUsageDays} maxExclusivityDays={settings.rules.maxExclusivityDays} onUseInReply={onUseInReply} />
      ) : (
        <AgreementBuilder
          fileName={`${(extraction.brand || "brand").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-agreement.txt`}
          initial={{
            creator: { name: creatorName, legalName: profile?.legalName, address: profile?.address, pan: profile?.pan, gstin: profile?.gstin },
            brand: { name: extraction.brand ?? "", contactName: conversation.fromName.split(" · ")[0], email: meta.contactEmail || (conversation.source === "gmail" ? conversation.fromHandle : "") },
            deal: {
              campaign: extraction.campaign,
              deliverables: extraction.deliverables,
              fee,
              advancePercent: /100%/.test(extraction.payment ?? "") ? 100 : 50,
              usageDays: usage ?? 30,
              exclusivityDays: extraction.exclusivityDays ?? 0,
              deadline: extraction.deadline,
              gstRate: profile?.gstin ? 18 : 0,
            },
          }}
        />
      )}
    </>
  );
}

function CloseTab({ conversation, entry, profile, invoices, onPatch, onInvoice, onToast }: {
  conversation: DeskConversation;
  entry: Planned | null;
  profile: CreatorProfile | null;
  invoices: Invoice[];
  onPatch: (patch: Record<string, unknown>, message?: string) => Promise<boolean>;
  onInvoice: (invoice: Invoice) => void;
  onToast: (message: string) => void;
}) {
  const { extraction, meta } = conversation;
  const suggestedFee = meta.agreedFee ?? entry?.plan?.amount ?? extraction.offerAmount ?? 0;
  const defaultEmail = meta.contactEmail || (conversation.source === "gmail" ? conversation.fromHandle : "");
  const [fee, setFee] = useState(suggestedFee ? String(suggestedFee) : "");
  const [contact, setContact] = useState(defaultEmail);
  const [billName, setBillName] = useState(conversation.fromName.split(" · ")[0]);
  const [line, setLine] = useState(`${extraction.brand ? `${extraction.brand} — ` : ""}${extraction.deliverables.join(" + ") || "Content collaboration"}`);
  const [gst, setGst] = useState(Boolean(profile?.gstin));
  const [advance, setAdvance] = useState(/100%/.test(extraction.payment ?? "") ? "100" : /50%/.test(extraction.payment ?? "") ? "50" : "0");
  const [dueIn, setDueIn] = useState("15");
  const [busy, setBusy] = useState(false);

  async function markWon() {
    const amount = Number(fee);
    if (!Number.isFinite(amount) || amount <= 0) {
      onToast("Enter the fee you agreed.");
      return;
    }
    setBusy(true);
    const patch: Record<string, unknown> = { status: "won", agreedFee: amount };
    if (contact.includes("@")) patch.contactEmail = contact;
    await onPatch(patch, "Marked won. Create the invoice below.");
    setBusy(false);
  }

  async function createInvoice() {
    setBusy(true);
    try {
      const { invoice } = await api<{ invoice: Invoice }>("/api/invoices", {
        method: "POST",
        json: {
          conversationId: conversation.id,
          brand: extraction.brand ?? "",
          billToName: billName,
          billToEmail: contact,
          items: [{ label: line, amount: meta.agreedFee ?? Number(fee) }],
          gstRate: gst ? 18 : 0,
          advancePercent: Number(advance) || 0,
          dueInDays: Number(dueIn) || 15,
        },
      });
      onInvoice(invoice);
      onToast(`Invoice ${invoice.number} created. Send it from here or from Money.`);
    } catch (error) {
      onToast(error instanceof Error ? error.message : "The invoice was not created.");
    } finally {
      setBusy(false);
    }
  }

  async function sendInvoice(invoice: Invoice) {
    setBusy(true);
    try {
      const body = await api<{ invoice: Invoice }>(`/api/invoices/${invoice.id}/send`, { method: "POST" });
      onInvoice(body.invoice);
      onToast(`Invoice ${invoice.number} sent to ${invoice.billToEmail}. Autopilot chases it if payment reminders are on.`);
    } catch (error) {
      onToast(error instanceof Error ? error.message : "The invoice was not sent.");
    } finally {
      setBusy(false);
    }
  }

  if (meta.status === "open") {
    return (
      <>
        <section className="rounded-2xl bg-[#14110e] p-4 text-[#f6f1e8]">
          <h3 className="font-serif text-2xl tracking-tight">Did they say yes?</h3>
          <p className="mt-1 text-xs leading-5 text-[#f6f1e8]/55">Record the fee you agreed. It sets your floor for future offers and starts the invoice.</p>
          <div className="mt-4 grid gap-2">
            <label className="grid gap-1 text-xs text-[#f6f1e8]/55">Agreed fee, ₹<input className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-[#f6f1e8] outline-none focus:border-[#ff5a36]/60" inputMode="numeric" value={fee} onChange={(event) => setFee(event.target.value.replace(/[^\d]/g, ""))} /></label>
            <label className="grid gap-1 text-xs text-[#f6f1e8]/55">Brand's billing email<input className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-[#f6f1e8] outline-none focus:border-[#ff5a36]/60" value={contact} onChange={(event) => setContact(event.target.value)} placeholder="accounts@brand.com" /></label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className={buttonHot} onClick={() => void markWon()} disabled={busy}>Mark won</button>
            <button type="button" className={buttonGhostDark} onClick={() => void onPatch({ status: "lost" }, "Closed as lost.")} disabled={busy}>Mark lost</button>
          </div>
        </section>
        <p className="text-xs leading-5 text-[#14110e]/50">Pricing is {Math.round(closeCut("deal-share", 100).cut)}% of the fee on deals you close, recorded here. Nothing is charged in the app yet.</p>
      </>
    );
  }

  if (meta.status === "lost") {
    return (
      <section className="rounded-2xl border border-[#14110e]/12 bg-white p-4">
        <h3 className="text-sm font-semibold">Closed as lost</h3>
        <button type="button" className={`${buttonGhostLight} mt-3`} onClick={() => void onPatch({ status: "open" }, "Reopened.")}>Reopen</button>
      </section>
    );
  }

  const agreed = meta.agreedFee ?? 0;
  const first = extraction.offerAmount;
  const uplift = first != null ? agreed - first : null;
  const cut = closeCut("deal-share", agreed);

  return (
    <>
      <section className="rounded-2xl bg-[#14110e] p-4 text-[#f6f1e8]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-300">Won</p>
        <p className="mt-1 font-serif text-4xl tracking-tight">{formatINR(agreed)}</p>
        {uplift != null && uplift > 0 ? <p className="mt-1 text-sm text-emerald-300">+{formatINR(uplift)} over the first offer ({Math.round((uplift / (first || 1)) * 100)}%)</p> : null}
        <p className="mt-2 text-xs text-[#f6f1e8]/50">{cut.note} {formatINR(cut.cut)} recorded.</p>
        <button type="button" className="mt-3 text-xs text-[#f6f1e8]/55 underline hover:text-white" onClick={() => void onPatch({ status: "open" }, "Reopened.")}>Reopen</button>
      </section>

      {invoices.length ? (
        <section className="space-y-2">
          {invoices.map((invoice) => {
            const status = displayStatus(invoice);
            return (
              <div key={invoice.id} className="rounded-2xl border border-[#14110e]/12 bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">{invoice.number}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${status === "paid" ? "bg-emerald-100 text-emerald-800" : status === "overdue" ? "bg-[#ff5a36] text-[#14110e]" : "bg-[#14110e]/10 text-[#14110e]/70"}`}>{status.replace("_", " ")}</span>
                </div>
                <p className="mt-1 text-sm">{formatINR(invoice.total)} · due {formatDate(invoice.dueOn)}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href={`/invoice/${invoice.id}`} className={buttonGhostLight}>Open</Link>
                  {invoice.status === "draft" || invoice.status === "sent" || invoice.status === "partially_paid" ? (
                    <button type="button" className={buttonInk} onClick={() => void sendInvoice(invoice)} disabled={busy || !invoice.billToEmail}>{invoice.status === "draft" ? "Send invoice" : "Send again"}</button>
                  ) : null}
                  <Link href="/money" className={buttonGhostLight}>Money</Link>
                </div>
              </div>
            );
          })}
        </section>
      ) : (
        <section className="rounded-2xl border border-[#14110e]/12 bg-white p-4">
          <h3 className="text-sm font-semibold">Create the invoice</h3>
          <div className="mt-3 grid gap-2">
            <label className="grid gap-1 text-xs text-[#14110e]/55">Bill to<input className={inputLight} value={billName} onChange={(event) => setBillName(event.target.value)} /></label>
            <label className="grid gap-1 text-xs text-[#14110e]/55">Billing email<input className={inputLight} value={contact} onChange={(event) => setContact(event.target.value)} placeholder="accounts@brand.com" /></label>
            <label className="grid gap-1 text-xs text-[#14110e]/55">Line item<input className={inputLight} value={line} onChange={(event) => setLine(event.target.value)} /></label>
            <div className="grid grid-cols-2 gap-2">
              <label className="grid gap-1 text-xs text-[#14110e]/55">Advance, %<input className={inputLight} inputMode="numeric" value={advance} onChange={(event) => setAdvance(event.target.value.replace(/[^\d]/g, ""))} /></label>
              <label className="grid gap-1 text-xs text-[#14110e]/55">Due in, days<input className={inputLight} inputMode="numeric" value={dueIn} onChange={(event) => setDueIn(event.target.value.replace(/[^\d]/g, ""))} /></label>
            </div>
            <label className="flex items-center gap-2 text-sm text-[#14110e]/70"><input type="checkbox" className="h-4 w-4 accent-[#ff5a36]" checked={gst} onChange={(event) => setGst(event.target.checked)} />Add 18% GST{profile?.gstin ? "" : " (add your GSTIN in Settings)"}</label>
          </div>
          <button type="button" className={`${buttonInk} mt-3`} onClick={() => void createInvoice()} disabled={busy}>Create invoice for {formatINR(agreed)}{gst ? " + GST" : ""}</button>
          {!profile?.upiId && !profile?.legalName ? <p className="mt-2 text-xs text-[#14110e]/50">Add your legal name and UPI ID in <Link href="/settings#invoice" className="underline">Settings</Link> so they print on the invoice.</p> : null}
        </section>
      )}
    </>
  );
}
