"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
type Filter = "deals" | "below" | "followups" | "all" | "aside";
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

function preview(conversation: Conversation) {
  const line = (conversation.messages[0]?.text || "").replace(/\s+/g, " ").trim();
  return line.length > 88 ? `${line.slice(0, 88).trim()}…` : line;
}

function listTitle(conversation: InboxConversation, extraction: Extraction) {
  if (!extraction.isBrandOpportunity) return conversation.fromName;
  return extraction.brand || extraction.campaign || conversation.fromName;
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
  const [grokDrafts, setGrokDrafts] = useState<Record<string, string>>({});
  const [drafting, setDrafting] = useState(false);
  const [pane, setPane] = useState<"list" | "thread">("list");
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
      "sign-in-first": "Sign in with Google first, then connect Instagram.",
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
    if (mode === "followups") return Boolean(action.followUpAt) && !action.followedUp && !action.dismissed;
    if (mode === "aside") return action.dismissed;
    return true;
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
      const warning = body.modelErrors ? ` OpenAI missed ${body.modelErrors}, so the rules reader filled those.` : "";
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
      const warning = body.modelErrors ? ` OpenAI missed ${body.modelErrors}, so the rules reader filled those.` : "";
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
      setToast(body.reader === "grok" ? "Grok wrote a draft. Copy it when you approve it." : body.modelError || "Rules draft is ready. Copy it when you approve it.");
    } catch {
      setToast("The draft failed.");
    } finally {
      setDrafting(false);
    }
  }

  const banner = email
    ? email
    : supabaseConfigured
      ? "Sign in to read Gmail. Connect a professional Instagram account for DMs."
      : "Add Supabase and Google in .env before connecting an inbox.";

  const filters = [
    ["deals", "Brand deals", dealCount],
    ["below", "Below your rate", belowCount],
    ["followups", "Follow-ups", followCount],
    ["all", "All messages", conversations.filter(sourceOn).length],
    ["aside", "Set aside", conversations.filter((item) => matches(item, "aside")).length],
  ] as const;

  return (
    <div className="flex h-screen min-w-0 flex-col overflow-hidden bg-zinc-100 text-zinc-950">
      <header className="flex h-16 shrink-0 items-center gap-4 border-b border-zinc-200 bg-white px-4 md:px-6">
        <a href="/" className="flex min-w-0 items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-zinc-950 text-sm font-semibold text-white">B</span>
          <span className="truncate font-serif text-lg leading-none tracking-tight">Brand Deal Inbox</span>
        </a>
        <div className="ml-auto flex items-center gap-2">
          {email ? (
            <label className="mr-1 hidden items-center gap-2 text-xs text-zinc-600 lg:flex">
              <input className="h-4 w-4 accent-zinc-950" type="checkbox" checked={autoSync} onChange={(event) => toggleAuto(event.target.checked)} />
              Auto sync
            </label>
          ) : null}
          <a className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50" href="/connect">Inboxes</a>
          {email ? (
            <button className="rounded-lg bg-zinc-950 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50" type="button" onClick={() => void syncAll()} disabled={syncing != null}>
              {syncing ? "Reading" : "Sync"}
            </button>
          ) : (
            <a className="rounded-lg bg-zinc-950 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800" href="/connect">Connect inboxes</a>
          )}
          {email ? <a className="hidden rounded-lg px-2 py-2 text-sm text-zinc-500 hover:text-zinc-950 sm:inline" href="/auth/sign-out">Sign out</a> : null}
        </div>
      </header>

      <div className="grid min-h-0 min-w-0 flex-1 overflow-hidden md:grid-cols-[300px_minmax(0,1fr)]">
        <aside className={`${pane === "thread" ? "hidden md:flex" : "flex"} min-h-0 flex-col border-r border-zinc-200 bg-white`}>
          <div className="border-b border-zinc-100 px-4 py-3 text-xs text-zinc-500">{banner}</div>
          <nav className="grid gap-1 px-3 py-3">
            {filters.map(([id, label, count]) => (
              <button key={id} className={`flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${filter === id ? "bg-zinc-950 text-white" : "text-zinc-700 hover:bg-zinc-100"}`} type="button" onClick={() => chooseFilter(id)}>
                <span>{label}</span>
                <span className={`text-xs ${filter === id ? "text-zinc-300" : "text-zinc-400"}`}>{count}</span>
              </button>
            ))}
          </nav>
          <div className="border-t border-zinc-100 px-4 py-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">Platforms</p>
            <div className="grid gap-2">
              <PlatformToggle label="Gmail" on={sources.gmail} detail={sources.gmail ? "In this inbox" : "Hidden"} onClick={() => toggleSource("gmail")} />
              <PlatformToggle label="Instagram" on={sources.instagram && instagramReady} detail={instagramReady ? (sources.instagram ? "In this inbox" : "Hidden") : "Not connected"} onClick={() => instagramReady ? toggleSource("instagram") : undefined} disabled={!instagramReady} />
              <a className="text-xs font-medium text-zinc-500 underline" href="/connect">Add an inbox</a>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
            {visible.length ? visible.map((conversation) => {
              const extraction = readingFor(conversation);
              const action = actionFor(conversation.id);
              const active = selected?.id === conversation.id;
              const unread = !action.seen && extraction.isBrandOpportunity;
              return (
                <button key={conversation.id} className={`mb-1 w-full rounded-xl px-3 py-3 text-left ${active ? "bg-zinc-100" : "hover:bg-zinc-50"}`} type="button" onClick={() => select(conversation.id)}>
                  <span className="flex items-center justify-between gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${conversation.source === "gmail" ? "bg-blue-50 text-blue-700" : "bg-pink-50 text-pink-700"}`}>
                      {conversation.source === "gmail" ? "Gmail" : "Instagram"}
                    </span>
                    <span className="text-xs text-zinc-400">{formatDate(conversation.receivedAt)}</span>
                  </span>
                  <span className="mt-2 flex items-center gap-2">
                    {unread ? <span className="h-1.5 w-1.5 rounded-full bg-orange-500" /> : null}
                    <span className="truncate text-sm font-semibold">{listTitle(conversation, extraction)}</span>
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-zinc-500">{listSubtitle(conversation, extraction)}</span>
                  <span className="mt-1 block truncate text-xs text-zinc-400">{preview(conversation)}</span>
                  {action.followUpAt && !action.followedUp ? <span className="mt-2 block text-[11px] font-semibold tracking-wide text-orange-700">{followUpLabel(action)}</span> : null}
                </button>
              );
            }) : (
              <div className="px-3 py-8">
                <h2 className="font-serif text-2xl tracking-tight">{conversations.length ? "Nothing in this view" : "No messages yet"}</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  {conversations.length ? "Another filter still has threads." : "Sync Gmail or Instagram. Priced deals under your minimum move to Below your rate."}
                </p>
              </div>
            )}
          </div>
        </aside>

        <div className={`${pane === "list" ? "hidden md:grid" : "grid"} h-full min-h-0 min-w-0 overflow-hidden xl:grid-cols-[minmax(0,1fr)_400px]`}>
        <section className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-zinc-50">
          <Thread conversation={selected} onBack={() => setPane("list")} />
        </section>
        <Deal
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
      <div className={`fixed bottom-5 left-1/2 z-20 w-[min(32rem,calc(100%-2rem))] -translate-x-1/2 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm shadow-xl ${toast == null ? "hidden" : ""}`} role="status" aria-live="polite">{toast}</div>
    </div>
  );
}

