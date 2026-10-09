"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { api, buttonHot, ease, inputLight } from "@/components/ui";
import { PAYMENT_OPTIONS } from "@/lib/brief";

type Form = {
  brandName: string;
  contactName: string;
  email: string;
  campaign: string;
  reels: string;
  stories: string;
  posts: string;
  otherDeliverables: string;
  budget: string;
  usageDays: string;
  exclusivityDays: string;
  deadline: string;
  payment: string;
  message: string;
  website: string;
};

const EMPTY: Form = {
  brandName: "",
  contactName: "",
  email: "",
  campaign: "",
  reels: "1",
  stories: "0",
  posts: "0",
  otherDeliverables: "",
  budget: "",
  usageDays: "30",
  exclusivityDays: "0",
  deadline: "",
  payment: PAYMENT_OPTIONS[1],
  message: "",
  website: "",
};

function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={`grid gap-1.5 text-sm ${wide ? "sm:col-span-2" : ""}`}>
      <span className="text-[#14110e]/60">{label}</span>
      {children}
    </label>
  );
}

const digits = (value: string) => value.replace(/[^\d]/g, "");

export function BriefForm({ handle, name }: { handle: string; name: string }) {
  const [form, setForm] = useState<Form>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const set = (key: keyof Form) => (event: { target: { value: string } }) => setForm((current) => ({ ...current, [key]: event.target.value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/brief", {
        method: "POST",
        json: {
          ...form,
          handle,
          reels: Number(form.reels) || 0,
          stories: Number(form.stories) || 0,
          posts: Number(form.posts) || 0,
          budget: form.budget ? Number(form.budget) : null,
          usageDays: form.usageDays === "" ? null : Number(form.usageDays),
          exclusivityDays: form.exclusivityDays === "" ? null : Number(form.exclusivityDays),
          deadline: form.deadline || null,
        },
      });
      setSent(true);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "The brief was not sent.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence mode="wait">
      {sent ? (
        <motion.div key="sent" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }} className="rounded-3xl bg-[#f6f1e8] p-8 text-[#14110e]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#ff5a36]">Sent</p>
          <h2 className="mt-2 font-serif text-4xl tracking-tight">{name} has your brief.</h2>
          <p className="mt-3 text-[#14110e]/60">You'll get a reply at {form.email}, usually within a day.</p>
        </motion.div>
      ) : (
        <motion.form key="form" onSubmit={submit} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease }} className="relative overflow-hidden rounded-3xl bg-[#f6f1e8] p-6 text-[#14110e] sm:p-8">
          <div className="absolute -left-[9999px]" aria-hidden="true">
            <label>Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} /></label>
          </div>
          <h2 className="font-serif text-3xl tracking-tight">Send a brief</h2>
          <p className="mt-1 text-sm text-[#14110e]/55">Two minutes. A clear brief gets a faster yes.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field label="Brand"><input required className={inputLight} value={form.brandName} onChange={set("brandName")} placeholder="Minimalist" /></Field>
            <Field label="Campaign"><input className={inputLight} value={form.campaign} onChange={set("campaign")} placeholder="Winter launch" /></Field>
            <Field label="Your name"><input className={inputLight} value={form.contactName} onChange={set("contactName")} /></Field>
            <Field label="Work email"><input required type="email" className={inputLight} value={form.email} onChange={set("email")} placeholder="you@brand.com" /></Field>
          </div>
          <p className="mt-6 text-sm font-semibold">Deliverables</p>
          <div className="mt-2 grid grid-cols-3 gap-3">
            <Field label="Reels"><input className={inputLight} inputMode="numeric" value={form.reels} onChange={(event) => setForm((c) => ({ ...c, reels: digits(event.target.value) }))} /></Field>
            <Field label="Stories"><input className={inputLight} inputMode="numeric" value={form.stories} onChange={(event) => setForm((c) => ({ ...c, stories: digits(event.target.value) }))} /></Field>
            <Field label="Posts"><input className={inputLight} inputMode="numeric" value={form.posts} onChange={(event) => setForm((c) => ({ ...c, posts: digits(event.target.value) }))} /></Field>
          </div>
          <div className="mt-3"><Field label="Anything else"><input className={inputLight} value={form.otherDeliverables} onChange={set("otherDeliverables")} placeholder="YouTube integration, link in bio for 7 days" /></Field></div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field label="Budget, ₹"><input className={inputLight} inputMode="numeric" value={form.budget} onChange={(event) => setForm((c) => ({ ...c, budget: digits(event.target.value) }))} placeholder="40000" /></Field>
            <Field label="Go live by"><input type="date" className={inputLight} value={form.deadline} onChange={set("deadline")} /></Field>
            <Field label="Usage rights, days"><input className={inputLight} inputMode="numeric" value={form.usageDays} onChange={(event) => setForm((c) => ({ ...c, usageDays: digits(event.target.value) }))} /></Field>
            <Field label="Exclusivity, days (0 for none)"><input className={inputLight} inputMode="numeric" value={form.exclusivityDays} onChange={(event) => setForm((c) => ({ ...c, exclusivityDays: digits(event.target.value) }))} /></Field>
            <Field label="Payment" wide>
              <select className={inputLight} value={form.payment} onChange={set("payment")}>
                {PAYMENT_OPTIONS.map((option) => <option key={option}>{option}</option>)}
              </select>
            </Field>
            <Field label="Message" wide><textarea className={`${inputLight} min-h-24`} value={form.message} onChange={set("message")} placeholder="The product, the brief, links to references." /></Field>
          </div>
          {error ? <p className="mt-4 text-sm text-[#c4321a]">{error}</p> : null}
          <button type="submit" className={`${buttonHot} mt-6 w-full py-3`} disabled={busy}>{busy ? "Sending…" : `Send to ${name}`}</button>
          <p className="mt-3 text-center text-xs text-[#14110e]/40">Only {name} sees this brief.</p>
        </motion.form>
      )}
    </AnimatePresence>
  );
}
