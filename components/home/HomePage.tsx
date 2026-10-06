"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
} from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as const;

const sources = [
  { name: "Gmail", detail: "Brand email, connected in one tap. Signing in creates your account.", state: "Live", live: true },
  { name: "Instagram", detail: "DMs on a professional account, with message access you approve.", state: "Live", live: true },
  { name: "WhatsApp Business", detail: "Your business inbox, next in line.", state: "Coming soon", live: false },
  { name: "Outlook", detail: "Brand mail on Outlook and Hotmail.", state: "Coming soon", live: false },
  { name: "X", detail: "Direct messages.", state: "Coming soon", live: false },
  { name: "Messenger", detail: "Your Page inbox.", state: "Coming soon", live: false },
];

const beats = [
  { id: "offer", label: "Offer", value: "₹80,000", hint: "Fee + 50% advance, stated in the thread." },
  { id: "work", label: "Deliverables", value: "2 Reels + 3 Stories", hint: "Scope, lifted word-for-word." },
  { id: "usage", label: "Usage", value: "90 days", hint: "30 days already in your rate." },
  { id: "uplift", label: "Uplift", value: "+₹25,000", hint: "2 extra blocks × ₹12,500." },
  { id: "counter", label: "Counter", value: "₹1,05,000", hint: "Fee plus usage. You approve it." },
  { id: "follow", label: "Follow up", value: "In 2 days", hint: "1 day if they said “tomorrow”." },
] as const;

type BeatId = (typeof beats)[number]["id"];

const steps = [
  {
    n: "01",
    title: "Connect where deals land",
    copy: "Sign in with Google to create your account, then connect only the inboxes you use — Gmail, Instagram, WhatsApp Business, Outlook, X and Messenger. Nothing is mandatory. One desk for every inbox, so you stop checking six apps.",
    points: ["Sign in with Google", "Every inbox optional", "Skip whenever you like"],
  },
  {
    n: "02",
    title: "Every thread gets found and pulled apart",
    copy: "Each sync reads recent threads and DMs, keeps only real brand opportunities, and lifts out the fee, deliverables, deadline, usage, exclusivity and payment. Blanks stay blank — nothing is guessed.",
    points: ["Fee, scope, deadline, usage", "Exclusivity + payment terms", "Newsletters kept out"],
  },
  {
    n: "03",
    title: "Every offer gets evaluated",
    copy: "Thirty days of usage are already inside your rate. Every extra 30 days adds ₹12,500. The Samsung ask — 90 days on an ₹80,000 offer — becomes a ₹1,05,000 counter you can see the maths for.",
    points: ["90 asked − 30 included", "60 extra = 2 × ₹12,500", "+₹25,000 on the counter"],
  },
  {
    n: "04",
    title: "Reply and follow-up, ready for approval",
    copy: "Low offers leave the main list. Unpriced briefs stay visible and the draft names your minimum while asking for the budget. AI can rewrite it, and the follow-up is timed for you. Copy is the only way anything leaves the app.",
    points: ["Nothing is auto-sent", "Reminders stay on-device", "AI rewrites, you send"],
  },
];

const faqs = [
  {
    q: "Does it message brands for me?",
    a: "Only when you press Send, and only the reply you approved. There is no scheduling and no auto-reply — every send is one tap by you, inside the app.",
  },
  {
    q: "What does it actually extract?",
    a: "Brand, campaign, offer, deliverables, deadline, usage-rights days, exclusivity days, and payment terms — plus what is still missing. A brand name only comes from the message itself, never the email domain. A missing fee stays blank instead of being guessed.",
  },
  {
    q: "How is a brand DM recognised?",
    a: "Threads are scored for collaboration, campaign and fee language, deliverables, usage and deadlines — and newsletters are hard-excluded. Personal mail and digests never enter the deal list.",
  },
  {
    q: "What if the brand never states a fee?",
    a: "The deal stays in Brand deals, never hidden. The draft states your minimum and asks for the budget, and names any usage uplift on top — so the conversation keeps moving instead of stalling.",
  },
  {
    q: "How does the minimum-fee filter work?",
    a: "Set a floor in rupees. Priced deals under it move to Below your rate; unpriced deals always stay visible. Your Instagram audience can suggest a starting floor — 0 keeps everything in Brand deals.",
  },
  {
    q: "Which inboxes can I connect?",
    a: "Gmail and Instagram today. WhatsApp Business, Outlook, X and Messenger are ready to switch on — every inbox is optional, so connect only what you use.",
  },
];