function PlatformToggle({ label, detail, on, onClick, disabled }: { label: string; detail: string; on: boolean; onClick?: () => void; disabled?: boolean }) {
  return (
    <button className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 px-3 py-2 text-left disabled:cursor-not-allowed disabled:bg-zinc-50" type="button" onClick={onClick} disabled={disabled}>
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-[11px] text-zinc-500">{detail}</span>
      </span>
      <span className={`h-5 w-9 rounded-full p-0.5 ${on ? "bg-zinc-950" : "bg-zinc-200"}`}>
        <span className={`block h-4 w-4 rounded-full bg-white transition ${on ? "translate-x-4" : ""}`} />
      </span>
    </button>
  );
}

function Thread({ conversation, onBack }: { conversation: InboxConversation | null; onBack: () => void }) {
  if (!conversation) {
    return (
      <main className="grid flex-1 place-items-center px-8">
        <div className="max-w-md text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">Inbox</p>
          <h2 className="mt-3 font-serif text-4xl tracking-tight">Choose a thread</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-500">Sync Gmail or Instagram, then open a conversation. The deal card reads the terms beside it.</p>
        </div>
      </main>
    );
  }
  const extraction = readingFor(conversation);
  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <header className="min-w-0 border-b border-zinc-200 bg-white px-5 py-4">
        <button className="mb-3 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm md:hidden" type="button" onClick={onBack}>Back</button>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-700">{conversation.source === "gmail" ? "Gmail thread" : "Instagram DM"}</p>
        <h2 className="mt-1 break-words font-serif text-3xl tracking-tight">{conversation.fromName}</h2>
        <p className="mt-1 break-all text-sm text-zinc-500">{conversation.fromHandle}</p>
        {conversation.subject ? <p className="mt-3 break-words text-sm font-medium">{conversation.subject}</p> : null}
      </header>
      <div className="min-h-0 min-w-0 flex-1 space-y-3 overflow-x-hidden overflow-y-auto px-5 py-5">
        {conversation.messages.map((message, index) => (
          <article className={`min-w-0 max-w-full rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${message.from === "you" ? "ml-auto max-w-xl bg-zinc-950 text-white" : "bg-white"}`} key={`${message.at}-${index}`}>
            <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{message.text}</p>
            <p className={`mt-2 text-xs ${message.from === "you" ? "text-zinc-400" : "text-zinc-400"}`}>{formatWhen(message.at)}</p>
          </article>
        ))}
        <p className="text-sm text-zinc-500">{extraction.detectionReason}</p>
      </div>
    </main>
  );
}

