"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, LayoutGroup, MotionConfig, motion } from "framer-motion";
import { SiteHeader } from "@/components/SiteHeader";
import { Toast, api, ease, snap, useToast } from "@/components/ui";
import { DealPanel } from "@/components/desk/DealPanel";
import { canAutoSend, categoryLabel, lastFromThem, planDeal, type PlannedAction } from "@/lib/agent.mjs";
import { activityLabel, type Activity } from "@/lib/activity";
import type { DealMeta, DeskConversation } from "@/lib/deal-rows";
import type { Invoice } from "@/lib/invoice.mjs";
import type { CreatorProfile } from "@/lib/profile";
import { belowMinimum, daysUntil, formatDate, formatINR, formatWhen } from "@/lib/read-deal.mjs";
import type { Settings } from "@/lib/settings";

type Filter = "needs" | "deals" | "waiting" | "below" | "closed" | "aside";
type SourceKey = "gmail" | "instagram" | "link";

export type Planned = {
  plan: PlannedAction | null;
  auto: { ok: boolean; reason: string };
};

const STORAGE_SOURCES = "counter:sources";
const STORAGE_AUTO = "counter:auto-sync";

const notices: Record<string, string> = {
  error: "Google sign-in did not finish. Check the Supabase Google provider and redirect URL.",
  "signed-in": "Gmail is connected. Press Sync to read it.",
  instagram: "Instagram is connected. Press Sync to read DMs.",
};

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
}

function loadSources(): Record<SourceKey, boolean> {
  try {
    return { gmail: true, instagram: true, link: true, ...JSON.parse(localStorage.getItem(STORAGE_SOURCES) || "{}") };
  } catch {
    return { gmail: true, instagram: true, link: true };
  }
}