export function HomePage({ email }: { email: string | null }) {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const bar = useSpring(scrollYProgress, { stiffness: 140, damping: 28, mass: 0.2 });

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#14110e] text-[#f6f1e8] antialiased">
      <div className="site-grain" aria-hidden="true" />
      <motion.div className="fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-[#ff5a36]" style={{ scaleX: reduce ? 0 : bar }} />
      <Backdrop />
      <Nav email={email} />
      <main className="relative z-10">
        <Hero reduce={Boolean(reduce)} />
        <Ticker />
        <WhatWeDo />
        <ThreadDemo reduce={Boolean(reduce)} />
        <RateLab />
        <Bento />
        <Inboxes />
        <Faq />
        <Close />
      </main>
      <footer className="relative z-10 border-t border-white/10 px-6 py-10 text-sm text-[#f6f1e8]/45">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-[#ff5a36] text-xs font-semibold text-[#14110e]">B</span>
            Brand Deal Inbox · you approve every send
          </span>
          <span className="flex gap-4">
            <Link href="/connect" className="hover:text-[#f6f1e8]">Inboxes</Link>
            <Link href="/deals" className="hover:text-[#f6f1e8]">Open the desk</Link>
          </span>
        </div>
      </footer>
    </div>
  );
}

/* ---------- chrome ---------- */

function Backdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.032)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.032)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(ellipse_70%_55%_at_50%_0%,black_25%,transparent_75%)]" />
      <div className="absolute -top-32 left-1/2 h-[30rem] w-[52rem] -translate-x-1/2 rounded-full bg-[#ff5a36]/14 blur-[120px]" />
      <div className="absolute right-[-8rem] top-[38rem] h-[24rem] w-[24rem] rounded-full bg-amber-400/8 blur-[110px]" />
    </div>
  );
}

function Nav({ email }: { email: string | null }) {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-[#14110e]/78 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#ff5a36] text-sm font-semibold text-[#14110e]">B</span>
          <span className="truncate font-serif text-base tracking-tight sm:text-lg">Brand Deal Inbox</span>
        </Link>
        <nav className="flex shrink-0 items-center gap-0.5 text-sm">
          <a href="#what" className="hidden rounded-lg px-3 py-2 text-[#f6f1e8]/60 hover:text-white lg:inline">What it does</a>
          <a href="#letter" className="hidden rounded-lg px-3 py-2 text-[#f6f1e8]/60 hover:text-white sm:inline">Live read</a>
          <a href="#rates" className="hidden rounded-lg px-3 py-2 text-[#f6f1e8]/60 hover:text-white md:inline">Rate engine</a>
          <Link href="/connect" className="rounded-lg px-3 py-2 text-[#f6f1e8]/80 hover:text-white">Inboxes</Link>
          {email ? (
            <>
              <span className="hidden max-w-40 truncate px-2 text-xs text-[#f6f1e8]/50 xl:inline">{email}</span>
              <a href="/auth/sign-out" className="rounded-lg px-3 py-2 text-[#f6f1e8]/70 hover:text-white">Sign out</a>
            </>
          ) : (
            <Link href="/login" className="rounded-lg px-3 py-2 text-[#f6f1e8]/80 hover:text-white">Sign in</Link>
          )}
          <Link href="/deals" className="ml-1 whitespace-nowrap rounded-full bg-[#f6f1e8] px-3.5 py-2 font-medium text-[#14110e] hover:bg-white">Open desk</Link>
        </nav>
      </div>
    </header>
  );
}