function Deal({
  conversation,
  rules,
  rulesOpen,
  action,
  onRulesOpen,
  onRule,
  onFollow,
  onDone,
  onClear,
  onAside,
  onCopy,
  draftOverride,
  drafting,
  followers,
  onRewrite,
}: {
  conversation: InboxConversation | null;
  rules: RateRules;
  rulesOpen: boolean;
  action: Action;
  onRulesOpen: (open: boolean) => void;
  onRule: (key: keyof RateRules, value: number) => void;
  onFollow: () => void;
  onDone: () => void;
  onClear: () => void;
  onAside: () => void;
  onCopy: (draft: string) => void;
  draftOverride?: string;
  drafting: boolean;
  followers: number | null;
  onRewrite: () => void;
}) {
  const shell = "flex max-h-[46vh] min-h-0 flex-col overflow-y-auto border-t border-zinc-200 bg-white xl:max-h-none xl:border-t-0 xl:border-l";
  if (!conversation) return <aside className={shell} />;
  const extraction = readingFor(conversation);
  if (!extraction.isBrandOpportunity) {
    return (
      <aside className={`${shell} px-6 py-8`}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400">Reader</p>
        <h2 className="mt-2 font-serif text-3xl tracking-tight">No brand deal here</h2>
        <p className="mt-3 text-sm leading-6 text-zinc-500">{extraction.detectionReason}</p>
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
      <div className="border-b border-zinc-100 px-5 py-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-700">The deal</p>
        <h2 className="mt-1 font-serif text-3xl tracking-tight">{extraction.brand || extraction.campaign || "Untitled deal"}</h2>
      </div>
      <div className="space-y-5 px-5 py-5">
        <section className="rounded-2xl bg-orange-50 px-4 py-4">
          <p className="text-sm text-orange-950/70">{lead}</p>
          <p className="mt-1 font-serif text-2xl leading-tight tracking-tight text-orange-950">{main}</p>
          {advice.suggestedOffer != null && advice.usageAmount > 0 ? <p className="mt-3 text-sm font-semibold">Suggested counter {formatINR(advice.suggestedOffer)}</p> : null}
          {underFloor ? <p className="mt-2 text-sm text-orange-950/80">Under your {formatINR(rules.minimumOffer)} minimum. It sits in Below your rate.</p> : null}
          {unpriced ? <p className="mt-2 text-sm text-orange-950/80">No fee was stated. The reply asks for the budget and names your {formatINR(rules.minimumOffer)} minimum.</p> : null}
          {extraction.exclusivityDays != null && extraction.exclusivityDays > 0 && advice.exclusivityAmount > 0 ? <p className="mt-2 text-sm text-orange-950/80">{extraction.exclusivityDays}-day exclusivity adds {formatINR(advice.exclusivityAmount)}.</p> : null}
          {extraction.exclusivityDays != null && extraction.exclusivityDays > 0 && advice.exclusivityAmount === 0 ? <p className="mt-2 text-sm text-orange-950/80">{extraction.exclusivityDays}-day exclusivity is in the ask. Your rules do not add a fee for it yet.</p> : null}
          {advice.blocks > 0 ? (
            <details className="mt-3 text-sm text-orange-950/80">
              <summary className="cursor-pointer font-medium">How this was counted</summary>
              <p className="mt-2">{extraction.usageRightsDays} days asked, {rules.usageIncludedDays} included.</p>
              <p>{advice.extraDays} extra days = {advice.blocks} × {formatINR(rules.usageUpliftPer30Days)} = {formatINR(advice.usageAmount)}.</p>
            </details>
          ) : null}
        </section>

        <FollowUp action={action} waitDays={waitDays} onFollow={onFollow} onDone={onDone} onClear={onClear} />

        <dl className="divide-y divide-zinc-100 rounded-2xl border border-zinc-200">
          {fields.map(([label, value]) => (
            <div className="flex items-start justify-between gap-4 px-4 py-3 text-sm" key={label}>
              <dt className="text-zinc-500">{label}</dt>
              <dd className={`text-right font-medium ${value ? "" : "font-normal text-zinc-400"}`}>{value || "Not in the conversation"}</dd>
            </div>
          ))}
        </dl>

        {extraction.notes.length ? <ul className="space-y-1 text-sm text-zinc-500">{extraction.notes.map((note) => <li key={note}>{note}</li>)}</ul> : null}
        {extraction.gaps.length ? (
          <div>
            <h3 className="text-sm font-semibold">Still to confirm</h3>
            <ul className="mt-2 flex flex-wrap gap-2">{extraction.gaps.map((gap) => <li className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600" key={gap}>{gap}</li>)}</ul>
          </div>
        ) : <p className="text-sm text-zinc-500">Every term in the brief was stated.</p>}
        <p className="text-xs text-zinc-400">{extraction.detectionReason} {conversation.reader === "openai" ? "Read with OpenAI." : "Read with the rules reader."}</p>

        <details className="rounded-2xl border border-zinc-200 px-4 py-3" open={rulesOpen} onToggle={(event) => onRulesOpen(event.currentTarget.open)}>
          <summary className="cursor-pointer text-sm font-semibold">Your rate rules</summary>
          <div className="mt-3 grid gap-3">
            <Rule label="Usage already included, days" value={rules.usageIncludedDays} onChange={(value) => onRule("usageIncludedDays", value)} />
            <Rule label="Rupees per extra 30 days of usage" value={rules.usageUpliftPer30Days} onChange={(value) => onRule("usageUpliftPer30Days", value)} />
            <Rule label="Rupees per 30 days of exclusivity" value={rules.exclusivityUpliftPer30Days} onChange={(value) => onRule("exclusivityUpliftPer30Days", value)} />
            <Rule label="Minimum fee, rupees" value={rules.minimumOffer} onChange={(value) => onRule("minimumOffer", value)} />
            {audienceFloor != null ? (
              <p className="text-xs leading-5 text-zinc-500">
                Instagram audience {new Intl.NumberFormat("en-IN").format(followers || 0)}. Starting minimum {formatINR(audienceFloor)}.
                <button className="ml-2 font-semibold text-zinc-950 underline" type="button" onClick={() => onRule("minimumOffer", audienceFloor)}>Use it</button>
              </p>
            ) : <p className="text-xs leading-5 text-zinc-500">0 keeps every priced deal in Brand deals. A missing fee always stays there.</p>}
          </div>
        </details>

        <section className="rounded-2xl bg-zinc-950 p-4 text-white">
          <h3 className="text-sm font-semibold">{draftOverride ? "Grok draft" : "Suggested reply"}</h3>
          <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-6 text-zinc-100">{draft}</pre>
          <p className="mt-3 text-xs text-zinc-400">Nothing is sent. Copy it when you approve the wording.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-zinc-950 disabled:opacity-50" type="button" onClick={onRewrite} disabled={drafting}>{drafting ? "Writing" : "Rewrite with Grok"}</button>
            <button className="rounded-lg border border-white/20 px-3 py-2 text-sm" type="button" onClick={() => onCopy(draft)}>Copy approved reply</button>
            <button className="rounded-lg border border-white/20 px-3 py-2 text-sm" type="button" onClick={onAside}>Set aside</button>
          </div>
        </section>
      </div>
    </aside>
  );
}

function FollowUp({ action, waitDays, onFollow, onDone, onClear }: { action: Action; waitDays: number; onFollow: () => void; onDone: () => void; onClear: () => void }) {
  if (action.followUpAt && !action.followedUp) {
    return (
      <section className="rounded-2xl bg-zinc-950 px-4 py-4 text-white">
        <p className="text-[11px] font-semibold tracking-[0.14em]">{followUpLabel(action)}</p>
        <p className="mt-1 font-serif text-3xl tracking-tight">{formatDate(action.followUpAt)}</p>
        <p className="mt-1 text-xs text-zinc-400">Reminder on this device. Nothing is sent.</p>
        <div className="mt-4 flex gap-2">
          <button className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-zinc-950" type="button" onClick={onDone}>Mark followed up</button>
          <button className="rounded-lg border border-white/20 px-3 py-2 text-sm" type="button" onClick={onClear}>Clear</button>
        </div>
      </section>
    );
  }
  const noun = waitDays === 1 ? "day" : "days";
  return (
    <section className="rounded-2xl bg-zinc-950 px-4 py-4 text-white">
      <p className="text-[11px] font-semibold tracking-[0.14em]">FOLLOW UP IN {waitDays} {noun.toUpperCase()}</p>
      <p className="mt-1 font-serif text-3xl tracking-tight">{formatDate(toISODate(addDays(waitDays)))}</p>
      <p className="mt-1 text-xs text-zinc-400">{action.followedUp ? "You marked the last reminder done." : "A reminder on this device. Nothing is sent."}</p>
      <button className="mt-4 rounded-lg bg-white px-3 py-2 text-sm font-medium text-zinc-950" type="button" onClick={onFollow}>Set reminder</button>
    </section>
  );
}

function Rule({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="grid gap-1 text-xs text-zinc-600">
      {label}
      <input className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950" type="number" min={0} step={1} value={value} onChange={(event) => {
        const next = Number(event.target.value);
        if (Number.isFinite(next) && next >= 0) onChange(next);
      }} />
    </label>
  );
}
