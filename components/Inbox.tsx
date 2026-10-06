"use client";

import { useEffect, useMemo, useRef, useState, type Ref } from "react";
import {
  AnimatePresence,
  LayoutGroup,
  MotionConfig,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
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
const REPLY_WAIT_DAYS = 2;

const ease = [0.22, 1, 0.36, 1] as const;
const snap = { type: "spring", stiffness: 420, damping: 36 } as const;

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

function replyState(conversation: InboxConversation): "waiting" | "replied" | null {
  const last = conversation.messages[conversation.messages.length - 1];
  if (!last) return null;
  if (last.from === "you") return "waiting";
  return conversation.messages.some((message) => message.from === "you") ? "replied" : null;
}

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
}

export function Inbox({
  supabaseConfigured,
  email,
  savedConversations,
  authNotice,
  instagramConfigured,
  gmailConnected,
  instagramConnected,
  waitingSources = [],
}: {
  supabaseConfigured: boolean;
  email: string | null;
  savedConversations: InboxConversation[];
  authNotice: string | null;
  instagramConfigured: boolean;
  gmailConnected: boolean;
  instagramConnected: boolean;
  waitingSources?: string[];
}) {
  const [conversations, setConversations] = useState(savedConversations);
  const [selectedId, setSelectedId] = useState(savedConversations[0]?.id ?? "");
  const [filter, setFilter] = useState<Filter>("deals");
  const [rules, setRules] = useState<RateRules>(DEFAULT_RULES);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [actions, setActions] = useState<Record<string, Action>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<SourceKey | null>(null);
  const [instagramReady, setInstagramReady] = useState(instagramConnected);
  const [sources, setSources] = useState<Record<SourceKey, boolean>>({ gmail: true, instagram: true });
  const [autoSync, setAutoSync] = useState(true);
  const [followers, setFollowers] = useState<number | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [aiDrafts, setAiDrafts] = useState<Record<string, string>>({});
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [drafting, setDrafting] = useState(false);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [pane, setPane] = useState<"list" | "thread" | "deal">("list");
  const busy = useRef(false);
  const booted = useRef(false);
  const syncRef = useRef(async (_quiet?: boolean) => {});

  const live: Record<SourceKey, boolean> = { gmail: gmailConnected, instagram: instagramReady };

  useEffect(() => {
    const storedRules = loadJson<Partial<RateRules>>(STORAGE_RULES, {});
    setRules({ ...DEFAULT_RULES, ...storedRules });
    setActions(loadJson<Record<string, Action>>(STORAGE_ACTIONS, {}));
    setSources(loadJson<Record<SourceKey, boolean>>(STORAGE_SOURCES, { gmail: true, instagram: true }));
    const storedAuto = localStorage.getItem(STORAGE_AUTO);
    if (storedAuto != null) setAutoSync(storedAuto === "true");
    const notices: Record<string, string> = {
      error: "Google sign-in did not finish. Check the Supabase Google provider and redirect URL.",
      unconfigured: "Add the Supabase URL and publishable key to .env.local first.",
      "signed-in": "Signed in. Press Sync to read your inboxes.",
      "needs-sql": "Signed in. Create the tables first: in Supabase, run supabase/migrations/0001_inbox.sql, then sign in again.",
      "no-gmail-token": "Google signed you in, but did not grant inbox access. Connect Gmail again and allow it to be read.",
      "no-secret": "Add SUPABASE_SECRET_KEY to .env so the Gmail token can be saved.",
      "save-failed": "Saving the connection failed. Check the Supabase secret key and the SQL migrations.",
      instagram: "Instagram is connected. Sync it to read DMs.",
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
  }, [authNotice]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!fresh.size) return;
    const timer = window.setTimeout(() => setFresh(new Set()), 6000);
    return () => window.clearTimeout(timer);
  }, [fresh]);

  function actionFor(id: string) {
    return { ...emptyAction(), ...actions[id] };
  }

  function patchAction(id: string, patch: Partial<Action>) {
    setActions((current) => {
      const next = { ...current, [id]: { ...emptyAction(), ...current[id], ...patch } };
      localStorage.setItem(STORAGE_ACTIONS, JSON.stringify(next));
      return next;
    });
  }

  function sourceOn(conversation: InboxConversation) {
    if (conversation.source !== "gmail" && conversation.source !== "instagram") return true;
    return sources[conversation.source];
  }

  function matches(conversation: InboxConversation, mode: Filter) {
    if (!sourceOn(conversation)) return false;
    const extraction = readingFor(conversation);
    if (!extraction.isBrandOpportunity) return false;
    const action = actionFor(conversation.id);
    if (mode === "aside") return action.dismissed;
    if (action.dismissed) return false;
    if (mode === "deals") return !belowMinimum(extraction, rules.minimumOffer);
    if (mode === "below") return belowMinimum(extraction, rules.minimumOffer);
    return Boolean(action.followUpAt) && !action.followedUp;
  }

  const visible = useMemo(() => {
    const list = conversations.filter((conversation) => matches(conversation, filter));
    if (filter === "followups") {
      return list.sort((a, b) => (actionFor(a.id).followUpAt ?? "").localeCompare(actionFor(b.id).followUpAt ?? ""));
    }
    return list.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions, conversations, filter, rules.minimumOffer, sources]);

  const count = (mode: Filter) => conversations.filter((conversation) => matches(conversation, mode)).length;
  const dueCount = conversations.filter((conversation) => {
    if (!matches(conversation, "followups")) return false;
    return daysUntil(actionFor(conversation.id).followUpAt || "") <= 0;
  }).length;

  const selected = visible.find((item) => item.id === selectedId) ?? visible[0] ?? null;

  function select(id: string, openThread = true) {
    setSelectedId(id);
    patchAction(id, { seen: true });
    if (openThread) setPane("thread");
  }

  function chooseFilter(next: Filter) {
    setFilter(next);
    const upcoming = conversations.filter((conversation) => matches(conversation, next));
    if (upcoming.length && !upcoming.some((item) => item.id === selectedId)) {
      setSelectedId(upcoming[0].id);
      patchAction(upcoming[0].id, { seen: true });
    }
  }

  async function syncSource(source: SourceKey, quiet = false) {
    setSyncing(source);
    const name = source === "gmail" ? "Gmail" : "Instagram";
    try {
      const response = await fetch(`/api/${source}/sync`, { method: "POST" });
      const body = await response.json();
      if (!response.ok) {
        if (!quiet) setToast(body.error || `${name} sync failed.`);
        return;
      }
      const incoming = (body.conversations ?? []) as InboxConversation[];
      setConversations((current) => {
        const known = new Set(current.map((item) => item.id));
        const added = incoming.filter((item) => !known.has(item.id) && readingFor(item).isBrandOpportunity);
        if (added.length) setFresh((prev) => new Set([...prev, ...added.map((item) => item.id)]));
        return [...current.filter((item) => item.source !== source), ...incoming];
      });
      setSelectedId((current) => {
        if (current && incoming.some((item) => item.id === current)) return current;
        if (current && !incoming.length) return current;
        return incoming.find((item) => readingFor(item).isBrandOpportunity)?.id ?? current;
      });
      const noun = body.brandDeals === 1 ? "brand deal" : "brand deals";
      const warning = body.modelErrors ? ` Checked ${body.modelErrors} with the backup reader.` : "";
      if (!quiet) setToast(`Read ${name}. ${body.brandDeals} ${noun}.${warning}`);
    } catch {
      if (!quiet) setToast(`${name} sync failed.`);
    }
  }

  async function syncAll(quiet = false) {
    if (busy.current) return;
    const order = (["gmail", "instagram"] as const).filter((source) => live[source] && sources[source]);
    if (!order.length) {
      if (!quiet) setToast(live.gmail || live.instagram ? "Every source is switched off. Turn one on below the filters." : "Connect Gmail or Instagram to sync.");
      return;
    }
    busy.current = true;
    try {
      for (const source of order) await syncSource(source, quiet);
    } finally {
      busy.current = false;
      setSyncing(null);
    }
  }

  syncRef.current = syncAll;

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    if (email && !savedConversations.length) void syncRef.current();
  }, [email, savedConversations.length]);

  useEffect(() => {
    if (!email || !autoSync) return;
    const first = window.setTimeout(() => void syncRef.current(true), 20000);
    const timer = window.setInterval(() => void syncRef.current(true), 180000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [autoSync, email]);

  useEffect(() => {
    if (!instagramReady) return;
    fetch("/api/instagram/audience")
      .then((response) => response.json())
      .then((body: { followers?: number | null }) => {
        if (typeof body.followers === "number") setFollowers(body.followers);
      })
      .catch(() => undefined);
  }, [instagramReady]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isTyping(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key !== "j" && key !== "k") return;
      if (!visible.length) return;
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

  function toggleAuto(next: boolean) {
    setAutoSync(next);
    localStorage.setItem(STORAGE_AUTO, String(next));
  }

  function dropEdit(id: string) {
    setEdits((current) => {
      if (!(id in current)) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });
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
      setAiDrafts((current) => ({ ...current, [conversation.id]: body.draft }));
      dropEdit(conversation.id);
      setToast(body.modelError || "Fresh draft is ready. Edit it, then send or copy.");
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
        current.map((item) => (item.id === conversation.id ? { ...item, messages: [...item.messages, sent] } : item)),
      );
      dropEdit(conversation.id);
      const followUpAt = toISODate(addDays(REPLY_WAIT_DAYS));
      patchAction(conversation.id, { followUpAt, followUpDays: REPLY_WAIT_DAYS, followedUp: false, dismissed: false });
      const via = conversation.source === "gmail" ? "Sent via Gmail." : "Sent as your Instagram account.";
      setToast(`${via} Follow-up set for ${formatDate(followUpAt)} in case they go quiet.`);
    } catch {
      setToast("The reply was not sent.");
    } finally {
      setSendingId(null);
    }
  }

  const filters = [
    ["deals", "Brand deals", count("deals")],
    ["below", "Below your rate", count("below")],
    ["followups", "Follow-ups", count("followups")],
    ["aside", "Set aside", count("aside")],
  ] as const;

  const summary = !supabaseConfigured
    ? "Add Supabase and Google in .env before connecting an inbox."
    : syncing
      ? `Reading ${syncing === "gmail" ? "Gmail" : "Instagram"}…`
      : dueCount
        ? `${dueCount} follow-up${dueCount === 1 ? "" : "s"} due today.`
        : conversations.length
          ? "Pick a deal. J and K move through the list."
          : "Press Sync to read your inboxes.";

  return (
    <MotionConfig reducedMotion="user">
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

        <div className="grid min-h-0 min-w-0 flex-1 overflow-hidden md:grid-cols-[310px_minmax(0,1fr)]">
          <aside className={`${pane === "list" ? "flex" : "hidden"} min-h-0 min-w-0 flex-col border-white/10 md:flex md:border-r`}>
            <div className="shrink-0 space-y-3 border-b border-white/10 px-3 py-3">
              <AnimatePresence mode="wait" initial={false}>
                <motion.p key={summary} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }} className={`line-clamp-2 text-xs leading-5 ${dueCount && !syncing ? "text-[#ff5a36]" : "text-[#f6f1e8]/50"}`}>
                  {summary}
                </motion.p>
              </AnimatePresence>
              <LayoutGroup id="desk-filters">
                <div className="flex flex-wrap gap-1.5">
                  {filters.map(([id, label, n]) => {
                    const on = filter === id;
                    return (
                      <button key={id} type="button" onClick={() => chooseFilter(id)} className={`relative shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${on ? "text-[#14110e]" : "bg-white/[0.06] text-[#f6f1e8]/60 hover:bg-white/10"}`}>
                        {on ? <motion.span layoutId="desk-filter" className="absolute inset-0 rounded-full bg-[#f6f1e8]" transition={snap} /> : null}
                        <span className="relative inline-flex items-center gap-1">
                          {label} <Count n={n} />
                          {id === "followups" && dueCount ? <span className="h-1.5 w-1.5 rounded-full bg-[#ff5a36]" aria-label={`${dueCount} due`} /> : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </LayoutGroup>
              <div className="flex flex-wrap items-center gap-1.5">
                <SourceChip label="Gmail" on={live.gmail && sources.gmail} disabled={!live.gmail} title={live.gmail ? "Show or hide Gmail" : "Gmail is not connected"} onClick={() => toggleSource("gmail")} />
                <SourceChip label="Instagram" on={live.instagram && sources.instagram} disabled={!live.instagram} title={live.instagram ? "Show or hide Instagram" : instagramConfigured ? "Instagram is not connected" : "Instagram is not set up"} onClick={() => toggleSource("instagram")} />
                <a className="px-2 text-xs font-medium text-[#f6f1e8]/45 underline hover:text-white" href="/connect">Manage</a>
              </div>
              {waitingSources.length ? (
                <p className="text-[11px] leading-4 text-[#f6f1e8]/35">{waitingSources.join(" and ")} {waitingSources.length === 1 ? "is" : "are"} connected. Reading {waitingSources.length === 1 ? "it" : "them"} here is coming next.</p>
              ) : null}
            </div>
            <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-2">
              <AnimatePresence>
                {syncing && !visible.length ? [0, 1, 2].map((i) => <SkeletonRow key={`sk-${i}`} index={i} />) : null}
              </AnimatePresence>
              {visible.length ? (
                <LayoutGroup id="desk-list">
                  <AnimatePresence initial={false} mode="popLayout">
                    {visible.map((conversation) => (
                      <ThreadRow
                        key={conversation.id}
                        conversation={conversation}
                        action={actionFor(conversation.id)}
                        active={selected?.id === conversation.id}
                        fresh={fresh.has(conversation.id)}
                        onSelect={() => select(conversation.id)}
                      />
                    ))}
                  </AnimatePresence>
                </LayoutGroup>
              ) : !syncing ? (
                <EmptyList filter={filter} hasAny={conversations.length > 0} canSync={live.gmail || live.instagram} onSync={() => void syncAll()} />
              ) : null}
            </div>
          </aside>

          <div className={`${pane === "list" ? "hidden" : "grid"} min-h-0 min-w-0 overflow-hidden md:grid lg:grid-cols-[minmax(0,1fr)_400px]`}>
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
                  const dismissed = !actionFor(selected.id).dismissed;
                  patchAction(selected.id, { dismissed });
                  setToast(dismissed ? "Set aside. Find it under Set aside." : "Moved back to your deals.");
                }}
                aiDraft={selected ? aiDrafts[selected.id] : undefined}
                edit={selected ? edits[selected.id] : undefined}
                onEdit={(text) => { if (selected) setEdits((current) => ({ ...current, [selected.id]: text })); }}
                onResetEdit={() => { if (selected) dropEdit(selected.id); }}
                drafting={drafting}
                onSend={(draft) => { if (selected) void sendReply(selected, draft); }}
                sending={selected ? sendingId === selected.id : false}
                followers={followers}
                onRewrite={() => { if (selected) void rewriteDraft(selected); }}
                onCopy={(draft) => {
                  if (navigator.clipboard?.writeText) {
                    navigator.clipboard.writeText(draft).then(
                      () => setToast("Reply copied. Nothing was sent."),
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
              key={toast}
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              className="fixed bottom-5 left-1/2 z-30 w-[min(32rem,calc(100%-2rem))] -translate-x-1/2 rounded-2xl bg-[#f6f1e8] px-4 py-3 text-sm text-[#14110e] shadow-xl"
              role="status"
              aria-live="polite"
            >
              {toast}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}

function Count({ n }: { n: number }) {
  return (
    <span className="relative inline-flex overflow-hidden tabular-nums">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={n} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -8, opacity: 0 }} transition={{ duration: 0.22, ease }}>
          {n}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function CountTo({ from, to, delay = 0.35 }: { from: number; to: number; delay?: number }) {
  const reduce = useReducedMotion();
  const value = useMotionValue(reduce ? to : from);
  const text = useTransform(value, (v) => formatINR(Math.round(v)));
  useEffect(() => {
    if (reduce) {
      value.jump(to);
      return;
    }
    value.jump(from);
    const controls = animate(value, to, { duration: 0.9, delay, ease });
    return () => controls.stop();
  }, [from, to, delay, reduce, value]);
  return <motion.span className="tabular-nums">{text}</motion.span>;
}

function SourceChip({ label, on, onClick, disabled, title }: { label: string; on: boolean; onClick?: () => void; disabled?: boolean; title?: string }) {
  return (
    <button title={title} className={`rounded-full border px-3 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${on ? "border-transparent bg-[#ff5a36] text-[#14110e]" : "border-white/12 bg-transparent text-[#f6f1e8]/50 hover:border-white/25"}`} type="button" onClick={onClick} disabled={disabled} aria-pressed={on}>
      {label}
    </button>
  );
}

function SkeletonRow({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ delay: index * 0.08 }}
      className="relative mb-1.5 overflow-hidden rounded-2xl border border-white/8 px-4 py-3.5"
    >
      <span className="block h-3 w-16 rounded-full bg-white/10" />
      <span className="mt-3 block h-3.5 w-2/3 rounded-full bg-white/10" />
      <span className="mt-2 block h-3 w-1/2 rounded-full bg-white/[0.07]" />
      <motion.span
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)" }}
        animate={{ x: ["-100%", "100%"] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
      />
    </motion.div>
  );
}

function ThreadRow({
  conversation,
  action,
  active,
  fresh,
  onSelect,
  ref,
}: {
  conversation: InboxConversation;
  action: Action;
  active: boolean;
  fresh: boolean;
  onSelect: () => void;
  ref?: Ref<HTMLButtonElement>;
}) {
  const extraction = readingFor(conversation);
  const unread = !action.seen;
  const state = replyState(conversation);
  const due = action.followUpAt && !action.followedUp;
  return (
    <motion.button
      ref={ref}
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
      {fresh && !active ? (
        <motion.span
          aria-hidden="true"
          className="absolute inset-0 rounded-2xl border border-[#ff5a36]"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 5, ease: "easeIn" }}
        />
      ) : null}
      <span className="relative block">
        <span className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${conversation.source === "gmail" ? (active ? "bg-[#14110e] text-[#f6f1e8]" : "bg-white/10 text-[#f6f1e8]/75") : "bg-[#ff5a36] text-[#14110e]"}`}>
              {conversation.source === "gmail" ? "Gmail" : "Instagram"}
            </span>
            {fresh ? <span className={`text-[10px] font-semibold uppercase tracking-wide ${active ? "text-[#c2410c]" : "text-[#ff5a36]"}`}>New</span> : null}
          </span>
          <span className={`shrink-0 text-xs ${active ? "text-[#14110e]/50" : "text-[#f6f1e8]/40"}`}>{formatDate(conversation.receivedAt)}</span>
        </span>
        <span className="mt-2 flex min-w-0 items-center gap-2">
          {unread && !active ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#ff5a36]" aria-label="Unread" /> : null}
          <span className="truncate text-sm font-semibold">{listTitle(conversation, extraction)}</span>
        </span>
        <span className={`mt-0.5 block truncate text-xs ${active ? "text-[#14110e]/60" : "text-[#f6f1e8]/50"}`}>{listSubtitle(conversation, extraction)}</span>
        <span className={`mt-1 block truncate text-xs font-medium ${active ? "text-[#14110e]" : "text-[#ff5a36]/90"}`}>{dealLine(extraction)}</span>
        {state === "replied" ? (
          <span className={`mt-2 block text-[11px] font-semibold tracking-wide ${active ? "text-[#c2410c]" : "text-[#ff5a36]"}`}>THEY REPLIED</span>
        ) : due ? (
          <span className={`mt-2 block text-[11px] font-semibold tracking-wide ${active ? "text-[#c2410c]" : "text-[#ff5a36]"}`}>{followUpLabel(action)}</span>
        ) : state === "waiting" ? (
          <span className={`mt-2 block text-[11px] font-semibold tracking-wide ${active ? "text-[#14110e]/45" : "text-[#f6f1e8]/40"}`}>WAITING ON THEM</span>
        ) : null}
      </span>
    </motion.button>
  );
}

function EmptyList({ filter, hasAny, canSync, onSync }: { filter: Filter; hasAny: boolean; canSync: boolean; onSync: () => void }) {
  const copy: Record<Filter, [string, string]> = {
    deals: hasAny ? ["Nothing at your rate", "Check Below your rate, or lower your minimum in rate rules."] : ["No brand deals yet", "Sync to read your inboxes. Only brand deals are listed."],
    below: ["Nothing under your minimum", "Deals priced below your minimum land here."],
    followups: ["No follow-ups", "Send a reply or set a reminder. It shows up here until you mark it done."],
    aside: ["Nothing set aside", "Deals you set aside wait here. You can move them back."],
  };
  const [title, body] = copy[filter];
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="px-3 py-10">
      <h2 className="font-serif text-2xl tracking-tight">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[#f6f1e8]/50">{body}</p>
      {filter === "deals" && !hasAny ? (
        canSync ? (
          <button type="button" onClick={onSync} className="mt-4 rounded-full bg-[#ff5a36] px-4 py-2 text-sm font-semibold text-[#14110e] hover:bg-[#ff7a5c]">Sync now</button>
        ) : (
          <a href="/connect" className="mt-4 inline-block rounded-full bg-[#f6f1e8] px-4 py-2 text-sm font-semibold text-[#14110e]">Connect Gmail or Instagram</a>
        )
      ) : null}
    </motion.div>
  );
}

function Thread({ conversation, onBack, onDeal }: { conversation: InboxConversation | null; onBack: () => void; onDeal: () => void }) {
  const scroller = useRef<HTMLDivElement>(null);
  const seen = useRef<{ id: string; count: number } | null>(null);
  const messageCount = conversation?.messages.length ?? 0;

  useEffect(() => {
    const el = scroller.current;
    if (!conversation || !el) return;
    const before = seen.current;
    seen.current = { id: conversation.id, count: messageCount };
    if (before?.id === conversation.id && messageCount > before.count) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [conversation, messageCount]);

  if (!conversation) {
    return (
      <main className="grid flex-1 place-items-center bg-[#14110e] px-8">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-md text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#f6f1e8]/35">Your desk</p>
          <h2 className="mt-3 font-serif text-4xl tracking-tight text-white">Choose a thread</h2>
          <p className="mt-3 text-sm leading-6 text-[#f6f1e8]/50">The desk pulls out the fee, prices the usage, and drafts the counter. You approve it.</p>
        </motion.div>
      </main>
    );
  }
  const extraction = readingFor(conversation);
  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#14110e]">
      <header className="flex min-w-0 shrink-0 items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={conversation.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="min-w-0">
            <button className="mb-3 rounded-full border border-white/15 px-3 py-1 text-sm text-[#f6f1e8]/75 md:hidden" type="button" onClick={onBack}>Back</button>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#ff5a36]">{conversation.source === "gmail" ? "Gmail thread" : "Instagram DM"}</p>
            <h2 className="mt-1 break-words font-serif text-3xl tracking-tight text-white">{conversation.fromName}</h2>
            <p className="mt-1 break-all text-sm text-[#f6f1e8]/45">{conversation.fromHandle}</p>
            {conversation.subject ? <p className="mt-3 break-words text-sm font-medium text-[#f6f1e8]/75">{conversation.subject}</p> : null}
          </motion.div>
        </AnimatePresence>
        <button className="shrink-0 rounded-full bg-[#f6f1e8] px-3 py-1.5 text-xs font-semibold text-[#14110e] lg:hidden" type="button" onClick={onDeal}>The deal</button>
      </header>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={conversation.id}
          ref={scroller}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="min-h-0 min-w-0 flex-1 space-y-3 overflow-x-hidden overflow-y-auto px-5 py-5"
        >
          {conversation.messages.map((message, index) => {
            const mine = message.from === "you";
            return (
              <motion.article
                key={`${message.at}-${index}`}
                initial={{ opacity: 0, x: mine ? 24 : 0, y: mine ? 0 : 8 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ duration: 0.32, delay: Math.min(index, 6) * 0.05, ease }}
                className={`min-w-0 max-w-full rounded-2xl px-4 py-3 text-sm leading-6 ${mine ? "ml-auto max-w-xl bg-[#f6f1e8] text-[#14110e]" : "border border-white/8 bg-white/[0.05] text-[#f6f1e8]/90"}`}
              >
                <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{message.text}</p>
                <p className={`mt-2 text-xs ${mine ? "text-[#14110e]/50" : "text-[#f6f1e8]/40"}`}>{mine ? "You · " : ""}{formatWhen(message.at)}</p>
              </motion.article>
            );
          })}
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
  aiDraft,
  edit,
  onEdit,
  onResetEdit,
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
  aiDraft?: string;
  edit?: string;
  onEdit: (text: string) => void;
  onResetEdit: () => void;
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
  const baseDraft = aiDraft || suggestedReply(conversation, extraction, advice, rules);
  const draft = edit ?? baseDraft;
  const edited = edit != null && edit !== baseDraft;
  const lastMine = [...conversation.messages].reverse().find((message) => message.from === "you");
  const waiting = replyState(conversation) === "waiting";
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
  const stated = fields.filter(([, value]) => value).length;
  const showCounter = advice.suggestedOffer != null && advice.usageAmount > 0;
  const channel = conversation.source === "gmail" ? `Gmail to ${conversation.fromHandle}` : "your Instagram account";

  return (
    <aside className={shell} aria-live="polite">
      <div className="sticky top-0 z-10 border-b border-[#14110e]/10 bg-[#f6f1e8] px-5 py-5">
        <button className="mb-3 rounded-full border border-[#14110e]/15 px-3 py-1 text-sm lg:hidden" type="button" onClick={onBack}>Back to the thread</button>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#ff5a36]">The deal</p>
        <h2 className="mt-1 break-words font-serif text-3xl tracking-tight">{extraction.brand || extraction.campaign || "Untitled deal"}</h2>
      </div>
      <motion.div key={conversation.id} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, ease }} className="space-y-5 bg-[#f6f1e8] px-5 py-5">
        <section className="rounded-2xl bg-[#14110e] px-4 py-4 text-[#f6f1e8]">
          <p className="text-sm text-[#f6f1e8]/60">{lead}</p>
          <p className="mt-1 font-serif text-2xl leading-tight tracking-tight">{main}</p>
          {showCounter ? (
            <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-xs text-[#f6f1e8]/50">Suggested counter</span>
              <span className="font-serif text-4xl tracking-tight text-[#ff5a36]">
                <CountTo key={`${conversation.id}-${advice.suggestedOffer}`} from={extraction.offerAmount ?? 0} to={advice.suggestedOffer ?? 0} />
              </span>
              {extraction.offerAmount != null ? <span className="text-xs text-[#f6f1e8]/45">from {formatINR(extraction.offerAmount)}</span> : null}
            </div>
          ) : null}
          {underFloor ? <p className="mt-2 text-sm text-[#f6f1e8]/70">Under your {formatINR(rules.minimumOffer)} minimum. It sits in Below your rate.</p> : null}
          {unpriced ? <p className="mt-2 text-sm text-[#f6f1e8]/70">No fee was stated. The reply asks for the budget and names your {formatINR(rules.minimumOffer)} minimum.</p> : null}
          {extraction.exclusivityDays != null && extraction.exclusivityDays > 0 && advice.exclusivityAmount > 0 ? <p className="mt-2 text-sm text-[#f6f1e8]/70">{extraction.exclusivityDays}-day exclusivity adds {formatINR(advice.exclusivityAmount)}.</p> : null}
          {extraction.exclusivityDays != null && extraction.exclusivityDays > 0 && advice.exclusivityAmount === 0 ? <p className="mt-2 text-sm text-[#f6f1e8]/70">{extraction.exclusivityDays}-day exclusivity is in the ask. Your rules do not add a fee for it yet.</p> : null}
          {advice.blocks > 0 ? (
            <details className="mt-3 text-sm text-[#f6f1e8]/70">
              <summary className="cursor-pointer font-medium text-[#f6f1e8]">How this was counted</summary>
              <p className="mt-2">{extraction.usageRightsDays} days asked, {rules.usageIncludedDays} included.</p>
              <p>{advice.extraDays} extra days = {advice.blocks} × {formatINR(rules.usageUpliftPer30Days)} = {formatINR(advice.usageAmount)}.</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {Array.from({ length: Math.min(advice.blocks, 12) }, (_, i) => (
                  <motion.span key={i} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.06 }} className="rounded bg-[#ff5a36]/80 px-1.5 py-0.5 text-[10px] font-semibold text-[#14110e]">+30</motion.span>
                ))}
              </div>
            </details>
          ) : null}
        </section>

        <FollowUp action={action} waitDays={waitDays} onFollow={onFollow} onDone={onDone} onClear={onClear} />

        <div>
          <div className="flex items-center justify-between text-xs text-[#14110e]/55">
            <span>{stated} of {fields.length} terms in the brief</span>
            {stated < fields.length ? <span>The reply asks for the rest</span> : <span>Complete</span>}
          </div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[#14110e]/10">
            <motion.div className="h-full rounded-full bg-[#14110e]" initial={{ width: 0 }} animate={{ width: `${(stated / fields.length) * 100}%` }} transition={{ duration: 0.6, delay: 0.15, ease }} />
          </div>
          <motion.dl
            className="mt-3 divide-y divide-[#14110e]/10 rounded-2xl border border-[#14110e]/12 bg-white"
            initial="hidden"
            animate="shown"
            variants={{ hidden: {}, shown: { transition: { staggerChildren: 0.04, delayChildren: 0.1 } } }}
          >
            {fields.map(([label, value]) => (
              <motion.div
                key={label}
                variants={{ hidden: { opacity: 0, x: 8 }, shown: { opacity: 1, x: 0, transition: { duration: 0.25, ease } } }}
                className="flex items-start justify-between gap-4 px-4 py-3 text-sm"
              >
                <dt className="text-[#14110e]/50">{label}</dt>
                <dd className={`text-right font-medium ${value ? "" : "font-normal text-[#14110e]/35"}`}>{value || "Not in the conversation"}</dd>
              </motion.div>
            ))}
          </motion.dl>
        </div>

        {extraction.notes.length ? <ul className="space-y-1 text-sm text-[#14110e]/55">{extraction.notes.map((note) => <li key={note}>{note}</li>)}</ul> : null}
        {extraction.gaps.length ? (
          <div>
            <h3 className="text-sm font-semibold">Still to confirm</h3>
            <ul className="mt-2 flex flex-wrap gap-2">{extraction.gaps.map((gap) => <li className="rounded-full bg-[#14110e]/8 px-2.5 py-1 text-xs text-[#14110e]/65" key={gap}>{gap}</li>)}</ul>
          </div>
        ) : null}

        <section className="rounded-2xl bg-[#14110e] p-4 text-white">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">{edited ? "Your edit" : aiDraft ? "Fresh AI draft" : "Suggested reply"}</h3>
            {edited ? <button type="button" onClick={onResetEdit} className="text-xs text-[#f6f1e8]/55 underline hover:text-white">Undo edits</button> : null}
          </div>
          <AnimatePresence initial={false}>
            {waiting && lastMine ? (
              <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-2 overflow-hidden text-xs text-[#f6f1e8]/55">
                You replied {formatWhen(lastMine.at)}. Waiting on them.
              </motion.p>
            ) : null}
          </AnimatePresence>
          <div className="relative mt-3">
            <motion.textarea
              key={aiDraft ?? "base"}
              initial={{ opacity: 0 }}
              animate={{ opacity: drafting ? 0.35 : 1 }}
              transition={{ duration: 0.3 }}
              value={draft}
              onChange={(event) => onEdit(event.target.value)}
              rows={Math.min(16, Math.max(6, draft.split("\n").length + 1))}
              aria-label="Reply draft"
              className="w-full resize-y rounded-xl border border-white/10 bg-white/[0.04] p-3 font-sans text-sm leading-6 text-[#f6f1e8] outline-none focus:border-[#ff5a36]/60"
            />
            <AnimatePresence>
              {drafting ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pointer-events-none absolute inset-0 grid place-items-center">
                  <span className="rounded-full bg-[#14110e] px-3 py-1.5 text-xs text-[#f6f1e8]/80">Writing a fresh draft…</span>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
          <p className="mt-2 text-xs text-[#f6f1e8]/50">Edit it here. Nothing is sent until you confirm.</p>
          <AnimatePresence initial={false}>
            {confirmSend ? (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease }}
                className="overflow-hidden"
              >
                <div className="mt-4 rounded-xl border border-[#ff5a36]/40 bg-[#ff5a36]/10 p-3">
                  <p className="text-xs leading-5 text-[#f6f1e8]/85">
                    {waiting ? "You already replied. Send this as well, " : "Send this reply "}to {extraction.brand || conversation.fromName} via {channel}?
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="rounded-full bg-[#ff5a36] px-3 py-2 text-sm font-semibold text-[#14110e] transition hover:bg-[#ff7a5c] disabled:opacity-50" type="button" onClick={() => { setConfirmSend(false); onSend(draft.trim()); }} disabled={sending || !draft.trim()}>Yes, send it</button>
                    <button className="rounded-full border border-white/20 px-3 py-2 text-sm" type="button" onClick={() => setConfirmSend(false)} disabled={sending}>Keep editing</button>
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="rounded-full bg-[#ff5a36] px-3 py-2 text-sm font-semibold text-[#14110e] transition hover:bg-[#ff7a5c] disabled:opacity-50" type="button" onClick={() => setConfirmSend(true)} disabled={sending || drafting || confirmSend || !draft.trim()}>
              {sending ? "Sending…" : waiting ? "Send again" : "Send reply"}
            </button>
            <button className="rounded-full border border-white/20 px-3 py-2 text-sm disabled:opacity-50" type="button" onClick={onRewrite} disabled={drafting || sending}>{drafting ? "Writing…" : "Rewrite with AI"}</button>
            <button className="rounded-full border border-white/20 px-3 py-2 text-sm" type="button" onClick={() => onCopy(draft)}>Copy</button>
            <button className="rounded-full border border-white/20 px-3 py-2 text-sm" type="button" onClick={onAside}>{action.dismissed ? "Move back to deals" : "Set aside"}</button>
          </div>
        </section>

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
        <p className="text-xs text-[#14110e]/40">{extraction.detectionReason}</p>
      </motion.div>
    </aside>
  );
}

function FollowUp({ action, waitDays, onFollow, onDone, onClear }: { action: Action; waitDays: number; onFollow: () => void; onDone: () => void; onClear: () => void }) {
  const set = Boolean(action.followUpAt && !action.followedUp);
  const noun = waitDays === 1 ? "day" : "days";
  return (
    <section className="overflow-hidden rounded-2xl bg-[#14110e] px-4 py-4 text-white">
      <AnimatePresence mode="wait" initial={false}>
        {set ? (
          <motion.div key="set" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.22, ease }}>
            <p className="text-[11px] font-semibold tracking-[0.14em] text-[#ff5a36]">{followUpLabel(action)}</p>
            <p className="mt-1 font-serif text-3xl tracking-tight">{formatDate(action.followUpAt || "")}</p>
            <p className="mt-1 text-xs text-[#f6f1e8]/50">Reminder on this device. Nothing is sent.</p>
            <div className="mt-4 flex gap-2">
              <button className="rounded-full bg-[#f6f1e8] px-3 py-2 text-sm font-semibold text-[#14110e]" type="button" onClick={onDone}>Mark followed up</button>
              <button className="rounded-full border border-white/20 px-3 py-2 text-sm" type="button" onClick={onClear}>Clear</button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="unset" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.22, ease }}>
            <p className="text-[11px] font-semibold tracking-[0.14em] text-[#ff5a36]">FOLLOW UP IN {waitDays} {noun.toUpperCase()}</p>
            <p className="mt-1 font-serif text-3xl tracking-tight">{formatDate(toISODate(addDays(waitDays)))}</p>
            <p className="mt-1 text-xs text-[#f6f1e8]/50">{action.followedUp ? "You marked the last reminder done." : waitDays === 1 ? "They said tomorrow, so the wait is 1 day." : "A reminder on this device. Nothing is sent."}</p>
            <button className="mt-4 rounded-full bg-[#f6f1e8] px-3 py-2 text-sm font-semibold text-[#14110e]" type="button" onClick={onFollow}>Set reminder</button>
          </motion.div>
        )}
      </AnimatePresence>
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