export function Desk({
  email,
  creatorName,
  profile,
  supabaseConfigured,
  gmailConnected,
  instagramConnected,
  initialConversations,
  initialActivity,
  initialInvoices,
  initialSettings,
  authNotice,
}: {
  email: string | null;
  creatorName: string;
  profile: CreatorProfile | null;
  supabaseConfigured: boolean;
  gmailConnected: boolean;
  instagramConnected: boolean;
  initialConversations: DeskConversation[];
  initialActivity: Activity[];
  initialInvoices: Invoice[];
  initialSettings: Settings;
  authNotice: string | null;
}) {
  const [conversations, setConversations] = useState(initialConversations);
  const [activity, setActivity] = useState(initialActivity);
  const [invoices, setInvoices] = useState(initialInvoices);
  const [settings, setSettings] = useState(initialSettings);
  const [selectedId, setSelectedId] = useState("");
  const [filter, setFilter] = useState<Filter | null>(null);
  const [sources, setSources] = useState<Record<SourceKey, boolean>>({ gmail: true, instagram: true, link: true });
  const [autoSync, setAutoSync] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [pane, setPane] = useState<"list" | "thread" | "deal">("list");
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [toast, setToast] = useToast(4200);
  const busy = useRef(false);
  const booted = useRef(false);
  const syncRef = useRef(async (_quiet?: boolean) => {});
  const now = useMemo(() => new Date(), [conversations, activity]); // eslint-disable-line react-hooks/exhaustive-deps

  const live: Record<SourceKey, boolean> = { gmail: gmailConnected, instagram: instagramConnected, link: true };

  useEffect(() => {
    setSources(loadSources());
    const storedAuto = localStorage.getItem(STORAGE_AUTO);
    if (storedAuto != null) setAutoSync(storedAuto === "true");
    if (authNotice && notices[authNotice]) setToast(notices[authNotice]);
  }, [authNotice, setToast]);

  useEffect(() => {
    if (!fresh.size) return;
    const timer = window.setTimeout(() => setFresh(new Set()), 6000);
    return () => window.clearTimeout(timer);
  }, [fresh]);

  const planned = useMemo(() => {
    const map = new Map<string, Planned>();
    for (const conversation of conversations) {
      if (!conversation.extraction.isBrandOpportunity) continue;
      const plan = planDeal({
        conversation,
        extraction: conversation.extraction,
        rules: settings.rules,
        category: conversation.meta.category,
        status: conversation.meta.status,
        creatorName,
        now,
      });
      const auto = canAutoSend(plan, settings.autopilot, {
        source: conversation.source,
        lastThemAt: lastFromThem(conversation)?.at ?? null,
        minimumOffer: settings.rules.minimumOffer,
        now,
      });
      map.set(conversation.id, { plan, auto });
    }
    return map;
  }, [conversations, settings, creatorName, now]);

  const reminderDue = useCallback((meta: DealMeta) => Boolean(meta.followUpOn && !meta.followedUp && daysUntil(meta.followUpOn) <= 0), []);

  const matches = useCallback((conversation: DeskConversation, mode: Filter) => {
    if (!conversation.extraction.isBrandOpportunity) return false;
    if (!sources[conversation.source]) return false;
    const { meta } = conversation;
    if (mode === "closed") return meta.status !== "open";
    if (meta.status !== "open") return false;
    if (mode === "aside") return meta.dismissed;
    if (meta.dismissed) return false;
    const entry = planned.get(conversation.id);
    if (mode === "needs") {
      if (reminderDue(meta)) return true;
      const plan = entry?.plan;
      return Boolean(plan?.text && plan.kind !== "waiting" && !entry?.auto.ok);
    }
    if (mode === "waiting") return entry?.plan?.kind === "waiting";
    if (mode === "below") return belowMinimum(conversation.extraction, settings.rules.minimumOffer);
    return true;
  }, [planned, reminderDue, settings.rules.minimumOffer, sources]);

  const count = (mode: Filter) => conversations.filter((conversation) => matches(conversation, mode)).length;
  const needsCount = count("needs");
  const activeFilter: Filter = filter ?? (needsCount ? "needs" : "deals");

  const visible = useMemo(() => conversations
    .filter((conversation) => matches(conversation, activeFilter))
    .sort((a, b) => {
      if (activeFilter === "needs") {
        const rank = (item: DeskConversation) => (planned.get(item.id)?.plan?.kind === "ready_for_yes" ? 0 : 1);
        const diff = rank(a) - rank(b);
        if (diff) return diff;
      }
      return new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime();
    }), [activeFilter, conversations, matches, planned]);

  const selected = visible.find((item) => item.id === selectedId) ?? visible[0] ?? null;

  function select(id: string, openThread = true) {
    setSelectedId(id);
    setSeen((current) => new Set(current).add(id));
    if (openThread) setPane("thread");
  }

  function chooseFilter(next: Filter) {
    setFilter(next);
    const upcoming = conversations.filter((conversation) => matches(conversation, next));
    if (upcoming.length && !upcoming.some((item) => item.id === selectedId)) setSelectedId(upcoming[0].id);
  }

  const refresh = useCallback(async () => {
    try {
      const [desk, money] = await Promise.all([
        api<{ conversations: DeskConversation[]; activity: Activity[] }>("/api/conversations"),
        api<{ invoices: Invoice[] }>("/api/invoices"),
      ]);
      setConversations(desk.conversations);
      setActivity(desk.activity);
      setInvoices(money.invoices);
    } catch {
      // Keep what is on screen.
    }
  }, []);

  const runAgent = useCallback(async (quiet = false) => {
    try {
      const result = await api<{ ran: boolean; sent: { title: string }[]; held: number; reminders: number; failures: string[]; reason?: string }>("/api/agent/run", { method: "POST" });
      if (!result.ran) {
        if (!quiet) setToast(result.reason || "Autopilot is off.");
        return;
      }
      if (result.sent.length || result.reminders) await refresh();
      const parts = [];
      if (result.sent.length) parts.push(`sent ${result.sent.length} ${result.sent.length === 1 ? "message" : "messages"}`);
      if (result.reminders) parts.push(`sent ${result.reminders} payment ${result.reminders === 1 ? "reminder" : "reminders"}`);
      if (result.held) parts.push(`held ${result.held} for you`);
      if (result.failures.length) parts.push(`${result.failures.length} failed: ${result.failures[0]}`);
      if (!quiet || result.sent.length || result.reminders || result.failures.length) {
        setToast(parts.length ? `Autopilot ${parts.join(", ")}.` : "Autopilot had nothing to send.");
      }
    } catch (error) {
      if (!quiet) setToast(error instanceof Error ? error.message : "Autopilot did not run.");
    }
  }, [refresh, setToast]);

  async function syncSource(source: "gmail" | "instagram", quiet: boolean) {
    setSyncing(source);
    const name = source === "gmail" ? "Gmail" : "Instagram";
    try {
      const body = await api<{ conversations: DeskConversation[]; brandDeals: number; modelErrors: number }>(`/api/${source}/sync`, { method: "POST" });
      const incoming = body.conversations ?? [];
      setConversations((current) => {
        const known = new Set(current.map((item) => item.id));
        const added = incoming.filter((item) => !known.has(item.id) && item.extraction.isBrandOpportunity);
        if (added.length) setFresh((prev) => new Set([...prev, ...added.map((item) => item.id)]));
        const byId = new Map(current.map((item) => [item.id, item]));
        for (const item of incoming) byId.set(item.id, item);
        return [...byId.values()];
      });
      if (!quiet) {
        const noun = body.brandDeals === 1 ? "brand deal" : "brand deals";
        setToast(`Read ${name}. ${body.brandDeals} ${noun}.${body.modelErrors ? ` ${body.modelErrors} read with the backup reader.` : ""}`);
      }
    } catch (error) {
      if (!quiet) setToast(error instanceof Error ? error.message : `${name} sync failed.`);
    }
  }

  async function syncAll(quiet = false) {
    if (busy.current) return;
    const order = (["gmail", "instagram"] as const).filter((source) => live[source]);
    busy.current = true;
    try {
      for (const source of order) await syncSource(source, quiet);
      setSyncing("link");
      await refresh();
      if (settings.autopilot.enabled) {
        setSyncing("agent");
        await runAgent(true);
      }
      if (!order.length && !quiet) setToast("Deal-link briefs are up to date. Connect Gmail or Instagram to read your inboxes.");
    } finally {
      busy.current = false;
      setSyncing(null);
    }
  }

  syncRef.current = syncAll;

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    if (email && !initialConversations.length && (gmailConnected || instagramConnected)) void syncRef.current();
  }, [email, initialConversations.length, gmailConnected, instagramConnected]);

  useEffect(() => {
    if (!email || !autoSync) return;
    const timer = window.setInterval(() => void syncRef.current(true), 300000);
    return () => window.clearInterval(timer);
  }, [autoSync, email]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isTyping(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key.toLowerCase();
      if ((key !== "j" && key !== "k") || !visible.length) return;
      const at = Math.max(0, visible.findIndex((item) => item.id === selected?.id));
      const next = visible[Math.min(visible.length - 1, Math.max(0, at + (key === "j" ? 1 : -1)))];
      if (!next) return;
      select(next.id, false);
      document.getElementById(`thread-${next.id}`)?.scrollIntoView({ block: "nearest" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function toggleSource(source: SourceKey) {
    const next = { ...sources, [source]: !sources[source] };
    setSources(next);
    localStorage.setItem(STORAGE_SOURCES, JSON.stringify(next));
  }

  async function toggleAutopilot(enabled: boolean) {
    const next = { ...settings, autopilot: { ...settings.autopilot, enabled } };
    setSettings(next);
    try {
      await api("/api/settings", { method: "PUT", json: next });
      if (enabled) {
        const allowed = [
          next.autopilot.askBudget && "budget asks",
          next.autopilot.askTerms && "missing-term asks",
          next.autopilot.followUps && "follow-ups",
          next.autopilot.declineBlocked && "blocked-category declines",
          next.autopilot.counter && "counters within your limits",
          next.autopilot.paymentReminders && "payment reminders",
        ].filter(Boolean);
        setToast(`Autopilot is on. It sends ${allowed.join(", ") || "nothing yet"}. It can never accept a deal.`);
        void runAgent(true);
      } else {
        setToast("Autopilot is off. Every message waits for you.");
      }
    } catch (error) {
      setSettings(settings);
      setToast(error instanceof Error ? error.message : "Autopilot setting was not saved.");
    }
  }

  function patchLocal(id: string, patch: Partial<DeskConversation>) {
    setConversations((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  async function patchDeal(id: string, patch: Record<string, unknown>, message?: string) {
    try {
      const { meta } = await api<{ meta: DealMeta }>(`/api/deals/${id}`, { method: "PATCH", json: patch });
      patchLocal(id, { meta });
      if (message) setToast(message);
      return true;
    } catch (error) {
      setToast(error instanceof Error ? error.message : "That change was not saved.");
      return false;
    }
  }

  async function sendReply(conversation: DeskConversation, text: string, kind: string) {
    try {
      const body = await api<{ at: string; channel: string }>("/api/reply/send", { method: "POST", json: { id: conversation.id, text, kind } });
      patchLocal(conversation.id, { messages: [...conversation.messages, { from: "you", at: body.at, text }], receivedAt: body.at });
      setActivity((current) => [{ id: crypto.randomUUID(), conversationId: conversation.id, invoiceId: null, kind: `approved_${kind}`, status: "sent", channel: body.channel, reason: "You approved and sent this.", text, createdAt: body.at }, ...current]);
      const via = body.channel === "instagram" ? "Sent as your Instagram account." : `Sent from your Gmail to ${conversation.meta.contactEmail || conversation.fromHandle}.`;
      setToast(`${via} The agent drafts a follow-up if they go quiet for 2 days.`);
      return true;
    } catch (error) {
      setToast(error instanceof Error ? error.message : "The reply was not sent.");
      return false;
    }
  }

  const filters: Array<[Filter, string]> = [
    ["needs", "Needs you"],
    ["deals", "All deals"],
    ["waiting", "Waiting"],
    ["below", "Below rate"],
    ["closed", "Closed"],
    ["aside", "Set aside"],
  ];

  const autoQueue = conversations.filter((item) => matches(item, "deals") && planned.get(item.id)?.auto.ok).length;
  const summary = !supabaseConfigured
    ? "Add Supabase and Google in .env before connecting an inbox."
    : syncing
      ? syncing === "agent" ? "Autopilot is checking your deals…" : syncing === "link" ? "Checking your deal link…" : `Reading ${syncing === "gmail" ? "Gmail" : "Instagram"}…`
      : needsCount
        ? `${needsCount} ${needsCount === 1 ? "deal needs" : "deals need"} you.${autoQueue ? ` Autopilot has ${autoQueue} ready to send.` : ""}`
        : conversations.some((item) => item.extraction.isBrandOpportunity)
          ? autoQueue ? `Autopilot has ${autoQueue} ready to send. Nothing needs you.` : "Nothing needs you right now."
          : "Press Sync to read your inboxes, or share your deal link.";

  const selectedPlan = selected ? planned.get(selected.id) ?? null : null;

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative flex h-dvh min-w-0 flex-col overflow-hidden bg-[#14110e] text-[#f6f1e8]">
        <div className="site-grain" aria-hidden="true" />
        <SiteHeader
          email={email}
          fixed={false}
          desk={email ? { autopilot: settings.autopilot.enabled, onAutopilot: (next) => void toggleAutopilot(next), syncing: syncing != null, onSync: () => void syncAll() } : undefined}
        />
        <div className="relative h-0.5 shrink-0 overflow-hidden" aria-hidden="true">
          <AnimatePresence>
            {syncing ? (
              <motion.span
                key="sync"
                className="absolute inset-y-0 w-1/3 bg-[#ff5a36]"
                initial={{ left: "-33%", opacity: 0 }}
                animate={{ left: ["-33%", "100%"], opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ left: { duration: 1.2, repeat: Infinity, ease: "easeInOut" }, opacity: { duration: 0.2 } }}
              />
            ) : null}
          </AnimatePresence>
        </div>

        <div className="grid min-h-0 min-w-0 flex-1 overflow-hidden md:grid-cols-[320px_minmax(0,1fr)]">
          <aside className={`${pane === "list" ? "flex" : "hidden"} min-h-0 min-w-0 flex-col border-white/10 md:flex md:border-r`}>
            <div className="shrink-0 space-y-3 border-b border-white/10 px-3 py-3">
              <AnimatePresence mode="wait" initial={false}>
                <motion.p key={summary} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }} className={`line-clamp-2 text-xs leading-5 ${needsCount && !syncing ? "text-[#ff5a36]" : "text-[#f6f1e8]/50"}`}>
                  {summary}
                </motion.p>
              </AnimatePresence>
              <LayoutGroup id="desk-filters">
                <div className="flex flex-wrap gap-1.5">
                  {filters.map(([id, label]) => {
                    const on = activeFilter === id;
                    const n = count(id);
                    return (
                      <button key={id} type="button" onClick={() => chooseFilter(id)} className={`relative shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${on ? "text-[#14110e]" : "bg-white/[0.06] text-[#f6f1e8]/60 hover:bg-white/10"}`}>
                        {on ? <motion.span layoutId="desk-filter" className="absolute inset-0 rounded-full bg-[#f6f1e8]" transition={snap} /> : null}
                        <span className="relative inline-flex items-center gap-1">
                          {label} <span className="tabular-nums">{n}</span>
                          {id === "needs" && n ? <span className="h-1.5 w-1.5 rounded-full bg-[#ff5a36]" /> : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </LayoutGroup>
              <div className="flex flex-wrap items-center gap-1.5">
                <SourceChip label="Gmail" on={live.gmail && sources.gmail} disabled={!live.gmail} onClick={() => toggleSource("gmail")} />
                <SourceChip label="Instagram" on={live.instagram && sources.instagram} disabled={!live.instagram} onClick={() => toggleSource("instagram")} />
                <SourceChip label="Deal link" on={sources.link} onClick={() => toggleSource("link")} />
                <Link className="px-1.5 text-xs font-medium text-[#f6f1e8]/45 underline hover:text-white" href="/connect">Manage</Link>
              </div>
              <div className="flex items-center justify-between gap-2 text-[11px] text-[#f6f1e8]/40">
                {profile?.handle ? (
                  <button type="button" className="truncate underline decoration-white/20 hover:text-white" onClick={() => {
                    const url = `${window.location.origin}/c/${profile.handle}`;
                    navigator.clipboard?.writeText(url).then(() => setToast(`Copied ${url}. Put it in your Instagram bio.`), () => setToast(url));
                  }}>Copy deal link /c/{profile.handle}</button>
                ) : (
                  <Link href="/settings#link" className="underline decoration-white/20 hover:text-white">Create your deal link</Link>
                )}
                <label className="flex shrink-0 items-center gap-1.5">
                  <input className="h-3.5 w-3.5 accent-[#ff5a36]" type="checkbox" checked={autoSync} onChange={(event) => { setAutoSync(event.target.checked); localStorage.setItem(STORAGE_AUTO, String(event.target.checked)); }} />
                  Auto sync
                </label>
              </div>
            </div>
            <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-2">
              {visible.length ? (
                <LayoutGroup id="desk-list">
                  <AnimatePresence initial={false} mode="popLayout">
                    {visible.map((conversation) => (
                      <ThreadRow
                        key={conversation.id}
                        conversation={conversation}
                        entry={planned.get(conversation.id) ?? null}
                        reminder={reminderDue(conversation.meta)}
                        active={selected?.id === conversation.id}
                        unread={!seen.has(conversation.id) && fresh.has(conversation.id)}
                        fresh={fresh.has(conversation.id)}
                        onSelect={() => select(conversation.id)}
                      />
                    ))}
                  </AnimatePresence>
                </LayoutGroup>
              ) : !syncing ? (
                <EmptyList filter={activeFilter} hasAny={conversations.some((item) => item.extraction.isBrandOpportunity)} canSync={live.gmail || live.instagram} hasLink={Boolean(profile?.handle)} onSync={() => void syncAll()} />
              ) : null}
            </div>
          </aside>

          <div className={`${pane === "list" ? "hidden" : "grid"} min-h-0 min-w-0 overflow-hidden md:grid lg:grid-cols-[minmax(0,1fr)_420px]`}>
            <section className={`${pane === "deal" ? "hidden" : "flex"} min-h-0 min-w-0 flex-col overflow-hidden lg:flex`}>
              <Thread conversation={selected} activity={activity} onBack={() => setPane("list")} onDeal={() => setPane("deal")} />
            </section>
            <div className={`${!selected ? "hidden" : pane === "deal" ? "flex" : "hidden"} min-h-0 min-w-0 overflow-hidden ${selected ? "lg:flex" : ""}`}>
              {selected ? (
                <DealPanel
                  key={selected.id}
                  conversation={selected}
                  entry={selectedPlan}
                  settings={settings}
                  profile={profile}
                  creatorName={creatorName}
                  gmailConnected={gmailConnected}
                  autopilotOn={settings.autopilot.enabled}
                  invoices={invoices.filter((invoice) => invoice.conversationId === selected.id)}
                  onBack={() => setPane("thread")}
                  onSend={(text, kind) => sendReply(selected, text, kind)}
                  onPatch={(patch, message) => patchDeal(selected.id, patch, message)}
                  onInvoice={(invoice) => setInvoices((current) => [invoice, ...current.filter((item) => item.id !== invoice.id)])}
                  onToast={setToast}
                />
              ) : null}
            </div>
          </div>
        </div>
        <Toast message={toast} />
      </div>
    </MotionConfig>
  );
}

function SourceChip({ label, on, onClick, disabled }: { label: string; on: boolean; onClick?: () => void; disabled?: boolean }) {
  return (
    <button className={`rounded-full border px-3 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${on ? "border-transparent bg-[#ff5a36] text-[#14110e]" : "border-white/12 bg-transparent text-[#f6f1e8]/50 hover:border-white/25"}`} type="button" onClick={onClick} disabled={disabled} aria-pressed={on}>
      {label}
    </button>
  );
}

const sourceLabel: Record<string, string> = { gmail: "Gmail", instagram: "Instagram", link: "Deal link" };

function rowBadge(conversation: DeskConversation, entry: Planned | null, reminder: boolean): { text: string; tone: "hot" | "green" | "muted" } | null {
  const { meta } = conversation;
  if (meta.status === "won") return { text: meta.agreedFee ? `WON · ${formatINR(meta.agreedFee)}` : "WON", tone: "green" };
  if (meta.status === "lost") return { text: "CLOSED", tone: "muted" };
  if (reminder) return { text: "REMINDER DUE", tone: "hot" };
  const plan = entry?.plan;
  if (!plan) return null;
  if (plan.kind === "ready_for_yes") return { text: "READY FOR YOUR YES", tone: "hot" };
  if (plan.kind === "waiting") return { text: plan.title.toUpperCase(), tone: "muted" };
  if (entry?.auto.ok) return { text: `AUTOPILOT · ${plan.title.toUpperCase()}`, tone: "green" };
  return { text: plan.title.toUpperCase(), tone: "hot" };
}

function ThreadRow({ conversation, entry, reminder, active, unread, fresh, onSelect }: {
  conversation: DeskConversation;
  entry: Planned | null;
  reminder: boolean;
  active: boolean;
  unread: boolean;
  fresh: boolean;
  onSelect: () => void;
}) {
  const { extraction } = conversation;
  const badge = rowBadge(conversation, entry, reminder);
  const offer = extraction.offerAmount == null ? "Fee not stated" : formatINR(extraction.offerAmount);
  const work = extraction.deliverables.join(" + ");
  const tones = {
    hot: active ? "text-[#c2410c]" : "text-[#ff5a36]",
    green: active ? "text-emerald-700" : "text-emerald-300",
    muted: active ? "text-[#14110e]/45" : "text-[#f6f1e8]/40",
  };
  return (
    <motion.button
      id={`thread-${conversation.id}`}
      layout="position"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -28, transition: { duration: 0.2 } }}
      transition={{ duration: 0.28, ease }}
      className={`relative mb-1.5 block w-full overflow-hidden rounded-2xl border px-4 py-3.5 text-left transition-colors ${active ? "border-transparent text-[#14110e]" : "border-white/8 bg-white/[0.02] hover:bg-white/[0.06]"}`}
      type="button"
      onClick={onSelect}
    >
      {active ? <motion.span layoutId="desk-active" className="absolute inset-0 rounded-2xl bg-[#f6f1e8] shadow-[0_16px_40px_-20px_rgba(246,241,232,0.5)]" transition={snap} /> : null}
      {fresh && !active ? <motion.span aria-hidden="true" className="absolute inset-0 rounded-2xl border border-[#ff5a36]" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 5, ease: "easeIn" }} /> : null}
      <span className="relative block">
        <span className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${conversation.source === "instagram" ? "bg-[#ff5a36] text-[#14110e]" : conversation.source === "link" ? (active ? "bg-emerald-700 text-white" : "bg-emerald-400/20 text-emerald-200") : active ? "bg-[#14110e] text-[#f6f1e8]" : "bg-white/10 text-[#f6f1e8]/75"}`}>
              {sourceLabel[conversation.source]}
            </span>
            {fresh ? <span className={`text-[10px] font-semibold uppercase tracking-wide ${active ? "text-[#c2410c]" : "text-[#ff5a36]"}`}>New</span> : null}
            {conversation.meta.category ? <span className={`text-[10px] uppercase tracking-wide ${active ? "text-[#14110e]/45" : "text-[#f6f1e8]/35"}`}>{categoryLabel(conversation.meta.category).split(" ")[0]}</span> : null}
          </span>
          <span className={`shrink-0 text-xs ${active ? "text-[#14110e]/50" : "text-[#f6f1e8]/40"}`}>{formatDate(conversation.receivedAt)}</span>
        </span>
        <span className="mt-2 flex min-w-0 items-center gap-2">
          {unread && !active ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#ff5a36]" aria-label="Unread" /> : null}
          <span className="truncate text-sm font-semibold">{extraction.brand || extraction.campaign || conversation.fromName}</span>
        </span>
        <span className={`mt-0.5 block truncate text-xs ${active ? "text-[#14110e]/60" : "text-[#f6f1e8]/50"}`}>{extraction.campaign || conversation.subject || conversation.fromHandle}</span>
        <span className={`mt-1 block truncate text-xs font-medium ${active ? "text-[#14110e]" : "text-[#f6f1e8]/80"}`}>{work ? `${offer} · ${work}` : offer}</span>
        {badge ? <span className={`mt-2 block truncate text-[11px] font-semibold tracking-wide ${tones[badge.tone]}`}>{badge.text}</span> : null}
      </span>
    </motion.button>
  );
}

function EmptyList({ filter, hasAny, canSync, hasLink, onSync }: { filter: Filter; hasAny: boolean; canSync: boolean; hasLink: boolean; onSync: () => void }) {
  const copy: Record<Filter, [string, string]> = {
    needs: hasAny ? ["Nothing needs you", "Autopilot and your rules have the rest covered. Check All deals to see everything."] : ["No brand deals yet", "Sync your inboxes or share your deal link. Only real brand offers are listed."],
    deals: ["No brand deals yet", "Sync your inboxes or share your deal link."],
    waiting: ["Nobody to wait on", "Deals where you replied last show up here."],
    below: ["Nothing under your minimum", "Priced offers below your minimum land here, with a counter ready."],
    closed: ["Nothing closed yet", "Mark a deal won to create the invoice and start tracking payment."],
    aside: ["Nothing set aside", "Deals you set aside wait here. You can move them back."],
  };
  const [title, body] = copy[filter];
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="px-3 py-10">
      <h2 className="font-serif text-2xl tracking-tight">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[#f6f1e8]/50">{body}</p>
      {!hasAny ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {canSync ? <button type="button" onClick={onSync} className="rounded-full bg-[#ff5a36] px-4 py-2 text-sm font-semibold text-[#14110e] hover:bg-[#ff7a5c]">Sync now</button> : <Link href="/connect" className="rounded-full bg-[#f6f1e8] px-4 py-2 text-sm font-semibold text-[#14110e]">Connect Gmail or Instagram</Link>}
          {!hasLink ? <Link href="/settings#link" className="rounded-full border border-white/20 px-4 py-2 text-sm">Create deal link</Link> : null}
        </div>
      ) : null}
    </motion.div>
  );
}

function Thread({ conversation, activity, onBack, onDeal }: { conversation: DeskConversation | null; activity: Activity[]; onBack: () => void; onDeal: () => void }) {
  const scroller = useRef<HTMLDivElement>(null);
  const messageCount = conversation?.messages.length ?? 0;

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight });
  }, [conversation?.id, messageCount]);

  if (!conversation) {
    return (
      <main className="grid flex-1 place-items-center bg-[#14110e] px-8">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-md text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#f6f1e8]/35">Your desk</p>
          <h2 className="mt-3 font-serif text-4xl tracking-tight text-white">Choose a deal</h2>
          <p className="mt-3 text-sm leading-6 text-[#f6f1e8]/50">The agent reads the offer, prices it against your rules, and drafts the next step. Only you can say yes.</p>
        </motion.div>
      </main>
    );
  }

  const log = activity.filter((item) => item.conversationId === conversation.id).slice(0, 8);
  const autopilotTexts = new Set(log.filter((item) => !item.kind.startsWith("approved_") && item.status === "sent").map((item) => item.text.trim()));

  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#14110e]">
      <header className="flex min-w-0 shrink-0 items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
        <div className="min-w-0">
          <button className="mb-3 rounded-full border border-white/15 px-3 py-1 text-sm text-[#f6f1e8]/75 md:hidden" type="button" onClick={onBack}>Back</button>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#ff5a36]">{conversation.source === "gmail" ? "Gmail thread" : conversation.source === "instagram" ? "Instagram DM" : "Brief from your deal link"}</p>
          <h2 className="mt-1 break-words font-serif text-3xl tracking-tight text-white">{conversation.fromName}</h2>
          <p className="mt-1 break-all text-sm text-[#f6f1e8]/45">{conversation.meta.contactEmail || conversation.fromHandle}</p>
          {conversation.subject ? <p className="mt-3 break-words text-sm font-medium text-[#f6f1e8]/75">{conversation.subject}</p> : null}
        </div>
        <button className="shrink-0 rounded-full bg-[#f6f1e8] px-3 py-1.5 text-xs font-semibold text-[#14110e] lg:hidden" type="button" onClick={onDeal}>Next step</button>
      </header>
      <div ref={scroller} className="min-h-0 min-w-0 flex-1 space-y-3 overflow-x-hidden overflow-y-auto px-5 py-5">
        {conversation.messages.map((message, index) => {
          const mine = message.from === "you";
          const byAgent = mine && autopilotTexts.has(message.text.trim());
          return (
            <motion.article
              key={`${message.at}-${index}`}
              initial={{ opacity: 0, x: mine ? 24 : 0, y: mine ? 0 : 8 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ duration: 0.32, delay: Math.min(index, 6) * 0.04, ease }}
              className={`min-w-0 max-w-full rounded-2xl px-4 py-3 text-sm leading-6 ${mine ? "ml-auto max-w-xl bg-[#f6f1e8] text-[#14110e]" : "border border-white/8 bg-white/[0.05] text-[#f6f1e8]/90"}`}
            >
              <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{message.text}</p>
              <p className={`mt-2 text-xs ${mine ? "text-[#14110e]/50" : "text-[#f6f1e8]/40"}`}>{mine ? (byAgent ? "Autopilot · " : "You · ") : ""}{formatWhen(message.at)}</p>
            </motion.article>
          );
        })}
        {log.length ? (
          <div className="space-y-1 border-t border-white/10 pt-3">
            {log.map((item) => (
              <p key={item.id} className="text-xs text-[#f6f1e8]/40">
                <span className={item.status === "failed" ? "text-[#ff5a36]" : item.kind.startsWith("approved_") ? "text-[#f6f1e8]/60" : "text-emerald-300/80"}>
                  {item.kind.startsWith("approved_") ? "You" : "Autopilot"}
                </span>{" "}
                {item.status === "failed" ? `could not send (${item.reason})` : activityLabel(item.kind)} · {formatWhen(item.createdAt)}
              </p>
            ))}
          </div>
        ) : null}
        <p className="text-xs text-[#f6f1e8]/35">{conversation.extraction.detectionReason}</p>
      </div>
    </main>
  );
}
