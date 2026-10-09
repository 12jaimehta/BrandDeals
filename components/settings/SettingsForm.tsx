"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Kicker, Switch, Toast, api, buttonCream, buttonGhostDark, buttonHot, ease, inputDark, useToast } from "@/components/ui";
import { CATEGORIES, type Autopilot } from "@/lib/agent.mjs";
import type { CreatorProfile } from "@/lib/profile";
import { formatINR } from "@/lib/read-deal.mjs";
import type { Settings } from "@/lib/settings";

const pilotRows: Array<{ key: Exclude<keyof Autopilot, "enabled">; title: string; body: string; risky?: boolean }> = [
  { key: "askBudget", title: "Ask for the budget", body: "When a brand pitches without a number, ask what they've set aside." },
  { key: "askTerms", title: "Ask for missing terms", body: "Usage, exclusivity, payment terms, deadline. Asked once, politely." },
  { key: "followUps", title: "Follow up", body: "Nudge a brand that went quiet for 48 hours. At most twice." },
  { key: "declineBlocked", title: "Decline blocked categories", body: "Say no to the categories you've blocked below." },
  { key: "paymentReminders", title: "Chase payments", body: "Remind brands 3 days before an invoice is due, on the day, then at 7 and 14 days late." },
  { key: "counter", title: "Send counters", body: "Send the counter the rate engine worked out. Never below your minimum. Off by default.", risky: true },
];

function Section({ id, kicker, title, body, children }: { id: string; kicker: string; title: string; body: string; children: ReactNode }) {
  return (
    <motion.section id={id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }} className="scroll-mt-24 rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-7">
      <Kicker>{kicker}</Kicker>
      <h2 className="mt-2 font-serif text-3xl tracking-tight">{title}</h2>
      <p className="mt-1 max-w-2xl text-sm leading-6 text-[#f6f1e8]/55">{body}</p>
      <div className="mt-6">{children}</div>
    </motion.section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="text-[#f6f1e8]/70">{label}</span>
      {children}
      {hint ? <span className="text-xs text-[#f6f1e8]/40">{hint}</span> : null}
    </label>
  );
}

const digits = (value: string) => value.replace(/[^\d]/g, "");

