"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SiteHeader } from "@/components/SiteHeader";
import {
  DEFAULT_RULES,
  addDays,
  belowMinimum,
  buildAdvice,
  daysUntil,
  extractDeal,
  formatDate,
  formatINR,
  formatWhen,
  listGaps,
  recommendedWaitDays,
  suggestedMinimum,
  suggestedReply,
  toISODate,
  type Conversation,
  type Extraction,
  type RateRules,
} from "@/lib/read-deal.mjs";

type Reader = "rules" | "openai";
type InboxConversation = Conversation & { extraction?: Extraction; reader?: Reader };
type Filter = "deals" | "below" | "followups" | "aside";
type SourceKey = "gmail" | "instagram";
type Action = {
  seen: boolean;
  followUpAt: string | null;
  followUpDays: number | null;
  followedUp: boolean;
  dismissed: boolean;
};

const STORAGE_RULES = "brand-deal-inbox:rules";
const STORAGE_ACTIONS = "brand-deal-inbox:actions";
const STORAGE_SOURCES = "brand-deal-inbox:sources";
const STORAGE_AUTO = "brand-deal-inbox:auto-sync";

function emptyAction(): Action {
  return { seen: false, followUpAt: null, followUpDays: null, followedUp: false, dismissed: false };
}

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } as T : fallback;
  } catch {
    return fallback;
  }
}

function readingFor(conversation: InboxConversation): Extraction {
  const extraction = conversation.extraction ?? extractDeal(conversation);
  return { ...extraction, gaps: listGaps(extraction) };
}

function followUpLabel(action: Action) {
  const left = daysUntil(action.followUpAt || "");
  if (left === 0) return "FOLLOW UP TODAY";
  if (left === 1) return "FOLLOW UP IN 1 DAY";
  if (left > 1) return `FOLLOW UP IN ${left} DAYS`;
  return "FOLLOW UP OVERDUE";
}

function deadlineHint(iso: string) {
  const days = daysUntil(iso);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days > 1) return `${days} days from today`;
  if (days === -1) return "Yesterday";
  return `${Math.abs(days)} days ago`;
}

function listTitle(conversation: InboxConversation, extraction: Extraction) {
  if (!extraction.isBrandOpportunity) return conversation.fromName;
  return extraction.brand || extraction.campaign || conversation.fromName;
}

function dealLine(extraction: Extraction) {
  const offer = extraction.offerAmount == null ? "Fee not stated" : formatINR(extraction.offerAmount);
  const work = extraction.deliverables.join(" + ");
  return work ? `${offer} · ${work}` : offer;
}

function listSubtitle(conversation: InboxConversation, extraction: Extraction) {
  if (!extraction.isBrandOpportunity) return conversation.subject || "Direct message";
  if (extraction.brand && extraction.campaign) return extraction.campaign;
  if (!extraction.brand) return "Sender did not name the brand";
  return conversation.subject || "Direct message";
}