function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-70px" }}
      transition={{ duration: 0.65, delay, ease }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function Kicker({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#ff5a36]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#ff5a36]" />
      {children}
    </p>
  );
}

/* ---------- hero ---------- */

function Hero({ reduce }: { reduce: boolean }) {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-14 pt-32 text-center md:pt-40">
      <h1 className="mx-auto mt-7 max-w-4xl font-serif text-[2.9rem] leading-[0.95] tracking-tight sm:text-7xl md:text-[5.6rem]">
        <span className="block overflow-hidden pb-2">
          <motion.span className="block" initial={reduce ? false : { y: "108%" }} animate={{ y: "0%" }} transition={{ duration: 0.85, ease }}>
            Turn brand messages
          </motion.span>
        </span>
        <span className="block overflow-hidden pb-2">
          <motion.span className="block" initial={reduce ? false : { y: "108%" }} animate={{ y: "0%" }} transition={{ duration: 0.85, delay: 0.12, ease }}>
            into <span className="italic text-[#ff5a36]">paid</span> deals.
          </motion.span>
        </span>
      </h1>

      <motion.p
        initial={reduce ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6, ease }}
        className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[#f6f1e8]/65"
      >
        Connect Gmail and Instagram. Your desk finds every brand offer, shows the fee,
        the work, and the deadline on one card, tells you the fair price, and drafts
        your reply. Copy the approved draft — or press Send yourself.
      </motion.p>

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.42, duration: 0.6, ease }}
        className="mt-9 flex flex-wrap items-center justify-center gap-3"
      >
        <Link href="/connect" className="rounded-full bg-[#ff5a36] px-6 py-3.5 text-sm font-semibold text-[#14110e] shadow-[0_18px_60px_-18px_rgba(255,90,54,0.8)] transition hover:bg-[#ff7a5c]">
          Connect inboxes
        </Link>
        <Link href="/deals" className="rounded-full border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-medium transition hover:bg-white/10">
          Open the desk
        </Link>
      </motion.div>

      <motion.p
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.55, duration: 0.6 }}
        className="mt-5 text-[11px] uppercase tracking-[0.18em] text-[#f6f1e8]/35"
      >
        WhatsApp Business · Outlook · X · Messenger — coming soon
      </motion.p>

      <motion.dl
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.7 }}
        className="mx-auto mt-12 grid max-w-2xl grid-cols-3 divide-x divide-white/10 rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur"
      >
        {[
          ["₹1,05,000", "Right price"],
          ["+₹25,000", "Usage uplift"],
          ["2 days", "Follow-up"],
        ].map(([v, l]) => (
          <div key={l} className="min-w-0 px-2 py-5 sm:px-4">
            <dt className="whitespace-nowrap font-serif text-lg tracking-tight sm:text-2xl">{v}</dt>
            <dd className="mt-1 text-[10px] uppercase leading-4 tracking-[0.14em] text-[#f6f1e8]/45">{l}</dd>
          </div>
        ))}
      </motion.dl>

      <DeskMock reduce={reduce} />
    </section>
  );
}

const mockFilters = [
  { id: "deals", label: "Brand deals · 3" },
  { id: "messages", label: "Brand deal messages" },
  { id: "below", label: "Below your rate · 1" },
  { id: "followups", label: "Follow-ups · 2" },
] as const;

type MockFilter = (typeof mockFilters)[number]["id"];

type MockSeg = { text: string; hot?: boolean };

type MockThread = {
  tab: string;
  brand: string;
  person: string;
  handle: string;
  source: string;
  bubbles: MockSeg[][];
  rows: [string, string][];
  reply: string;
  filters: MockFilter[];
};

const mockThreads: Record<string, MockThread> = {
  samsung: {
    tab: "Samsung · ₹80,000",
    brand: "Samsung",
    person: "Ananya Shah",
    handle: "Samsung Partnerships · Galaxy AI",
    source: "Gmail thread",
    bubbles: [
      [{ text: "Scope is " }, { text: "2 Reels and 3 Stories", hot: true }, { text: ". Fee is " }, { text: "₹80,000", hot: true }, { text: ", 50% advance…" }],
      [{ text: "Usage for " }, { text: "90 days", hot: true }, { text: ", exclusivity 30 days. Live before " }, { text: "18 October", hot: true }, { text: "." }],
    ],
    rows: [["Offer", "₹80,000"], ["Usage", "90 days"], ["Uplift", "+₹25,000"], ["Counter", "₹1,05,000"]],
    reply: "For 90-day usage, my fee for 2 Reels + 3 Stories would be ₹1,05,000…",
    filters: ["deals", "messages", "followups"],
  },
  boat: {
    tab: "boAt · ₹1,20,000",
    brand: "boAt",
    person: "Meera Iyer",
    handle: "boAt · Winter Drop",
    source: "Instagram DM",
    bubbles: [
      [{ text: "Scope is " }, { text: "1 Reel + 2 Stories", hot: true }, { text: ". Fee is " }, { text: "₹1,20,000", hot: true }, { text: ", 50% advance…" }],
      [{ text: "Usage for " }, { text: "30 days", hot: true }, { text: ". Live before " }, { text: "2 November", hot: true }, { text: "." }],
    ],
    rows: [["Offer", "₹1,20,000"], ["Usage", "30 days"], ["Uplift", "Included"], ["Counter", "₹1,20,000"]],
    reply: "I can do 1 Reel + 2 Stories at ₹1,20,000. Tell me if you want to lock this…",
    filters: ["deals", "messages"],
  },
  nykaa: {
    tab: "Nykaa · fee missing",
    brand: "Nykaa",
    person: "Priya Nair",
    handle: "Nykaa · Festive Edit",
    source: "Gmail thread",
    bubbles: [
      [{ text: "Scope is " }, { text: "2 Reels", hot: true }, { text: ". Fee " }, { text: "not stated", hot: true }, { text: " — share your rates…" }],
      [{ text: "Usage for " }, { text: "60 days", hot: true }, { text: ". Live before " }, { text: "25 October", hot: true }, { text: "." }],
    ],
    rows: [["Offer", "Not stated"], ["Usage", "60 days"], ["Uplift", "+₹12,500"], ["Counter", "Asks budget"]],
    reply: "My fee for 2 Reels starts at my minimum. Could you share the budget…",
    filters: ["deals", "messages", "followups"],
  },
  brightline: {
    tab: "Brightline · ₹15,000",
    brand: "Brightline",
    person: "Karan Shah",
    handle: "Brightline · Winter Drop",
    source: "Instagram DM",
    bubbles: [
      [{ text: "Scope is " }, { text: "1 Reel", hot: true }, { text: ". Fee is " }, { text: "₹15,000", hot: true }, { text: "…" }],
      [{ text: "Usage for " }, { text: "30 days", hot: true }, { text: ". Posting this week." }],
    ],
    rows: [["Offer", "₹15,000"], ["Usage", "30 days"], ["Uplift", "—"], ["Counter", "Below minimum"]],
    reply: "Thanks — this sits under my minimum for a Reel…",
    filters: ["below"],
  },
};