export function SettingsForm({ initialSettings, initialProfile, origin }: { initialSettings: Settings; initialProfile: CreatorProfile; origin: string }) {
  const [settings, setSettings] = useState(initialSettings);
  const [profile, setProfile] = useState(initialProfile);
  const [savedHandle, setSavedHandle] = useState(initialProfile.handle);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, showToast] = useToast();
  const rules = settings.rules;
  const pilot = settings.autopilot;

  function setRule<K extends keyof Settings["rules"]>(key: K, value: Settings["rules"][K]) {
    setSettings((current) => ({ ...current, rules: { ...current.rules, [key]: value } }));
  }
  function setPilot(key: keyof Autopilot, value: boolean) {
    setSettings((current) => ({ ...current, autopilot: { ...current.autopilot, [key]: value } }));
  }
  function setField<K extends keyof CreatorProfile>(key: K, value: CreatorProfile[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  async function saveRules(message = "Saved. The agent uses these from its next run.") {
    setBusy("rules");
    try {
      setSettings(await api<Settings>("/api/settings", { method: "PUT", json: settings }));
      showToast(message);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Not saved.");
    } finally {
      setBusy(null);
    }
  }

  async function saveProfile() {
    setBusy("profile");
    try {
      const saved = await api<CreatorProfile>("/api/profile", { method: "PUT", json: profile });
      setProfile(saved);
      setSavedHandle(saved.handle);
      showToast("Saved.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Not saved.");
    } finally {
      setBusy(null);
    }
  }

  const link = savedHandle ? `${origin}/c/${savedHandle}` : "";

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-5 pb-24 pt-28 sm:px-8">
      <div>
        <Kicker>Settings</Kicker>
        <h1 className="mt-3 font-serif text-5xl tracking-tight sm:text-6xl">Your rules. The agent's limits.</h1>
        <p className="mt-3 max-w-2xl text-[#f6f1e8]/60">The agent negotiates inside these lines and nowhere else. It can never accept a deal for you.</p>
      </div>

      <Section id="guardrails" kicker="Guardrails" title="What a deal must clear" body="Offers under your minimum get a counter. Usage and exclusivity past your caps get pushed back.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Minimum fee, ₹" hint={rules.minimumOffer ? `Nothing goes out below ${formatINR(rules.minimumOffer)}.` : "Set one. Counters never go below it."}>
            <input className={inputDark} inputMode="numeric" value={rules.minimumOffer || ""} onChange={(event) => setRule("minimumOffer", Number(digits(event.target.value)) || 0)} placeholder="25000" />
          </Field>
          <Field label="Usage included in your fee, days">
            <input className={inputDark} inputMode="numeric" value={rules.usageIncludedDays} onChange={(event) => setRule("usageIncludedDays", Number(digits(event.target.value)) || 0)} />
          </Field>
          <Field label="Charge per extra 30 days of usage, ₹">
            <input className={inputDark} inputMode="numeric" value={rules.usageUpliftPer30Days} onChange={(event) => setRule("usageUpliftPer30Days", Number(digits(event.target.value)) || 0)} />
          </Field>
          <Field label="Charge per 30 days of exclusivity, ₹">
            <input className={inputDark} inputMode="numeric" value={rules.exclusivityUpliftPer30Days} onChange={(event) => setRule("exclusivityUpliftPer30Days", Number(digits(event.target.value)) || 0)} />
          </Field>
          <Field label="Longest usage you'll grant, days" hint="Blank means no cap.">
            <input className={inputDark} inputMode="numeric" value={rules.maxUsageDays ?? ""} onChange={(event) => setRule("maxUsageDays", digits(event.target.value) ? Number(digits(event.target.value)) : null)} placeholder="90" />
          </Field>
          <Field label="Longest exclusivity you'll grant, days" hint="Blank means no cap.">
            <input className={inputDark} inputMode="numeric" value={rules.maxExclusivityDays ?? ""} onChange={(event) => setRule("maxExclusivityDays", digits(event.target.value) ? Number(digits(event.target.value)) : null)} placeholder="30" />
          </Field>
        </div>
        <h3 className="mt-8 text-sm font-semibold">Categories you never take</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {CATEGORIES.map((category) => {
            const on = rules.blockedCategories.includes(category.id);
            return (
              <button
                key={category.id}
                type="button"
                aria-pressed={on}
                onClick={() => setRule("blockedCategories", on ? rules.blockedCategories.filter((id) => id !== category.id) : [...rules.blockedCategories, category.id])}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${on ? "border-[#ff5a36] bg-[#ff5a36] text-[#14110e]" : "border-white/15 text-[#f6f1e8]/70 hover:border-white/35"}`}
              >
                {category.label}
              </button>
            );
          })}
        </div>
        <button type="button" className={`${buttonHot} mt-6`} onClick={() => void saveRules()} disabled={busy === "rules"}>{busy === "rules" ? "Saving…" : "Save guardrails"}</button>
      </Section>

      <Section id="autopilot" kicker="Autopilot" title="What the agent may send without asking" body="Everything else waits in your desk for one tap. A message that accepts a deal is never sent automatically, whatever you switch on here.">
        <div className="flex items-center justify-between gap-4 rounded-2xl bg-white/[0.04] px-4 py-4">
          <div>
            <p className="font-semibold">Autopilot</p>
            <p className="text-sm text-[#f6f1e8]/55">{pilot.enabled ? "On. It runs every time you sync, and once a day on its own." : "Off. The agent drafts; you send."}</p>
          </div>
          <Switch label="Autopilot" on={pilot.enabled} onChange={(next) => setPilot("enabled", next)} />
        </div>
        <ul className={`mt-3 divide-y divide-white/10 transition ${pilot.enabled ? "" : "opacity-50"}`}>
          {pilotRows.map((row) => (
            <li key={row.key} className="flex items-start justify-between gap-4 py-4">
              <div>
                <p className="font-medium">{row.title}{row.risky ? <span className="ml-2 rounded-full bg-[#ff5a36]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#ff5a36]">Money</span> : null}</p>
                <p className="mt-0.5 text-sm text-[#f6f1e8]/50">{row.body}</p>
              </div>
              <Switch label={row.title} on={pilot[row.key]} onChange={(next) => setPilot(row.key, next)} disabled={!pilot.enabled} />
            </li>
          ))}
          <li className="flex items-start justify-between gap-4 py-4">
            <div>
              <p className="font-medium">Accept a deal</p>
              <p className="mt-0.5 text-sm text-[#f6f1e8]/50">Only you can say yes. This can't be switched on.</p>
            </div>
            <Switch label="Accept a deal" on={false} onChange={() => undefined} disabled />
          </li>
        </ul>
        <button type="button" className={`${buttonHot} mt-4`} onClick={() => void saveRules(pilot.enabled ? "Autopilot is on." : "Saved.")} disabled={busy === "rules"}>{busy === "rules" ? "Saving…" : "Save autopilot"}</button>
      </Section>

      <Section id="link" kicker="Deal link" title="One link for every brand" body="Put it in your Instagram bio. Brands fill a short brief with their budget, deliverables, and terms, so there's nothing to chase.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Handle" hint="3 to 30 letters, numbers, dots, or underscores.">
            <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.04] pl-3 text-sm focus-within:border-[#ff5a36]/60">
              <span className="text-[#f6f1e8]/35">/c/</span>
              <input className="w-full bg-transparent px-1 py-2 text-[#f6f1e8] outline-none" value={profile.handle} onChange={(event) => setField("handle", event.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ""))} placeholder="yourname" />
            </div>
          </Field>
          <Field label="Name brands see">
            <input className={inputDark} value={profile.displayName} onChange={(event) => setField("displayName", event.target.value)} placeholder="Aanya Kapoor" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="One line about you">
              <input className={inputDark} value={profile.bio} onChange={(event) => setField("bio", event.target.value)} placeholder="Skincare and slow living. 180k on Instagram, mostly 18–30 in metro India." />
            </Field>
          </div>
          <Field label="Niches, comma separated">
            <input className={inputDark} value={profile.niches.join(", ")} onChange={(event) => setField("niches", event.target.value.split(",").map((item) => item.trimStart()).slice(0, 6))} placeholder="skincare, lifestyle" />
          </Field>
          <Field label="Starting price, ₹" hint="Shown on the link. Leave blank to hide it.">
            <input className={inputDark} inputMode="numeric" value={profile.startingPrice ?? ""} onChange={(event) => setField("startingPrice", digits(event.target.value) ? Number(digits(event.target.value)) : null)} />
          </Field>
        </div>
        <div className="mt-4 flex items-center justify-between gap-4 rounded-2xl bg-white/[0.04] px-4 py-3">
          <p className="text-sm">Taking new briefs</p>
          <Switch label="Taking new briefs" on={profile.accepting} onChange={(next) => setField("accepting", next)} />
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <button type="button" className={buttonHot} onClick={() => void saveProfile()} disabled={busy === "profile"}>{busy === "profile" ? "Saving…" : "Save deal link"}</button>
          {link ? (
            <>
              <button type="button" className={buttonCream} onClick={() => navigator.clipboard?.writeText(link).then(() => showToast("Link copied. Put it in your bio."), () => undefined)}>Copy link</button>
              <Link className={buttonGhostDark} href={`/c/${savedHandle}`} target="_blank">Preview</Link>
            </>
          ) : null}
        </div>
        {link ? <p className="mt-3 break-all text-sm text-[#f6f1e8]/45">{link}</p> : null}
      </Section>

      <Section id="invoice" kicker="Invoices" title="What prints on your invoices" body="Used on every invoice and agreement. Stored only on your account.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Legal name">
            <input className={inputDark} value={profile.legalName} onChange={(event) => setField("legalName", event.target.value)} />
          </Field>
          <Field label="UPI ID" hint="Brands can pay you straight from the invoice.">
            <input className={inputDark} value={profile.upiId} onChange={(event) => setField("upiId", event.target.value)} placeholder="name@okaxis" />
          </Field>
          <Field label="PAN">
            <input className={inputDark} value={profile.pan} onChange={(event) => setField("pan", event.target.value.toUpperCase())} placeholder="ABCDE1234F" />
          </Field>
          <Field label="GSTIN" hint="Leave blank if you aren't registered. Invoices then skip GST.">
            <input className={inputDark} value={profile.gstin} onChange={(event) => setField("gstin", event.target.value.toUpperCase())} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Razorpay payout account" hint="Brands pay invoices online through Counter; your share, minus Razorpay's fee and Counter's 5%, settles here automatically. We send you this ID (acc_…) after a short KYC. Leave blank to use UPI only.">
              <input className={inputDark} value={profile.razorpayAccountId} onChange={(event) => setField("razorpayAccountId", event.target.value.trim())} placeholder="acc_XXXXXXXXXXXXXX" />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Billing address">
              <textarea className={`${inputDark} min-h-20`} value={profile.address} onChange={(event) => setField("address", event.target.value)} />
            </Field>
          </div>
        </div>
        <button type="button" className={`${buttonHot} mt-6`} onClick={() => void saveProfile()} disabled={busy === "profile"}>{busy === "profile" ? "Saving…" : "Save invoice details"}</button>
        {!profile.handle ? <p className="mt-2 text-xs text-[#f6f1e8]/45">Pick a deal-link handle above first. Your profile saves with it.</p> : null}
      </Section>

      <Section id="inboxes" kicker="Inboxes" title="Gmail and Instagram" body="Connect, reconnect, or disconnect the inboxes the agent reads.">
        <Link href="/connect" className={buttonCream}>Manage inboxes</Link>
      </Section>
      <Toast message={toast} />
    </div>
  );
}