export function Inbox({
  supabaseConfigured,
  email,
  savedConversations,
  authNotice,
  instagramConfigured,
  instagramConnected,
}: {
  supabaseConfigured: boolean;
  email: string | null;
  savedConversations: InboxConversation[];
  authNotice: string | null;
  instagramConfigured: boolean;
  instagramConnected: boolean;
}) {
  const [conversations, setConversations] = useState(savedConversations);
  const [selectedId, setSelectedId] = useState(savedConversations[0]?.id ?? "");
  const [filter, setFilter] = useState<Filter>("deals");
  const [rules, setRules] = useState<RateRules>(DEFAULT_RULES);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [actions, setActions] = useState<Record<string, Action>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<"gmail" | "instagram" | null>(null);
  const [instagramReady, setInstagramReady] = useState(instagramConnected);
  const [sources, setSources] = useState<Record<SourceKey, boolean>>({ gmail: true, instagram: true });
  const [autoSync, setAutoSync] = useState(true);
  const [followers, setFollowers] = useState<number | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [grokDrafts, setGrokDrafts] = useState<Record<string, string>>({});
  const [drafting, setDrafting] = useState(false);
  const [pane, setPane] = useState<"list" | "thread" | "deal">("list");
  const busy = useRef(false);
  const syncRef = useRef({ gmail: async (_quiet?: boolean) => {}, instagram: async (_quiet?: boolean) => {} });

  useEffect(() => {
    const storedRules = loadJson<Partial<RateRules>>(STORAGE_RULES, {});
    const storedActions = loadJson<Record<string, Action>>(STORAGE_ACTIONS, {});
    setRules({ ...DEFAULT_RULES, ...storedRules });
    setActions(storedActions);
    setSources(loadJson<Record<SourceKey, boolean>>(STORAGE_SOURCES, { gmail: true, instagram: true }));
    const storedAuto = localStorage.getItem(STORAGE_AUTO);
    if (storedAuto != null) setAutoSync(storedAuto === "true");
    const notices: Record<string, string> = {
      error: "Google sign-in did not finish. Check the Supabase Google provider and redirect URL.",
      unconfigured: "Add the Supabase URL and publishable key to .env.local first.",
      "signed-in": email ? `Signed in as ${email}. Sync Gmail when you want the live inbox.` : "Signed in.",
      "needs-sql": "Signed in. Create the tables first: in Supabase, run supabase/migrations/0001_inbox.sql, then sign in again.",
      "no-gmail-token": "Google signed you in, but did not grant inbox access. Sign in again and allow Gmail to be read.",
      "no-secret": "Add SUPABASE_SECRET_KEY to .env so the Gmail token can be saved.",
      "save-failed": "Saving the connection failed. Check the Supabase secret key and the SQL migrations.",
      instagram: instagramReady ? "Instagram is connected. Sync it to read DMs." : "Instagram is connected. Sync it to read DMs.",
      "instagram-unconfigured": "Add INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET to .env, then connect Instagram.",
      "instagram-denied": "Instagram sign-in was cancelled.",
      "instagram-mismatch": "Instagram sign-in expired. Connect it again.",
      "instagram-failed": "Instagram did not finish connecting. Use a professional account and allow message access.",
      "needs-instagram-sql": "Run supabase/migrations/0002_instagram.sql in the Supabase SQL editor, then connect Instagram again.",
      "sign-in-first": "Sign in first, then connect Instagram. Every inbox is optional.",
      "instagram-localhost": "Open the https tunnel address, sign in there, then connect Instagram. Localhost is not a valid Instagram redirect.",
    };
    if (authNotice === "instagram") setInstagramReady(true);
    if (authNotice && notices[authNotice]) setToast(notices[authNotice]);
  }, [authNotice, email]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function actionFor(id: string) {
    return { ...emptyAction(), ...actions[id] };
  }

  function saveActions(next: Record<string, Action>) {
    setActions(next);
    localStorage.setItem(STORAGE_ACTIONS, JSON.stringify(next));
  }

  function patchAction(id: string, patch: Partial<Action>) {
    const next = { ...actions, [id]: { ...actionFor(id), ...patch } };
    saveActions(next);
    return next;
  }

  function sourceOn(conversation: InboxConversation) {
    if (conversation.source !== "gmail" && conversation.source !== "instagram") return true;
    return sources[conversation.source];
  }

  function matches(conversation: InboxConversation, mode: Filter) {
    if (!sourceOn(conversation)) return false;
    const extraction = readingFor(conversation);
    const action = { ...emptyAction(), ...actions[conversation.id] };
    if (mode === "deals") return extraction.isBrandOpportunity && !action.dismissed && !belowMinimum(extraction, rules.minimumOffer);
    if (mode === "below") return belowMinimum(extraction, rules.minimumOffer) && !action.dismissed;
    if (mode === "followups") return extraction.isBrandOpportunity && Boolean(action.followUpAt) && !action.followedUp && !action.dismissed;
    if (mode === "aside") return extraction.isBrandOpportunity && action.dismissed;
    return false;
  }

  const visible = useMemo(() => {
    return conversations
      .filter((conversation) => matches(conversation, filter))
      .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
  }, [actions, conversations, filter, rules.minimumOffer, sources]);

  const selected = visible.find((item) => item.id === selectedId) ?? visible[0] ?? null;
  const dealCount = conversations.filter((conversation) => matches(conversation, "deals")).length;
  const belowCount = conversations.filter((conversation) => matches(conversation, "below")).length;
  const followCount = conversations.filter((conversation) => {
    const action = actionFor(conversation.id);
    return action.followUpAt && !action.followedUp && !action.dismissed;
  }).length;

  function select(id: string) {
    setSelectedId(id);
    patchAction(id, { seen: true });
    setPane("thread");
  }

  function chooseFilter(next: Filter) {
    setFilter(next);
    const upcoming = conversations.filter((conversation) => matches(conversation, next));
    if (upcoming.length && !upcoming.some((item) => item.id === selectedId)) {
      setSelectedId(upcoming[0].id);
      patchAction(upcoming[0].id, { seen: true });
    }
  }

  async function syncGmail(quiet = false) {
    if (busy.current) return;
    busy.current = true;
    setSyncing("gmail");
    try {
      const response = await fetch("/api/gmail/sync", { method: "POST" });
      const body = await response.json();
      if (!response.ok) {
        setToast(body.error || "Gmail sync failed.");
        return;
      }
      const incoming = (body.conversations ?? []) as InboxConversation[];
      setConversations((current) => [...current.filter((item) => item.source !== "gmail"), ...incoming]);
      setFilter("deals");
      const first = (body.conversations ?? []).find((item: InboxConversation) => readingFor(item).isBrandOpportunity);
      if (first) setSelectedId(first.id);
      const noun = body.brandDeals === 1 ? "brand deal" : "brand deals";
      const warning = body.modelErrors ? ` Checked ${body.modelErrors} with the backup reader.` : "";
      if (!quiet) setToast(`Read Gmail. ${body.brandDeals} ${noun}.${warning}`);
    } catch {
      if (!quiet) setToast("Gmail sync failed.");
    } finally {
      busy.current = false;
      setSyncing(null);
    }
  }

  async function syncInstagram(quiet = false) {
    if (busy.current) return;
    busy.current = true;
    setSyncing("instagram");
    try {
      const response = await fetch("/api/instagram/sync", { method: "POST" });
      const body = await response.json();
      if (!response.ok) {
        setToast(body.error || "Instagram sync failed.");
        return;
      }
      const incoming = (body.conversations ?? []) as InboxConversation[];
      setConversations((current) => [...current.filter((item) => item.source !== "instagram"), ...incoming]);
      setFilter("deals");
      const first = incoming.find((item) => readingFor(item).isBrandOpportunity);
      if (first) setSelectedId(first.id);
      const noun = body.brandDeals === 1 ? "brand deal" : "brand deals";
      const warning = body.modelErrors ? ` Checked ${body.modelErrors} with the backup reader.` : "";
      if (!quiet) setToast(`Read Instagram. ${body.brandDeals} ${noun}.${warning}`);
    } catch {
      if (!quiet) setToast("Instagram sync failed.");
    } finally {
      busy.current = false;
      setSyncing(null);
    }
  }

  async function syncAll() {
    if (sources.gmail) await syncGmail();
    if (sources.instagram && instagramReady) await syncInstagram();
  }

  syncRef.current = { gmail: syncGmail, instagram: syncInstagram };

  useEffect(() => {
    if (!email || !autoSync) return;
    const tick = async () => {
      if (sources.gmail) await syncRef.current.gmail(true);
      if (sources.instagram && instagramReady) await syncRef.current.instagram(true);
    };
    const first = window.setTimeout(tick, 20000);
    const timer = window.setInterval(tick, 180000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [autoSync, email, instagramReady, sources.gmail, sources.instagram]);

  useEffect(() => {
    if (!instagramReady) return;
    fetch("/api/instagram/audience")
      .then((response) => response.json())
      .then((body: { followers?: number | null }) => {
        if (typeof body.followers === "number") setFollowers(body.followers);
      })
      .catch(() => undefined);
  }, [instagramReady]);

  function toggleSource(source: SourceKey) {
    const next = { ...sources, [source]: !sources[source] };
    setSources(next);
    localStorage.setItem(STORAGE_SOURCES, JSON.stringify(next));
  }

  function toggleAuto(next: boolean) {
    setAutoSync(next);
    localStorage.setItem(STORAGE_AUTO, String(next));
  }

  async function rewriteDraft(conversation: InboxConversation) {
    const extraction = readingFor(conversation);
    const advice = buildAdvice(extraction, rules);
    setDrafting(true);
    try {
      const response = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation, extraction, advice, rules }),
      });
      const body = await response.json();
      if (!response.ok) {
        setToast(body.error || "The draft failed.");
        return;
      }
      setGrokDrafts((current) => ({ ...current, [conversation.id]: body.draft }));
      setToast(body.reader === "grok" ? "Fresh draft is ready. Copy it when you approve it." : body.modelError || "Draft is ready. Copy it when you approve it.");
    } catch {
      setToast("The draft failed.");
    } finally {
      setDrafting(false);
    }
  }

  async function sendReply(conversation: InboxConversation, text: string) {
    if (sendingId) return;
    setSendingId(conversation.id);
    try {
      const response = await fetch("/api/reply/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: conversation.id, text }),
      });
      const body = await response.json();
      if (!response.ok) {
        setToast(body.error || "The reply was not sent.");
        return;
      }
      const sent = { from: "you" as const, at: body.at ?? new Date().toISOString(), text };
      setConversations((current) =>
        current.map((item) =>
          item.id === conversation.id ? { ...item, messages: [...item.messages, sent] } : item,
        ),
      );
      setToast(conversation.source === "gmail" ? "Sent via Gmail." : "Sent as your Instagram account.");
    } catch {
      setToast("The reply was not sent.");
    } finally {
      setSendingId(null);
    }
  }

  const banner = email
    ? email
    : supabaseConfigured
      ? "Sign in, connect the inboxes you use, then press Sync."
      : "Add Supabase and Google in .env before connecting an inbox.";

  const filters = [
    ["deals", "Brand deals", dealCount],
    ["below", "Below your rate", belowCount],
    ["followups", "Follow-ups", followCount],
    ["aside", "Set aside", conversations.filter((item) => matches(item, "aside")).length],
  ] as const;

  return (
    <div className="relative flex h-dvh min-w-0 flex-col overflow-hidden bg-[#14110e] text-[#f6f1e8]">
      <div className="site-grain" aria-hidden="true" />
      <SiteHeader
        email={email}
        active="desk"
        fixed={false}
        desk={email ? {
          autoSync,
          onAutoSync: toggleAuto,
          syncing: syncing != null,
          onSync: () => void syncAll(),
        } : undefined}
      />

      <div className="grid min-h-0 min-w-0 flex-1 overflow-hidden md:grid-cols-[300px_minmax(0,1fr)]">
        <aside className={`${pane === "list" ? "flex" : "hidden"} min-h-0 min-w-0 flex-col border-white/10 md:flex md:border-r`}>
          <div className="shrink-0 space-y-3 border-b border-white/10 px-3 py-3">
            <p className="line-clamp-2 text-xs leading-5 text-[#f6f1e8]/50">{banner}</p>
            <div className="flex flex-wrap gap-1.5">
              {filters.map(([id, label, count]) => (
                <button key={id} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${filter === id ? "bg-[#f6f1e8] text-[#14110e]" : "bg-white/[0.06] text-[#f6f1e8]/60 hover:bg-white/10"}`} type="button" onClick={() => chooseFilter(id)}>
                  {label} {count}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <SourceChip label="Gmail" on={sources.gmail} onClick={() => toggleSource("gmail")} />
              <SourceChip label="Instagram" on={sources.instagram && instagramReady} disabled={!instagramReady} onClick={() => instagramReady ? toggleSource("instagram") : undefined} />
              <a className="px-2 text-xs font-medium text-[#f6f1e8]/45 underline hover:text-white" href="/connect">Add</a>
            </div>
          </div>
          <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-2">
            {visible.length ? visible.map((conversation) => {
              const extraction = readingFor(conversation);
              const action = actionFor(conversation.id);
              const active = selected?.id === conversation.id;
              const unread = !action.seen && extraction.isBrandOpportunity;
              return (
                <motion.button key={conversation.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className={`mb-1.5 block w-full rounded-2xl border px-4 py-3.5 text-left transition ${active ? "border-transparent bg-[#f6f1e8] text-[#14110e] shadow-[0_16px_40px_-20px_rgba(246,241,232,0.5)]" : "border-white/8 bg-white/[0.02] hover:bg-white/[0.06]"}`} type="button" onClick={() => select(conversation.id)}>
                  <span className="flex items-center justify-between gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${conversation.source === "gmail" ? (active ? "bg-[#14110e] text-[#f6f1e8]" : "bg-white/10 text-[#f6f1e8]/75") : "bg-[#ff5a36] text-[#14110e]"}`}>
                      {conversation.source === "gmail" ? "Gmail" : "Instagram"}
                    </span>
                    <span className={`shrink-0 text-xs ${active ? "text-[#14110e]/50" : "text-[#f6f1e8]/40"}`}>{formatDate(conversation.receivedAt)}</span>
                  </span>
                  <span className="mt-2 flex min-w-0 items-center gap-2">
                    {unread && !active ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#ff5a36]" /> : null}
                    <span className="truncate text-sm font-semibold">{listTitle(conversation, extraction)}</span>
                  </span>
                  <span className={`mt-0.5 block truncate text-xs ${active ? "text-[#14110e]/60" : "text-[#f6f1e8]/50"}`}>{listSubtitle(conversation, extraction)}</span>
                  <span className={`mt-1 block truncate text-xs font-medium ${active ? "text-[#14110e]" : "text-[#ff5a36]/90"}`}>{dealLine(extraction)}</span>
                  {action.followUpAt && !action.followedUp ? <span className={`mt-2 block text-[11px] font-semibold tracking-wide ${active ? "text-[#c2410c]" : "text-[#ff5a36]"}`}>{followUpLabel(action)}</span> : null}
                </motion.button>
              );
            }) : (
              <div className="px-3 py-10">
                <h2 className="font-serif text-2xl tracking-tight">{conversations.length ? "No brand deals here" : "No brand deals yet"}</h2>
                <p className="mt-2 text-sm leading-6 text-[#f6f1e8]/50">
                  {conversations.length ? "Another filter still has brand deals." : "Sync Gmail or Instagram. Only brand deals are listed."}
                </p>
                <a href="/connect" className="mt-4 inline-block rounded-full bg-[#f6f1e8] px-4 py-2 text-sm font-semibold text-[#14110e]">Connect an inbox</a>
              </div>
            )}
          </div>
        </aside>

        <div className={`${pane === "list" ? "hidden" : "grid"} min-h-0 min-w-0 overflow-hidden md:grid lg:grid-cols-[minmax(0,1fr)_380px]`}>
        <section className={`${pane === "deal" ? "hidden" : "flex"} min-h-0 min-w-0 flex-col overflow-hidden lg:flex`}>
          <Thread conversation={selected} onBack={() => setPane("list")} onDeal={() => setPane("deal")} />
        </section>
        <div className={`${!selected ? "hidden" : pane === "deal" ? "flex" : "hidden"} min-h-0 min-w-0 overflow-hidden ${selected ? "lg:flex" : ""}`}>
        <Deal
          onBack={() => setPane("thread")}
          conversation={selected}
          rules={rules}
          rulesOpen={rulesOpen}
          action={selected ? actionFor(selected.id) : emptyAction()}
          onRulesOpen={setRulesOpen}
          onRule={(key, value) => {
            const next = { ...rules, [key]: value };
            setRules(next);
            setRulesOpen(true);
            localStorage.setItem(STORAGE_RULES, JSON.stringify(next));
          }}
          onFollow={() => {
            if (!selected) return;
            const days = recommendedWaitDays(selected);
            const followUpAt = toISODate(addDays(days));
            patchAction(selected.id, { followUpAt, followUpDays: days, followedUp: false, dismissed: false });
            setToast(`Reminder set for ${formatDate(followUpAt)}.`);
          }}
          onDone={() => {
            if (!selected) return;
            patchAction(selected.id, { followedUp: true });
            setToast("Marked as followed up.");
          }}
          onClear={() => {
            if (!selected) return;
            patchAction(selected.id, { followUpAt: null, followUpDays: null, followedUp: false });
          }}
          onAside={() => {
            if (!selected) return;
            patchAction(selected.id, { dismissed: true });
            setToast("Set aside.");
          }}
          draftOverride={selected ? grokDrafts[selected.id] : undefined}
          drafting={drafting}
          onSend={(draft) => { if (selected) void sendReply(selected, draft); }}
          sending={selected ? sendingId === selected.id : false}
          followers={followers}
          onRewrite={() => { if (selected) void rewriteDraft(selected); }}
          onCopy={(draft) => {
            if (navigator.clipboard?.writeText) {
              navigator.clipboard.writeText(draft).then(
                () => setToast("Approved reply copied. Nothing was sent."),
                () => setToast("Select the draft and copy it."),
              );
            } else {
              setToast("Select the draft and copy it.");
            }
          }}
        />
        </div>
        </div>
      </div>
      <AnimatePresence>
        {toast ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-5 left-1/2 z-30 w-[min(32rem,calc(100%-2rem))] -translate-x-1/2 rounded-2xl bg-[#f6f1e8] px-4 py-3 text-sm text-[#14110e] shadow-xl"
            role="status"
            aria-live="polite"
          >
            {toast}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function SourceChip({ label, on, onClick, disabled }: { label: string; on: boolean; onClick?: () => void; disabled?: boolean }) {
  return (
    <button className={`rounded-full border px-3 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${on ? "border-transparent bg-[#ff5a36] text-[#14110e]" : "border-white/12 bg-transparent text-[#f6f1e8]/50 hover:border-white/25"}`} type="button" onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
}

function Thread({ conversation, onBack, onDeal }: { conversation: InboxConversation | null; onBack: () => void; onDeal: () => void }) {
  if (!conversation) {
    return (
      <main className="grid flex-1 place-items-center bg-[#14110e] px-8">
        <div className="max-w-md text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#f6f1e8]/35">Your desk</p>
          <h2 className="mt-3 font-serif text-4xl tracking-tight text-white">Choose a thread</h2>
          <p className="mt-3 text-sm leading-6 text-[#f6f1e8]/50">Sync Gmail or Instagram. The desk extracts the fee, prices the usage, and drafts the counter — you approve it.</p>
        </div>
      </main>
    );
  }
  const extraction = readingFor(conversation);
  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#14110e]">
      <header className="flex min-w-0 shrink-0 items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
        <div className="min-w-0">
          <button className="mb-3 rounded-full border border-white/15 px-3 py-1 text-sm text-[#f6f1e8]/75 md:hidden" type="button" onClick={onBack}>Back</button>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#ff5a36]">{conversation.source === "gmail" ? "Gmail thread" : "Instagram DM"}</p>
          <h2 className="mt-1 break-words font-serif text-3xl tracking-tight text-white">{conversation.fromName}</h2>
          <p className="mt-1 break-all text-sm text-[#f6f1e8]/45">{conversation.fromHandle}</p>
          {conversation.subject ? <p className="mt-3 break-words text-sm font-medium text-[#f6f1e8]/75">{conversation.subject}</p> : null}
        </div>
        <button className="shrink-0 rounded-full bg-[#f6f1e8] px-3 py-1.5 text-xs font-semibold text-[#14110e] lg:hidden" type="button" onClick={onDeal}>The deal</button>
      </header>
      <AnimatePresence mode="wait">
        <motion.div
          key={conversation.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28 }}
          className="min-h-0 min-w-0 flex-1 space-y-3 overflow-x-hidden overflow-y-auto px-5 py-5"
        >
          {conversation.messages.map((message, index) => (
            <article className={`min-w-0 max-w-full rounded-2xl px-4 py-3 text-sm leading-6 ${message.from === "you" ? "ml-auto max-w-xl bg-[#f6f1e8] text-[#14110e]" : "border border-white/8 bg-white/[0.05] text-[#f6f1e8]/90"}`} key={`${message.at}-${index}`}>
              <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{message.text}</p>
              <p className={`mt-2 text-xs ${message.from === "you" ? "text-[#14110e]/50" : "text-[#f6f1e8]/40"}`}>{formatWhen(message.at)}</p>
            </article>
          ))}
          <p className="text-sm text-[#f6f1e8]/40">{extraction.detectionReason}</p>
        </motion.div>
      </AnimatePresence>
    </main>
  );
}

function Deal({
  conversation,
  rules,
  rulesOpen,
  action,
  onBack,
  onRulesOpen,
  onRule,
  onFollow,
  onDone,
  onClear,
  onAside,
  onCopy,
  draftOverride,
  drafting,
  onSend,
  sending,
  followers,
  onRewrite,
}: {
  conversation: InboxConversation | null;
  rules: RateRules;
  rulesOpen: boolean;
  action: Action;
  onBack: () => void;
  onRulesOpen: (open: boolean) => void;
  onRule: (key: keyof RateRules, value: number) => void;
  onFollow: () => void;
  onDone: () => void;
  onClear: () => void;
  onAside: () => void;
  onCopy: (draft: string) => void;
  draftOverride?: string;
  drafting: boolean;
  onSend: (draft: string) => void;
  sending: boolean;
  followers: number | null;
  onRewrite: () => void;
}) {
  const [confirmSend, setConfirmSend] = useState(false);
  useEffect(() => { setConfirmSend(false); }, [conversation?.id]);
  const shell = "flex h-full min-h-0 min-w-0 w-full flex-col overflow-x-hidden overflow-y-auto border-white/10 bg-[#f6f1e8] text-[#14110e] lg:border-l";
  if (!conversation) return <aside className={shell} />;
  const extraction = readingFor(conversation);
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

  const advice = buildAdvice(extraction, rules);
  const underFloor = belowMinimum(extraction, rules.minimumOffer);
  const unpriced = extraction.offerAmount == null && rules.minimumOffer > 0;
  const audienceFloor = suggestedMinimum(followers);
  const waitDays = recommendedWaitDays(conversation);
  const offerLabel = extraction.offerAmount == null ? null : `${extraction.offerApproximate ? "≈ " : ""}${formatINR(extraction.offerAmount)}`;
  const draft = draftOverride || suggestedReply(conversation, extraction, advice, rules);
  let lead = "Usage rights were not stated.";
  let main = "Ask for the window before you accept a fee.";
  if (advice.usageAmount > 0) {
    lead = `They're asking for ${extraction.usageRightsDays}-day usage rights.`;
    main = `Your normal rate should increase by ${formatINR(advice.usageAmount)}.`;
  } else if (extraction.usageRightsDays != null && advice.blocks === 0) {
    lead = `They're asking for ${extraction.usageRightsDays}-day usage rights.`;
    main = `That sits inside the ${rules.usageIncludedDays} days you already include.`;
  } else if (advice.blocks > 0 && advice.usageAmount === 0) {
    lead = `They're asking for ${extraction.usageRightsDays}-day usage rights.`;
    main = "Your rate rules add nothing for the extra days.";
  }

  const fields: Array<[string, string | null]> = [
    ["Brand", extraction.brand],
    ["Campaign", extraction.campaign],
    ["Offer", offerLabel],
    ["Deliverables", extraction.deliverables.join(" + ") || null],
    ["Deadline", extraction.deadline ? `${formatDate(extraction.deadline)} · ${deadlineHint(extraction.deadline)}` : null],
    ["Usage rights", extraction.usageRightsDays == null ? null : `${extraction.usageRightsDays} days`],
    ["Exclusivity", extraction.exclusivityDays == null ? null : extraction.exclusivityDays === 0 ? "None" : `${extraction.exclusivityDays} days`],
    ["Payment", extraction.payment],
  ];

  return (
    <aside className={shell} aria-live="polite">
      <div className="sticky top-0 z-10 border-b border-[#14110e]/10 bg-[#f6f1e8] px-5 py-5">
        <button className="mb-3 rounded-full border border-[#14110e]/15 px-3 py-1 text-sm lg:hidden" type="button" onClick={onBack}>Back to the thread</button>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#ff5a36]">The deal</p>
        <h2 className="mt-1 break-words font-serif text-3xl tracking-tight">{extraction.brand || extraction.campaign || "Untitled deal"}</h2>
      </div>
      <motion.div key={conversation.id} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35 }} className="space-y-5 bg-[#f6f1e8] px-5 py-5">
        <section className="rounded-2xl bg-[#14110e] px-4 py-4 text-[#f6f1e8]">
          <p className="text-sm text-[#f6f1e8]/60">{lead}</p>
          <p className="mt-1 font-serif text-2xl leading-tight tracking-tight">{main}</p>
          {advice.suggestedOffer != null && advice.usageAmount > 0 ? <p className="mt-3 inline-block rounded-full bg-[#ff5a36] px-3 py-1 text-sm font-semibold text-[#14110e]">Suggested counter {formatINR(advice.suggestedOffer)}</p> : null}
          {underFloor ? <p className="mt-2 text-sm text-[#f6f1e8]/70">Under your {formatINR(rules.minimumOffer)} minimum. It sits in Below your rate.</p> : null}
          {unpriced ? <p className="mt-2 text-sm text-[#f6f1e8]/70">No fee was stated. The reply asks for the budget and names your {formatINR(rules.minimumOffer)} minimum.</p> : null}
          {extraction.exclusivityDays != null && extraction.exclusivityDays > 0 && advice.exclusivityAmount > 0 ? <p className="mt-2 text-sm text-[#f6f1e8]/70">{extraction.exclusivityDays}-day exclusivity adds {formatINR(advice.exclusivityAmount)}.</p> : null}
          {extraction.exclusivityDays != null && extraction.exclusivityDays > 0 && advice.exclusivityAmount === 0 ? <p className="mt-2 text-sm text-[#f6f1e8]/70">{extraction.exclusivityDays}-day exclusivity is in the ask. Your rules do not add a fee for it yet.</p> : null}
          {advice.blocks > 0 ? (
            <details className="mt-3 text-sm text-[#f6f1e8]/70">
              <summary className="cursor-pointer font-medium text-[#f6f1e8]">How this was counted</summary>
              <p className="mt-2">{extraction.usageRightsDays} days asked, {rules.usageIncludedDays} included.</p>
              <p>{advice.extraDays} extra days = {advice.blocks} × {formatINR(rules.usageUpliftPer30Days)} = {formatINR(advice.usageAmount)}.</p>
            </details>
          ) : null}
        </section>

        <FollowUp action={action} waitDays={waitDays} onFollow={onFollow} onDone={onDone} onClear={onClear} />

        <dl className="divide-y divide-[#14110e]/10 rounded-2xl border border-[#14110e]/12 bg-white">
          {fields.map(([label, value]) => (
            <div className="flex items-start justify-between gap-4 px-4 py-3 text-sm" key={label}>
              <dt className="text-[#14110e]/50">{label}</dt>
              <dd className={`text-right font-medium ${value ? "" : "font-normal text-[#14110e]/35"}`}>{value || "Not in the conversation"}</dd>
            </div>
          ))}
        </dl>

        {extraction.notes.length ? <ul className="space-y-1 text-sm text-[#14110e]/55">{extraction.notes.map((note) => <li key={note}>{note}</li>)}</ul> : null}
        {extraction.gaps.length ? (
          <div>
            <h3 className="text-sm font-semibold">Still to confirm</h3>
            <ul className="mt-2 flex flex-wrap gap-2">{extraction.gaps.map((gap) => <li className="rounded-full bg-[#14110e]/8 px-2.5 py-1 text-xs text-[#14110e]/65" key={gap}>{gap}</li>)}</ul>
          </div>
        ) : <p className="text-sm text-[#14110e]/55">Every term in the brief was stated.</p>}
        <p className="text-xs text-[#14110e]/40">{extraction.detectionReason} Checked by AI.</p>

        <details className="rounded-2xl border border-[#14110e]/12 bg-white px-4 py-3" open={rulesOpen} onToggle={(event) => onRulesOpen(event.currentTarget.open)}>
          <summary className="cursor-pointer text-sm font-semibold">Your rate rules</summary>
          <div className="mt-3 grid gap-3">
            <Rule label="Usage already included, days" value={rules.usageIncludedDays} onChange={(value) => onRule("usageIncludedDays", value)} />
            <Rule label="Rupees per extra 30 days of usage" value={rules.usageUpliftPer30Days} onChange={(value) => onRule("usageUpliftPer30Days", value)} />
            <Rule label="Rupees per 30 days of exclusivity" value={rules.exclusivityUpliftPer30Days} onChange={(value) => onRule("exclusivityUpliftPer30Days", value)} />
            <Rule label="Minimum fee, rupees" value={rules.minimumOffer} onChange={(value) => onRule("minimumOffer", value)} />
            {audienceFloor != null ? (
              <p className="text-xs leading-5 text-[#14110e]/55">
                Instagram audience {new Intl.NumberFormat("en-IN").format(followers || 0)}. Starting minimum {formatINR(audienceFloor)}.
                <button className="ml-2 font-semibold text-[#14110e] underline" type="button" onClick={() => onRule("minimumOffer", audienceFloor)}>Use it</button>
              </p>
            ) : <p className="text-xs leading-5 text-[#14110e]/55">0 keeps every priced deal in Brand deals. A missing fee always stays there.</p>}
          </div>
        </details>

        <section className="rounded-2xl bg-[#14110e] p-4 text-white">
          <h3 className="text-sm font-semibold">{draftOverride ? "Fresh draft" : "Suggested reply"}</h3>
          <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-6 text-[#f6f1e8]">{draft}</pre>
          <p className="mt-3 text-xs text-[#f6f1e8]/50">Nothing is sent until you approve it — copy the draft, or press Send.</p>
          {confirmSend ? (
            <div className="mt-4 rounded-xl border border-white/15 bg-white/5 p-3">
              <p className="text-xs leading-5 text-[#f6f1e8]/80">
                Send this reply to {extraction.brand || conversation.fromName} via {conversation.source === "gmail" ? `Gmail (${conversation.fromHandle})` : "your Instagram account"}?
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="rounded-full bg-[#ff5a36] px-3 py-2 text-sm font-semibold text-[#14110e] transition hover:bg-[#ff7a5c] disabled:opacity-50" type="button" onClick={() => { setConfirmSend(false); onSend(draft); }} disabled={sending}>{sending ? "Sending…" : "Yes, send it"}</button>
                <button className="rounded-full border border-white/20 px-3 py-2 text-sm" type="button" onClick={() => setConfirmSend(false)} disabled={sending}>Keep editing</button>
              </div>
            </div>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="rounded-full bg-[#ff5a36] px-3 py-2 text-sm font-semibold text-[#14110e] transition hover:bg-[#ff7a5c] disabled:opacity-50" type="button" onClick={() => setConfirmSend(true)} disabled={sending || drafting}>Send reply</button>
            <button className="rounded-full border border-white/20 px-3 py-2 text-sm disabled:opacity-50" type="button" onClick={onRewrite} disabled={drafting || sending}>{drafting ? "Writing" : "Rewrite with AI"}</button>
            <button className="rounded-full border border-white/20 px-3 py-2 text-sm" type="button" onClick={() => onCopy(draft)}>Copy approved reply</button>
            <button className="rounded-full border border-white/20 px-3 py-2 text-sm" type="button" onClick={onAside}>Set aside</button>
          </div>
        </section>
      </motion.div>
    </aside>
  );
}

function FollowUp({ action, waitDays, onFollow, onDone, onClear }: { action: Action; waitDays: number; onFollow: () => void; onDone: () => void; onClear: () => void }) {
  if (action.followUpAt && !action.followedUp) {
    return (
      <section className="rounded-2xl bg-[#14110e] px-4 py-4 text-white">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-[#ff5a36]">{followUpLabel(action)}</p>
        <p className="mt-1 font-serif text-3xl tracking-tight">{formatDate(action.followUpAt)}</p>
        <p className="mt-1 text-xs text-[#f6f1e8]/50">Reminder on this device. Nothing is sent.</p>
        <div className="mt-4 flex gap-2">
          <button className="rounded-full bg-[#f6f1e8] px-3 py-2 text-sm font-semibold text-[#14110e]" type="button" onClick={onDone}>Mark followed up</button>
          <button className="rounded-full border border-white/20 px-3 py-2 text-sm" type="button" onClick={onClear}>Clear</button>
        </div>
      </section>
    );
  }
  const noun = waitDays === 1 ? "day" : "days";
  return (
    <section className="rounded-2xl bg-[#14110e] px-4 py-4 text-white">
      <p className="text-[11px] font-semibold tracking-[0.14em] text-[#ff5a36]">FOLLOW UP IN {waitDays} {noun.toUpperCase()}</p>
      <p className="mt-1 font-serif text-3xl tracking-tight">{formatDate(toISODate(addDays(waitDays)))}</p>
      <p className="mt-1 text-xs text-[#f6f1e8]/50">{action.followedUp ? "You marked the last reminder done." : "A reminder on this device. Nothing is sent."}</p>
      <button className="mt-4 rounded-full bg-[#f6f1e8] px-3 py-2 text-sm font-semibold text-[#14110e]" type="button" onClick={onFollow}>Set reminder</button>
    </section>
  );
}

function Rule({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="grid gap-1 text-xs text-[#14110e]/55">
      {label}
      <input className="w-full rounded-xl border border-[#14110e]/12 bg-white px-3 py-2 text-sm text-[#14110e]" type="number" min={0} step={1} value={value} onChange={(event) => {
        const next = Number(event.target.value);
        if (Number.isFinite(next) && next >= 0) onChange(next);
      }} />
    </label>
  );
}