function DeskMock({ reduce }: { reduce: boolean }) {
  const [mockFilter, setMockFilter] = useState<MockFilter>("deals");
  const [mockThread, setMockThread] = useState("samsung");
  const [copied, setCopied] = useState(false);
  const listed = Object.entries(mockThreads).filter(([, t]) => t.filters.includes(mockFilter));
  const active = mockThreads[mockThread] ?? listed[0]?.[1] ?? mockThreads.samsung;
  function pickThread(id: string) {
    setMockThread(id);
    setCopied(false);
  }
  function pickFilter(f: MockFilter) {
    setMockFilter(f);
    const first = Object.entries(mockThreads).find(([, t]) => t.filters.includes(f));
    if (first) {
      setMockThread(first[0]);
      setCopied(false);
    }
  }
  function copyReply() {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(active.reply).then(
        () => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1600);
        },
        () => undefined,
      );
    }
  }
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 60, rotateX: 10 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 1, delay: 0.5, ease }}
      className="relative mx-auto mt-14 max-w-5xl [perspective:1200px]"
    >
      <div className="pointer-events-none absolute -inset-8 rounded-[40px] bg-[#ff5a36]/10 blur-[80px]" aria-hidden="true" />
      <div className="relative overflow-hidden rounded-3xl border border-white/12 bg-[#1c1814]/95 text-left shadow-[0_60px_140px_-40px_rgba(0,0,0,0.9)]">
        <div className="flex items-center gap-1.5 border-b border-white/10 px-5 py-3.5">
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5a36]" />
          <span className="ml-3 text-xs text-[#f6f1e8]/40">brand-deal-inbox / deals</span>
          <span className="ml-auto hidden items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-[11px] text-[#f6f1e8]/60 sm:flex">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> Auto sync on
          </span>
        </div>
        <div className="grid md:grid-cols-[220px_minmax(0,1fr)_250px]">
          <div className="hidden border-r border-white/10 p-3 md:block">
            {mockFilters.map((f) => (
              <button key={f.id} type="button" onClick={() => pickFilter(f.id)} className={`mb-1.5 block w-full rounded-xl px-3 py-2 text-left text-xs transition ${mockFilter === f.id ? "bg-[#f6f1e8] font-semibold text-[#14110e]" : "text-[#f6f1e8]/55 hover:bg-white/5 hover:text-white"}`}>
                {f.label}
              </button>
            ))}
            <div className="mt-3 space-y-1.5 px-1">
              <AnimatePresence mode="popLayout">
                {listed.map(([id, t]) => (
                  <motion.button key={id} layout initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.25 }} type="button" onClick={() => pickThread(id)} className={`block w-full rounded-xl border px-3 py-2.5 text-left text-xs transition ${mockThread === id ? "border-[#ff5a36]/50 bg-[#ff5a36]/10 text-white" : "border-white/8 text-[#f6f1e8]/50 hover:border-white/20 hover:text-white"}`}>
                    {t.tab}
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          </div>
          <div className="border-r border-white/10 p-5 sm:p-6">
            <AnimatePresence mode="wait">
              <motion.div key={mockThread} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.28, ease }}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#ff5a36]">{active.source}</p>
                <p className="mt-2 font-serif text-2xl tracking-tight">{active.person}</p>
                <p className="text-xs text-[#f6f1e8]/45">{active.handle}</p>
                <div className="mt-4 space-y-2.5 text-[13px] leading-6">
                  {active.bubbles.map((bubble, i) => (
                    <div key={i} className="rounded-2xl rounded-tl-md bg-white/[0.07] p-3.5 text-[#f6f1e8]/85">
                      {bubble.map((seg, j) => seg.hot
                        ? <span key={j} className="rounded bg-[#ff5a36]/25 px-1 text-white">{seg.text}</span>
                        : <span key={j}>{seg.text}</span>)}
                    </div>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="bg-[#f6f1e8] p-5 text-[#14110e]">
            <AnimatePresence mode="wait">
              <motion.div key={mockThread} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.28, ease }}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#c2410c]">The deal</p>
                <p className="mt-1 font-serif text-2xl tracking-tight">{active.brand}</p>
                <div className="mt-3 space-y-2 text-xs">
                  {active.rows.map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between border-b border-[#14110e]/10 py-1.5">
                      <span className="text-[#14110e]/50">{k}</span>
                      <span className="font-semibold">{v}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 rounded-2xl bg-[#14110e] p-3.5 text-xs leading-5 text-[#f6f1e8]">
                  <span className="text-[#ff5a36]">Suggested reply —</span> {active.reply}
                  <span className="mt-2 flex justify-end">
                    <button type="button" onClick={copyReply} aria-label="Copy the suggested reply" className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-2.5 py-1 text-[11px] text-[#f6f1e8]/70 transition hover:border-[#ff5a36]/60 hover:text-white">
                      {copied ? <CheckIcon /> : <CopyIcon />}
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function CopyIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function Ticker() {
  const row = [...sources, ...sources];
  return (
    <div className="relative border-y border-white/10 bg-white/[0.02] py-4">
      <p className="mb-3 text-center text-[11px] uppercase tracking-[0.2em] text-[#f6f1e8]/35">Works where brand deals arrive</p>
      <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
        <div className="marquee-track flex w-max gap-10 px-6">
          {row.map((s, i) => (
            <span key={`${s.name}-${i}`} className="flex items-center gap-2.5 text-sm text-[#f6f1e8]/60">
              <span className={`h-1.5 w-1.5 rounded-full ${s.live ? "bg-[#ff5a36]" : "bg-white/25"}`} />
              {s.name}
              <span className="text-[#f6f1e8]/30">{s.state}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- what it does ---------- */

function WhatWeDo() {
  return (
    <section id="what" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-24">
      <Reveal>
        <Kicker>What this actually does</Kicker>
        <h2 className="mt-4 max-w-3xl font-serif text-4xl tracking-tight sm:text-6xl">
          Not a CRM. A reader that runs the deal.
        </h2>
        <p className="mt-5 max-w-2xl text-base leading-7 text-[#f6f1e8]/60">
          No contracts, invoices, or pipelines. Four jobs, done on every thread: find the real
          opportunities, pull the terms out, price the usage, and get the reply and follow-up ready for your approval.
        </p>
      </Reveal>
      <div className="mt-12 grid gap-4 md:grid-cols-2">
        {steps.map((s, i) => (
          <Reveal key={s.n} delay={i * 0.05}>
            <article className="group relative h-full overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-7 transition hover:border-[#ff5a36]/40">
              <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[#ff5a36]/0 blur-[60px] transition group-hover:bg-[#ff5a36]/15" />
              <p className="font-serif text-5xl text-white/12 transition group-hover:text-[#ff5a36]/30">{s.n}</p>
              <h3 className="mt-4 font-serif text-3xl tracking-tight">{s.title}</h3>
              <p className="mt-3 text-sm leading-7 text-[#f6f1e8]/60">{s.copy}</p>
              <ul className="mt-5 flex flex-wrap gap-2">
                {s.points.map((p) => (
                  <li key={p} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-[#f6f1e8]/70">{p}</li>
                ))}
              </ul>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ---------- live read demo ---------- */

function ThreadDemo({ reduce }: { reduce: boolean }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const t = window.setInterval(() => setIndex((c) => (c + 1) % beats.length), 2100);
    return () => window.clearInterval(t);
  }, [reduce]);
  const active: BeatId = beats[index].id;

  return (
    <section id="letter" className="mx-auto max-w-6xl scroll-mt-24 px-6 pb-8">
      <Reveal>
        <Kicker>Live read · Samsung / Galaxy AI</Kicker>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
          <h2 className="max-w-2xl font-serif text-4xl tracking-tight sm:text-6xl">One thread becomes the deal.</h2>
          <div className="flex gap-2">
            {beats.map((b, i) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show ${b.label}`}
                className={`h-1.5 rounded-full transition-all ${i === index ? "w-8 bg-[#ff5a36]" : "w-3 bg-white/15 hover:bg-white/30"}`}
              />
            ))}
          </div>
        </div>
      </Reveal>

      <div className="mt-10 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <Reveal className="h-full">
          <article className="flex h-full flex-col rounded-[28px] bg-[#f6f1e8] p-6 text-[#14110e] sm:p-9">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#14110e]/40">Gmail thread</p>
              <span className="flex items-center gap-1.5 rounded-full bg-[#14110e] px-3 py-1 text-[11px] font-medium text-[#f6f1e8]">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ff5a36]" /> Reading
              </span>
            </div>
            <h3 className="mt-4 font-serif text-4xl tracking-tight">Ananya Shah</h3>
            <p className="mt-1 text-sm text-[#14110e]/50">Samsung Partnerships · Galaxy AI · Oct</p>
            <div className="mt-6 space-y-4 text-[15px] leading-8 text-[#14110e]/85">
              <p>We would love you on the Galaxy AI launch. The scope is <Beat on={active === "work"}>2 Reels and 3 Stories</Beat>. The fee is <Beat on={active === "offer"}>₹80,000</Beat>, with 50% advance on signing.</p>
              <p>We need usage rights for <Beat on={active === "usage"}>90 days</Beat> across paid and organic, and category exclusivity for 30 days. The live date needs to be on or before <Beat on={active === "follow"}>18 October</Beat>.</p>
              <p className="border-l-2 border-[#ff5a36] pl-4 text-sm italic text-[#14110e]/60">They&apos;re asking for 90-day usage rights. Your normal rate should increase by ₹25,000. Suggested counter ₹1,05,000.</p>
            </div>
            <p className="mt-auto pt-6 text-xs text-[#14110e]/40">Brand name taken from the sign-off — never the email domain. Blank terms stay blank.</p>
          </article>
        </Reveal>
        <div className="flex flex-col gap-2.5">
          <AnimatePresence mode="popLayout">
            {beats.map((b) => {
              const on = b.id === active;
              return (
                <motion.button
                  key={b.id}
                  type="button"
                  onClick={() => setIndex(beats.findIndex((x) => x.id === b.id))}
                  animate={{ scale: on ? 1.02 : 1, opacity: on ? 1 : 0.72 }}
                  transition={{ duration: 0.3, ease }}
                  className={`rounded-2xl border p-4 text-left transition ${on ? "border-[#ff5a36]/60 bg-[#ff5a36]/12 shadow-[0_16px_50px_-20px_rgba(255,90,54,0.6)]" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"}`}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#ff5a36]">{b.label}</p>
                  <p className="mt-1 font-serif text-2xl tracking-tight">{b.value}</p>
                  <p className="mt-0.5 text-xs text-[#f6f1e8]/50">{b.hint}</p>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

function Beat({ on, children }: { on: boolean; children: ReactNode }) {
  return (
    <motion.span
      animate={{ backgroundColor: on ? "rgba(255,90,54,0.28)" : "rgba(255,90,54,0)" }}
      transition={{ duration: 0.3 }}
      className="rounded px-1 font-medium text-[#14110e]"
    >
      {children}
    </motion.span>
  );
}

/* ---------- rate lab ---------- */

function RateLab() {
  const [offer, setOffer] = useState(80000);
  const [usage, setUsage] = useState(90);
  const included = 30;
  const per = 12500;
  const calc = useMemo(() => {
    const extra = Math.max(0, usage - included);
    const blocks = extra === 0 ? 0 : Math.ceil(extra / 30);
    return { extra, blocks, amount: blocks * per, counter: offer + blocks * per };
  }, [offer, usage]);

  return (
    <section id="rates" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-24">
      <Reveal>
        <Kicker>The rate engine, try it</Kicker>
        <h2 className="mt-4 max-w-3xl font-serif text-4xl tracking-tight sm:text-6xl">Usage gets counted in front of you.</h2>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[#f6f1e8]/60">
          Drag the sliders. Same maths the desk runs on every thread — {included} days included,
          ₹{per.toLocaleString("en-IN")} per extra 30 days — with the working shown, not hidden.
        </p>
      </Reveal>
      <Reveal delay={0.08}>
        <div className="mt-10 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-7">
            <Slider label="Offer in the thread" value={offer} min={0} max={300000} step={5000} format={(v) => `₹${v.toLocaleString("en-IN")}`} onChange={setOffer} />
            <Slider label="Usage asked, days" value={usage} min={0} max={365} step={5} format={(v) => `${v} days`} onChange={setUsage} />
            <div className="mt-6 grid grid-cols-3 gap-3 text-center">
              {[
                [`${calc.extra} days`, "Extra beyond included"],
                [`${calc.blocks} × ₹${per.toLocaleString("en-IN")}`, "Blocks"],
                [`+₹${calc.amount.toLocaleString("en-IN")}`, "Uplift"],
              ].map(([v, l]) => (
                <div key={l} className="rounded-2xl bg-white/5 px-3 py-4">
                  <p className="font-serif text-lg sm:text-xl">{v}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-[#f6f1e8]/45">{l}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col justify-between rounded-3xl bg-[#f6f1e8] p-7 text-[#14110e]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#c2410c]">Suggested counter</p>
              <AnimatePresence mode="popLayout">
                <motion.p
                  key={calc.counter}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3, ease }}
                  className="mt-2 font-serif text-5xl tracking-tight"
                >
                  ₹{calc.counter.toLocaleString("en-IN")}
                </motion.p>
              </AnimatePresence>
              <p className="mt-3 text-sm leading-6 text-[#14110e]/60">
                {usage} asked − {included} included = {calc.extra} extra days = {calc.blocks} blocks.
                The Samsung default lands on ₹1,05,000.
              </p>
            </div>
            <Link href="/deals" className="mt-6 rounded-full bg-[#14110e] px-5 py-3 text-center text-sm font-semibold text-[#f6f1e8] hover:bg-black">
              See it on a real thread
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function Slider({ label, value, min, max, step, format, onChange }: { label: string; value: number; min: number; max: number; step: number; format: (v: number) => string; onChange: (v: number) => void }) {
  const fill = max === min ? 0 : ((value - min) / (max - min)) * 100;
  return (
    <label className="mb-6 block last:mb-0">
      <span className="flex items-baseline justify-between">
        <span className="text-sm text-[#f6f1e8]/60">{label}</span>
        <span className="font-serif text-2xl">{format(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="bd-range mt-3 w-full"
        style={{ ["--fill" as string]: `${fill}%` }}
      />
    </label>
  );
}

/* ---------- bento ---------- */

function Bento() {
  const cards = [
    {
      title: "Below your rate, automatically",
      copy: "Set a minimum in rupees. Anything priced under it leaves Brand deals for Below your rate. Your 20M-follower floor and a 20k-follower floor are finally different numbers — and your audience suggests the starting point.",
      tag: "Filtration",
      big: true,
    },
    {
      title: "Follow up in 2 days. Or 1.",
      copy: "The desk sets the wait from the last message — “tomorrow” means 1 day, everything else 2. Reminders live on this device.",
      tag: "Timing",
      big: false,
    },
    {
      title: "Unpriced briefs stay visible",
      copy: "No fee stated? The deal stays in Brand deals and the draft names your minimum while asking for the budget.",
      tag: "No silent drops",
      big: false,
    },
    {
      title: "AI rewrites. You approve.",
      copy: "One tap gets a fresh AI rewrite of your reply. Copy the approved draft — or press Send yourself.",
      tag: "Drafts",
      big: false,
    },
    {
      title: "Private by construction",
      copy: "Inbox tokens stay locked on our servers — never in your browser. Gmail sends only the reply you approve, Instagram is message-scoped, and message bodies are never logged.",
      tag: "Trust",
      big: false,
    },
  ];
  return (
    <section className="mx-auto max-w-6xl px-6 pb-8">
      <Reveal>
        <Kicker>Built for the next reply</Kicker>
        <h2 className="mt-4 max-w-2xl font-serif text-4xl tracking-tight sm:text-5xl">Everything around the reply, handled.</h2>
      </Reveal>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {cards.map((c, i) => (
          <Reveal key={c.title} delay={(i % 3) * 0.05} className={c.big ? "md:col-span-2" : ""}>
            <article className="h-full rounded-3xl border border-white/10 bg-white/[0.03] p-7 transition hover:border-[#ff5a36]/35 hover:bg-white/[0.05]">
              <p className="inline-block rounded-full bg-[#ff5a36]/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#ff5a36]">{c.tag}</p>
              <h3 className={`mt-4 font-serif tracking-tight ${c.big ? "text-3xl sm:text-4xl" : "text-2xl"}`}>{c.title}</h3>
              <p className="mt-3 max-w-xl text-sm leading-7 text-[#f6f1e8]/60">{c.copy}</p>
            </article>
          </Reveal>
        ))}
        <Reveal delay={0.1}>
          <Link href="/deals" className="flex h-full min-h-[220px] flex-col justify-between overflow-hidden rounded-3xl bg-[#ff5a36] p-7 text-[#14110e] transition hover:bg-[#ff7a5c]">
            <p className="font-serif text-3xl tracking-tight">Open the desk and read your first thread.</p>
            <span className="mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-[#14110e] px-4 py-2.5 text-sm font-semibold text-[#f6f1e8]">
              Go to Deals <span aria-hidden="true">→</span>
            </span>
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- inboxes / faq / close ---------- */

function Inboxes() {
  return (
    <section id="inboxes" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-24">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <Kicker>Inboxes</Kicker>
            <h2 className="mt-4 font-serif text-4xl tracking-tight sm:text-6xl">Where the deals land</h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-[#f6f1e8]/55">Gmail and Instagram today. WhatsApp Business, Outlook, X and Messenger are coming soon — every inbox in one desk.</p>
          </div>
          <Link href="/connect" className="rounded-full bg-[#f6f1e8] px-5 py-2.5 text-sm font-semibold text-[#14110e] hover:bg-white">Add yours</Link>
        </div>
      </Reveal>
      <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sources.map((s, i) => (
          <Reveal key={s.name} delay={i * 0.04}>
            <div className="h-full rounded-3xl border border-white/10 bg-white/[0.03] p-6 transition hover:-translate-y-1 hover:border-[#ff5a36]/40">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-serif text-2xl">{s.name}</h3>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${s.live ? "bg-[#ff5a36] text-[#14110e]" : "bg-white/10 text-[#f6f1e8]/60"}`}>{s.state}</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-[#f6f1e8]/50">{s.detail}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-24 px-6 pb-24">
      <Reveal>
        <Kicker>Questions</Kicker>
        <h2 className="mt-4 font-serif text-4xl tracking-tight sm:text-5xl">Asked before the first sync.</h2>
      </Reveal>
      <div className="mt-8 divide-y divide-white/10 border-y border-white/10">
        {faqs.map((f, i) => {
          const isOpen = open === i;
          return (
            <div key={f.q}>
              <button type="button" onClick={() => setOpen(isOpen ? -1 : i)} className="flex w-full items-center justify-between gap-4 py-5 text-left">
                <span className="font-medium">{f.q}</span>
                <motion.span animate={{ rotate: isOpen ? 45 : 0 }} className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/15 text-lg leading-none">
                  +
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {isOpen ? (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.35, ease }}
                    className="overflow-hidden"
                  >
                    <p className="pb-6 text-sm leading-7 text-[#f6f1e8]/60">{f.a}</p>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Close() {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-28">
      <Reveal>
        <div className="relative overflow-hidden rounded-[36px] border border-white/10 bg-[#1c1814] px-8 py-14 md:px-14 md:py-20">
          <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-[#ff5a36]/20 blur-[90px]" />
          <Kicker>The desk is ready</Kicker>
          <h2 className="mt-4 max-w-2xl font-serif text-5xl leading-[0.95] tracking-tight sm:text-7xl">
            Connect an inbox. <span className="italic text-[#ff5a36]">Keep</span> the reply.
          </h2>
          <p className="mt-5 max-w-xl text-base leading-7 text-[#f6f1e8]/60">
            After one inbox connects you land back on the list — add another, or skip straight to the desk. Your first read takes seconds.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/connect" className="rounded-full bg-[#ff5a36] px-6 py-3.5 text-sm font-semibold text-[#14110e] hover:bg-[#ff7a5c]">Connect inboxes</Link>
            <Link href="/deals" className="rounded-full border border-white/15 px-6 py-3.5 text-sm font-medium hover:bg-white/5">Open the desk</Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
