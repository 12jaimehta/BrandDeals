"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { CountTo, Kicker, Toast, api, buttonCream, buttonGhostDark, buttonHot, ease, inputDark, useToast } from "@/components/ui";
import { closeCut } from "@/lib/commercial.mjs";
import type { DeskConversation } from "@/lib/deal-rows";
import { balanceOf, displayStatus, type Invoice } from "@/lib/invoice.mjs";
import { formatDate, formatINR } from "@/lib/read-deal.mjs";

type View = "open" | "paid" | "all";

const tone: Record<string, string> = {
  draft: "bg-white/10 text-[#f6f1e8]/70",
  sent: "bg-sky-400/15 text-sky-200",
  partially_paid: "bg-amber-400/15 text-amber-200",
  paid: "bg-emerald-400/15 text-emerald-200",
  overdue: "bg-[#ff5a36] text-[#14110e]",
  void: "bg-white/5 text-[#f6f1e8]/35 line-through",
};

export function MoneyBoard({ conversations, initialInvoices, gmailConnected }: { conversations: DeskConversation[]; initialInvoices: Invoice[]; gmailConnected: boolean }) {
  const [invoices, setInvoices] = useState(initialInvoices);
  const [view, setView] = useState<View>("open");
  const [busy, setBusy] = useState<string | null>(null);
  const [partial, setPartial] = useState<{ id: string; value: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ brand: "", billToName: "", billToEmail: "", label: "", amount: "", gst: false, dueInDays: "15" });
  const [toast, showToast] = useToast();

  const stats = useMemo(() => {
    const deals = conversations.filter((item) => item.extraction.isBrandOpportunity);
    const open = deals.filter((item) => item.meta.status === "open" && !item.meta.dismissed);
    const won = deals.filter((item) => item.meta.status === "won");
    const pipeline = open.reduce((sum, item) => sum + (item.extraction.offerAmount ?? 0), 0);
    const wonTotal = won.reduce((sum, item) => sum + (item.meta.agreedFee ?? 0), 0);
    const uplift = won.reduce((sum, item) => {
      const first = item.extraction.offerAmount;
      return first != null && item.meta.agreedFee != null && item.meta.agreedFee > first ? sum + item.meta.agreedFee - first : sum;
    }, 0);
    const live = invoices.filter((invoice) => invoice.status !== "void");
    const outstanding = live.filter((invoice) => invoice.status !== "draft").reduce((sum, invoice) => sum + balanceOf(invoice), 0);
    const collected = live.reduce((sum, invoice) => sum + invoice.paidAmount, 0);
    const overdue = live.filter((invoice) => displayStatus(invoice) === "overdue");
    return { open: open.length, won: won.length, pipeline, wonTotal, uplift, outstanding, collected, overdue, fee: closeCut("deal-share", wonTotal).cut };
  }, [conversations, invoices]);

  const shown = invoices.filter((invoice) => {
    if (view === "all") return true;
    if (view === "paid") return invoice.status === "paid";
    return invoice.status !== "paid" && invoice.status !== "void";
  });

  function replace(invoice: Invoice) {
    setInvoices((current) => current.map((item) => (item.id === invoice.id ? invoice : item)));
  }

  async function patch(invoice: Invoice, body: Record<string, unknown>, message: string) {
    setBusy(invoice.id);
    try {
      const result = await api<{ invoice: Invoice }>(`/api/invoices/${invoice.id}`, { method: "PATCH", json: body });
      replace(result.invoice);
      showToast(message);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Not saved.");
    } finally {
      setBusy(null);
    }
  }

  async function send(invoice: Invoice) {
    setBusy(invoice.id);
    try {
      const result = await api<{ invoice: Invoice }>(`/api/invoices/${invoice.id}/send`, { method: "POST" });
      replace(result.invoice);
      showToast(`${invoice.number} sent to ${invoice.billToEmail}.`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Not sent.");
    } finally {
      setBusy(null);
    }
  }

  async function create() {
    setBusy("new");
    try {
      const { invoice } = await api<{ invoice: Invoice }>("/api/invoices", {
        method: "POST",
        json: {
          brand: draft.brand,
          billToName: draft.billToName || draft.brand,
          billToEmail: draft.billToEmail,
          items: [{ label: draft.label || `${draft.brand} collaboration`, amount: Number(draft.amount) }],
          gstRate: draft.gst ? 18 : 0,
          dueInDays: Number(draft.dueInDays) || 15,
        },
      });
      setInvoices((current) => [invoice, ...current]);
      setCreating(false);
      setDraft({ brand: "", billToName: "", billToEmail: "", label: "", amount: "", gst: false, dueInDays: "15" });
      showToast(`${invoice.number} created.`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Not created.");
    } finally {
      setBusy(null);
    }
  }

  const cards: Array<{ label: string; value: number; note: string; hot?: boolean }> = [
    { label: "Won", value: stats.wonTotal, note: `${stats.won} deal${stats.won === 1 ? "" : "s"} closed` },
    { label: "Negotiated up", value: stats.uplift, note: "Above the brands' first offers", hot: true },
    { label: "Waiting to be paid", value: stats.outstanding, note: stats.overdue.length ? `${stats.overdue.length} overdue` : "Nothing overdue" },
    { label: "Collected", value: stats.collected, note: "Marked paid on invoices" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-5 pb-24 pt-28 sm:px-8">
      <Kicker>Money</Kicker>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-serif text-5xl tracking-tight sm:text-6xl">What you've earned, and what you're owed.</h1>
        <button type="button" className={buttonHot} onClick={() => setCreating((value) => !value)}>{creating ? "Close" : "New invoice"}</button>
      </div>

      <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card, index) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: index * 0.06, ease }} className={`rounded-3xl p-5 ${card.hot ? "bg-[#ff5a36] text-[#14110e]" : "border border-white/10 bg-white/[0.03]"}`}>
            <p className={`text-xs uppercase tracking-[0.14em] ${card.hot ? "text-[#14110e]/65" : "text-[#f6f1e8]/45"}`}>{card.label}</p>
            <p className="mt-3 font-serif text-4xl tracking-tight"><CountTo from={0} to={card.value} delay={0.1 + index * 0.06} /></p>
            <p className={`mt-1 text-xs ${card.hot ? "text-[#14110e]/65" : "text-[#f6f1e8]/45"}`}>{card.note}</p>
          </motion.div>
        ))}
      </div>
      <p className="mt-4 text-sm text-[#f6f1e8]/45">{stats.open} open deal{stats.open === 1 ? "" : "s"} worth {formatINR(stats.pipeline)} in first offers. Counter's 5% on closed deals: {formatINR(stats.fee)}.</p>

      <AnimatePresence initial={false}>
        {creating ? (
          <motion.section key="new" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3, ease }} className="overflow-hidden">
            <div className="mt-8 grid gap-3 rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:grid-cols-2">
              <input className={inputDark} placeholder="Brand" value={draft.brand} onChange={(event) => setDraft({ ...draft, brand: event.target.value })} />
              <input className={inputDark} placeholder="Billing email" value={draft.billToEmail} onChange={(event) => setDraft({ ...draft, billToEmail: event.target.value })} />
              <input className={inputDark} placeholder="Bill to (company name)" value={draft.billToName} onChange={(event) => setDraft({ ...draft, billToName: event.target.value })} />
              <input className={inputDark} placeholder="Line item, e.g. 1 Reel + 2 Stories" value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} />
              <input className={inputDark} inputMode="numeric" placeholder="Amount, ₹" value={draft.amount} onChange={(event) => setDraft({ ...draft, amount: event.target.value.replace(/[^\d]/g, "") })} />
              <input className={inputDark} inputMode="numeric" placeholder="Due in days" value={draft.dueInDays} onChange={(event) => setDraft({ ...draft, dueInDays: event.target.value.replace(/[^\d]/g, "") })} />
              <label className="flex items-center gap-2 text-sm text-[#f6f1e8]/70"><input type="checkbox" className="h-4 w-4 accent-[#ff5a36]" checked={draft.gst} onChange={(event) => setDraft({ ...draft, gst: event.target.checked })} />Add 18% GST</label>
              <button type="button" className={buttonCream} onClick={() => void create()} disabled={busy === "new" || !draft.brand || !draft.amount}>Create invoice</button>
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>

      <div className="mt-12 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-3xl tracking-tight">Invoices</h2>
        <div className="flex gap-1 rounded-full bg-white/[0.06] p-1 text-sm">
          {(["open", "paid", "all"] as View[]).map((id) => (
            <button key={id} type="button" onClick={() => setView(id)} className={`rounded-full px-3 py-1 capitalize transition ${view === id ? "bg-[#f6f1e8] text-[#14110e]" : "text-[#f6f1e8]/60 hover:text-white"}`}>{id}</button>
          ))}
        </div>
      </div>
      {!gmailConnected ? <p className="mt-2 text-sm text-[#ff5a36]">Connect Gmail to email invoices and let the agent chase payments. <Link href="/connect" className="underline">Connect</Link></p> : null}

      {shown.length ? (
        <ul className="mt-4 divide-y divide-white/10 rounded-3xl border border-white/10">
          {shown.map((invoice) => {
            const status = displayStatus(invoice);
            const balance = balanceOf(invoice);
            const closed = invoice.status === "paid" || invoice.status === "void";
            return (
              <li key={invoice.id} className="grid gap-3 px-5 py-4 lg:grid-cols-[1.4fr_1fr_auto] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/invoice/${invoice.id}`} className="font-semibold hover:underline">{invoice.number}</Link>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${tone[status]}`}>{status.replace("_", " ")}</span>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-[#f6f1e8]/55">{invoice.brand || invoice.billToName}{invoice.billToEmail ? ` · ${invoice.billToEmail}` : ""}</p>
                </div>
                <div className="text-sm">
                  <p className="font-semibold">{formatINR(invoice.total)}{invoice.paidAmount > 0 && !closed ? <span className="font-normal text-[#f6f1e8]/50"> · {formatINR(balance)} left</span> : null}</p>
                  <p className="text-[#f6f1e8]/45">Due {formatDate(invoice.dueOn)}{invoice.remindersSent ? ` · ${invoice.remindersSent} reminder${invoice.remindersSent === 1 ? "" : "s"} sent` : ""}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!closed ? (
                    <>
                      <button type="button" className={buttonCream} disabled={busy === invoice.id} onClick={() => void patch(invoice, { status: "paid" }, `${invoice.number} marked paid.`)}>Paid</button>
                      <button type="button" className={buttonGhostDark} disabled={busy === invoice.id} onClick={() => setPartial(partial?.id === invoice.id ? null : { id: invoice.id, value: "" })}>Part paid</button>
                      <button type="button" className={buttonGhostDark} disabled={busy === invoice.id || !invoice.billToEmail || !gmailConnected} onClick={() => void send(invoice)}>{invoice.status === "draft" ? "Send" : "Resend"}</button>
                    </>
                  ) : null}
                  <Link href={`/invoice/${invoice.id}`} className={buttonGhostDark}>Open</Link>
                </div>
                {partial?.id === invoice.id ? (
                  <div className="flex flex-wrap items-center gap-2 lg:col-span-3">
                    <input autoFocus className={`${inputDark} max-w-48`} inputMode="numeric" placeholder="Total received so far, ₹" value={partial.value} onChange={(event) => setPartial({ id: invoice.id, value: event.target.value.replace(/[^\d]/g, "") })} />
                    <button type="button" className={buttonCream} disabled={!partial.value} onClick={() => { void patch(invoice, { paidAmount: Number(partial.value) }, "Payment recorded."); setPartial(null); }}>Save</button>
                    {invoice.status === "draft" ? <button type="button" className={buttonGhostDark} onClick={() => void patch(invoice, { status: "void" }, "Voided.")}>Void</button> : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-4 rounded-3xl border border-dashed border-white/15 px-6 py-12 text-center text-[#f6f1e8]/55">
          {invoices.length ? "Nothing here." : <>No invoices yet. Mark a deal won on your <Link href="/deals" className="underline">desk</Link> and create one in a tap.</>}
        </div>
      )}
      <Toast message={toast} />
    </div>
  );
}
