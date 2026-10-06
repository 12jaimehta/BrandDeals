"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import {
  AnimatePresence,
  LayoutGroup,
  animate,
  motion,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as const;

const sources = [
  { name: "Gmail", detail: "Brand email.", state: "Live", live: true },
  { name: "Instagram", detail: "DMs on a professional account.", state: "Live", live: true },
  { name: "WhatsApp Business", detail: "Your business inbox.", state: "", live: false },
  { name: "Outlook", detail: "Brand mail on Outlook and Hotmail.", state: "", live: false },
  { name: "X", detail: "Direct messages.", state: "Live", live: true },
  { name: "Messenger", detail: "Your Page inbox.", state: "Live", live: true },
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
    a: "Gmail, Instagram, WhatsApp Business, Outlook, X, and Messenger. Connect any one of them. None of the others are required.",
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
      <SiteHeader email={email} active="home" />
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
      <SiteFooter />
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

function rupees(value: number) {
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

function CountUp({ from, to, prefix = "", reduce }: { from: number; to: number; prefix?: string; reduce: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const value = useMotionValue(reduce ? to : from);
  const text = useTransform(value, (v) => `${prefix}${rupees(v)}`);
  useEffect(() => {
    if (!inView || reduce) return;
    const controls = animate(value, to, { duration: 1.4, delay: 0.7, ease });
    return () => controls.stop();
  }, [inView, reduce, to, value]);
  return <motion.span ref={ref}>{text}</motion.span>;
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
Your AI agent for brand deals. It reads every offer, benchmarks the price, flags hidden terms, and prepares your best response.
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
        Gmail · Instagram · WhatsApp · Outlook · X · Messenger
      </motion.p>

      <motion.dl
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.7 }}
        className="mx-auto mt-12 grid max-w-2xl grid-cols-3 divide-x divide-white/10 rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur"
      >
        <div className="min-w-0 px-2 py-5 sm:px-4">
          <dt className="whitespace-nowrap font-serif text-lg tracking-tight sm:text-2xl"><CountUp from={80000} to={105000} reduce={reduce} /></dt>
          <dd className="mt-1 text-[10px] uppercase leading-4 tracking-[0.14em] text-[#f6f1e8]/45">From ₹80,000 offer</dd>
        </div>
        <div className="min-w-0 px-2 py-5 sm:px-4">
          <dt className="whitespace-nowrap font-serif text-lg tracking-tight text-[#ff5a36] sm:text-2xl"><CountUp from={0} to={25000} prefix="+" reduce={reduce} /></dt>
          <dd className="mt-1 text-[10px] uppercase leading-4 tracking-[0.14em] text-[#f6f1e8]/45">Usage uplift</dd>
        </div>
        <div className="min-w-0 px-2 py-5 sm:px-4">
          <dt className="whitespace-nowrap font-serif text-lg tracking-tight sm:text-2xl">2 days</dt>
          <dd className="mt-1 text-[10px] uppercase leading-4 tracking-[0.14em] text-[#f6f1e8]/45">Follow-up</dd>
        </div>
      </motion.dl>

      <DeskMock reduce={reduce} />
    </section>
  );
}

const mockFilters = [
  { id: "deals", label: "Brand deals · 3" },
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
    filters: ["deals", "followups"],
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
    filters: ["deals"],
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
    filters: ["deals", "followups"],
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
  const frame = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: frame, offset: ["start end", "center center"] });
  const tilt = useTransform(scrollYProgress, [0, 1], [12, 0]);
  const settle = useTransform(scrollYProgress, [0, 1], [0.94, 1]);
  return (
    <motion.div
      ref={frame}
      initial={reduce ? false : { opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay: 0.5, ease }}
      style={reduce ? undefined : { rotateX: tilt, scale: settle, transformPerspective: 1200 }}
      className="relative mx-auto mt-14 max-w-5xl"
    >
      <div className="pointer-events-none absolute -inset-8 rounded-[40px] bg-[#ff5a36]/10 blur-[80px]" aria-hidden="true" />
      <div className="relative overflow-hidden rounded-3xl border border-white/12 bg-[#1c1814]/95 text-left shadow-[0_60px_140px_-40px_rgba(0,0,0,0.9)]">
        <div className="flex items-center gap-1.5 border-b border-white/10 px-5 py-3.5">
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5a36]" />
          <span className="ml-3 text-xs text-[#f6f1e8]/40">Inbox </span>
          <span className="ml-auto hidden items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-[11px] text-[#f6f1e8]/60 sm:flex">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> Auto sync on
          </span>
        </div>
        <div className="grid md:grid-cols-[220px_minmax(0,1fr)_250px]">
          <div className="hidden border-r border-white/10 p-3 md:block">
            {mockFilters.map((f) => {
              const on = mockFilter === f.id;
              return (
                <button key={f.id} type="button" onClick={() => pickFilter(f.id)} className={`relative mb-1.5 block w-full rounded-xl px-3 py-2 text-left text-xs transition-colors ${on ? "font-semibold text-[#14110e]" : "text-[#f6f1e8]/55 hover:text-white"}`}>
                  {on ? <motion.span layoutId="mock-filter" className="absolute inset-0 rounded-xl bg-[#f6f1e8]" transition={{ type: "spring", stiffness: 420, damping: 34 }} /> : null}
                  <span className="relative">{f.label}</span>
                </button>
              );
            })}
            <div className="mt-3 space-y-1.5 px-1">
              <AnimatePresence mode="popLayout">
                {listed.map(([id, t]) => {
                  const on = mockThread === id;
                  return (
                    <motion.button key={id} layout initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.25 }} type="button" onClick={() => pickThread(id)} className={`relative block w-full rounded-xl border px-3 py-2.5 text-left text-xs transition-colors ${on ? "border-[#ff5a36]/50 text-white" : "border-white/8 text-[#f6f1e8]/50 hover:border-white/20 hover:text-white"}`}>
                      {on ? <motion.span layoutId="mock-thread" className="absolute inset-0 rounded-xl bg-[#ff5a36]/12" transition={{ type: "spring", stiffness: 420, damping: 34 }} /> : null}
                      <span className="relative">{t.tab}</span>
                    </motion.button>
                  );
                })}
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
                        ? (
                          <motion.span
                            key={j}
                            initial={reduce ? false : { backgroundColor: "rgba(255,90,54,0)" }}
                            animate={{ backgroundColor: "rgba(255,90,54,0.25)" }}
                            transition={{ duration: 0.4, delay: 0.25 + i * 0.25 + j * 0.06 }}
                            className="rounded px-1 text-white"
                          >
                            {seg.text}
                          </motion.span>
                        )
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
                <motion.div
                  className="mt-3 space-y-2 text-xs"
                  initial={reduce ? false : "hidden"}
                  animate="shown"
                  variants={{ hidden: {}, shown: { transition: { staggerChildren: 0.12, delayChildren: 0.55 } } }}
                >
                  {active.rows.map(([k, v]) => (
                    <motion.div
                      key={k}
                      variants={{ hidden: { opacity: 0, x: 10 }, shown: { opacity: 1, x: 0, transition: { duration: 0.3, ease } } }}
                      className="flex items-center justify-between border-b border-[#14110e]/10 py-1.5"
                    >
                      <span className="text-[#14110e]/50">{k}</span>
                      <span className={`font-semibold ${k === "Counter" ? "text-[#c2410c]" : ""}`}>{v}</span>
                    </motion.div>
                  ))}
                </motion.div>
                <motion.div
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.55 + active.rows.length * 0.12, ease }}
                  className="mt-3 rounded-2xl bg-[#14110e] p-3.5 text-xs leading-5 text-[#f6f1e8]"
                >
                  <span className="text-[#ff5a36]">Suggested reply —</span> {active.reply}
                  <span className="mt-2 flex justify-end">
                    <button type="button" onClick={copyReply} aria-label="Copy the suggested reply" className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-2.5 py-1 text-[11px] text-[#f6f1e8]/70 transition hover:border-[#ff5a36]/60 hover:text-white">
                      {copied ? <CheckIcon /> : <CopyIcon />}
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </span>
                </motion.div>
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

export function WhatWeDo() {
  const reduce = useReducedMotion();
  const grid = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: grid, offset: ["start 0.85", "end 0.55"] });
  const fill = useSpring(scrollYProgress, { stiffness: 120, damping: 26 });
  const [reached, setReached] = useState(reduce ? steps.length : 0);
  useMotionValueEvent(scrollYProgress, "change", (p) => {
    if (reduce) return;
    setReached(Math.min(steps.length, Math.floor(p * steps.length + 0.35)));
  });
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
      <div className="mt-12 h-px w-full overflow-hidden bg-white/10" aria-hidden="true">
        <motion.div className="h-full origin-left bg-[#ff5a36]" style={{ scaleX: reduce ? 1 : fill }} />
      </div>
      <div ref={grid} className="mt-6 grid gap-4 md:grid-cols-2">
        {steps.map((s, i) => {
          const lit = i < reached;
          return (
          <Reveal key={s.n} delay={i * 0.05}>
            <article className={`group relative h-full overflow-hidden rounded-3xl border bg-white/[0.03] p-7 transition-colors duration-500 hover:border-[#ff5a36]/40 ${lit ? "border-[#ff5a36]/30" : "border-white/10"}`}>
              <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[#ff5a36]/0 blur-[60px] transition group-hover:bg-[#ff5a36]/15" />
              <p className={`font-serif text-5xl transition-colors duration-500 ${lit ? "text-[#ff5a36]/70" : "text-white/12"}`}>{s.n}</p>
              <h3 className="mt-4 font-serif text-3xl tracking-tight">{s.title}</h3>
              <p className="mt-3 text-sm leading-7 text-[#f6f1e8]/60">{s.copy}</p>
              <ul className="mt-5 flex flex-wrap gap-2">
                {s.points.map((p) => (
                  <li key={p} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-[#f6f1e8]/70">{p}</li>
                ))}
              </ul>
            </article>
          </Reveal>
          );
        })}
      </div>
    </section>
  );
}

/* ---------- live read demo ---------- */

export function ThreadDemo({ reduce }: { reduce: boolean }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const section = useRef<HTMLElement>(null);
  const visible = useInView(section, { margin: "-20%" });
  const running = !reduce && !paused && visible;
  useEffect(() => {
    if (!running) return;
    const t = window.setTimeout(() => setIndex((c) => (c + 1) % beats.length), 2600);
    return () => window.clearTimeout(t);
  }, [running, index]);
  const active: BeatId = beats[index].id;
  const priced = active === "uplift" || active === "counter";

  return (
    <section ref={section} id="letter" className="mx-auto max-w-6xl scroll-mt-24 px-6 pb-8">
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
              <motion.p
                animate={{ backgroundColor: priced ? "rgba(255,90,54,0.12)" : "rgba(255,90,54,0)", color: priced ? "rgba(20,17,14,0.9)" : "rgba(20,17,14,0.6)" }}
                transition={{ duration: 0.35 }}
                className="rounded-r-lg border-l-2 border-[#ff5a36] py-1 pl-4 text-sm italic"
              >
                They&apos;re asking for 90-day usage rights. Your normal rate should increase by <span className={active === "uplift" ? "font-semibold not-italic" : ""}>₹25,000</span>. Suggested counter <span className={active === "counter" ? "font-semibold not-italic" : ""}>₹1,05,000</span>.
              </motion.p>
            </div>
            <p className="mt-auto pt-6 text-xs text-[#14110e]/40">Brand name taken from the sign-off — never the email domain. Blank terms stay blank.</p>
          </article>
        </Reveal>
        <div className="flex flex-col gap-2.5" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
          {beats.map((b, i) => {
            const on = b.id === active;
            return (
              <motion.button
                key={b.id}
                type="button"
                onClick={() => setIndex(i)}
                onFocus={() => setPaused(true)}
                onBlur={() => setPaused(false)}
                animate={{ opacity: on ? 1 : 0.6 }}
                transition={{ duration: 0.3, ease }}
                className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition-colors hover:bg-white/[0.06]"
              >
                {on ? (
                  <motion.span
                    layoutId="beat-focus"
                    className="absolute inset-0 rounded-2xl border border-[#ff5a36]/60 bg-[#ff5a36]/12"
                    transition={{ type: "spring", stiffness: 380, damping: 34 }}
                  />
                ) : null}
                <span className="relative block">
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#ff5a36]">{b.label}</span>
                  <span className="mt-1 block font-serif text-2xl tracking-tight">{b.value}</span>
                  <span className="mt-0.5 block text-xs text-[#f6f1e8]/50">{b.hint}</span>
                </span>
                {on && running ? (
                  <motion.span
                    key={index}
                    className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-[#ff5a36]"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 2.6, ease: "linear" }}
                  />
                ) : null}
              </motion.button>
            );
          })}
          <p className="px-1 text-xs text-[#f6f1e8]/35">{paused ? "Paused. Tap a term to see where it came from." : "Hover to pause."}</p>
        </div>
      </div>
    </section>
  );
}

function Beat({ on, children }: { on: boolean; children: ReactNode }) {
  return (
    <span className="relative inline-block rounded px-1 font-medium text-[#14110e]">
      <motion.span
        aria-hidden="true"
        className="absolute inset-0 origin-left rounded bg-[#ff5a36]/28"
        initial={false}
        animate={{ scaleX: on ? 1 : 0 }}
        transition={{ duration: 0.45, ease }}
      />
      <span className="relative">{children}</span>
    </span>
  );
}

/* ---------- rate lab ---------- */

export function RateLab() {
  const [offer, setOffer] = useState(80000);
  const [usage, setUsage] = useState(90);
  const included = 30;
  const per = 12500;
  const calc = useMemo(() => {
    const extra = Math.max(0, usage - included);
    const blocks = extra === 0 ? 0 : Math.ceil(extra / 30);
    return { extra, blocks, amount: blocks * per, counter: offer + blocks * per };
  }, [offer, usage]);
  const reduce = useReducedMotion();
  const counterValue = useSpring(calc.counter, { stiffness: 160, damping: 24 });
  const counterText = useTransform(counterValue, rupees);
  useEffect(() => {
    if (reduce) counterValue.jump(calc.counter);
    else counterValue.set(calc.counter);
  }, [calc.counter, counterValue, reduce]);
  const offerShare = calc.counter === 0 ? 100 : (offer / calc.counter) * 100;
  const pips = Math.min(calc.blocks, 12);

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
            <div className="mt-6">
              <p className="text-xs text-[#f6f1e8]/45">Each block is 30 extra days at ₹{per.toLocaleString("en-IN")}.</p>
              <div className="mt-2 flex min-h-6 flex-wrap items-center gap-1.5">
                <span className="rounded-md bg-white/10 px-2 py-1 text-[11px] text-[#f6f1e8]/60">{included} days included</span>
                <AnimatePresence initial={false}>
                  {Array.from({ length: pips }, (_, i) => (
                    <motion.span
                      key={i}
                      layout
                      initial={{ opacity: 0, scale: 0.6 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.6 }}
                      transition={{ duration: 0.2 }}
                      className="rounded-md bg-[#ff5a36]/80 px-2 py-1 text-[11px] font-semibold text-[#14110e]"
                    >
                      +30
                    </motion.span>
                  ))}
                </AnimatePresence>
                {calc.blocks > pips ? <span className="text-[11px] text-[#f6f1e8]/50">+{calc.blocks - pips} more</span> : null}
              </div>
            </div>
          </div>
          <div className="flex flex-col justify-between rounded-3xl bg-[#f6f1e8] p-7 text-[#14110e]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#c2410c]">Suggested counter</p>
              <motion.p className="mt-2 font-serif text-5xl tabular-nums tracking-tight">{counterText}</motion.p>
              <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-[#14110e]/10" aria-hidden="true">
                <motion.div className="h-full bg-[#14110e]" animate={{ width: `${offerShare}%` }} transition={{ type: "spring", stiffness: 160, damping: 24 }} />
                <motion.div className="h-full bg-[#ff5a36]" animate={{ width: `${100 - offerShare}%` }} transition={{ type: "spring", stiffness: 160, damping: 24 }} />
              </div>
              <div className="mt-2 flex justify-between text-[11px] text-[#14110e]/55">
                <span>Their offer</span>
                <span className="text-[#c2410c]">Usage uplift</span>
              </div>
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

const demoDeals = [
  { brand: "boAt", fee: 120000 },
  { brand: "Samsung", fee: 80000 },
  { brand: "Brightline", fee: 15000 },
  { brand: "Nykaa", fee: null },
] as const;

function MinimumDemo() {
  const [minimum, setMinimum] = useState(50000);
  const above = demoDeals.filter((d) => d.fee == null || d.fee >= minimum);
  const below = demoDeals.filter((d) => d.fee != null && d.fee < minimum);
  const column = (label: string, items: readonly (typeof demoDeals)[number][], dim: boolean) => (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <p className="text-[11px] uppercase tracking-[0.12em] text-[#f6f1e8]/45">{label} · {items.length}</p>
      <div className="mt-2 flex min-h-[76px] flex-col gap-1.5">
        {items.map((d) => (
          <motion.div
            key={d.brand}
            layoutId={`demo-${d.brand}`}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className={`flex items-center justify-between rounded-xl px-3 py-1.5 text-xs ${dim ? "bg-white/5 text-[#f6f1e8]/45" : "bg-white/10 text-[#f6f1e8]"}`}
          >
            <span>{d.brand}</span>
            <span className={d.fee == null ? "text-[#ff5a36]" : ""}>{d.fee == null ? "No fee yet" : rupees(d.fee)}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
  return (
    <div className="mt-6">
      <label className="flex items-center justify-between text-xs text-[#f6f1e8]/60">
        <span>Your minimum</span>
        <span className="font-semibold text-[#f6f1e8]">{rupees(minimum)}</span>
      </label>
      <input type="range" min={10000} max={150000} step={5000} value={minimum} onChange={(e) => setMinimum(Number(e.target.value))} className="mt-2 w-full accent-[#ff5a36]" aria-label="Minimum fee" />
      <LayoutGroup>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {column("Brand deals", above, false)}
          {column("Below your rate", below, true)}
        </div>
      </LayoutGroup>
    </div>
  );
}

function FollowUpDemo() {
  const [tomorrow, setTomorrow] = useState(false);
  const days = tomorrow ? 1 : 2;
  return (
    <div className="mt-5">
      <button type="button" onClick={() => setTomorrow((t) => !t)} className="w-full rounded-2xl border border-white/10 bg-black/20 p-3 text-left text-xs text-[#f6f1e8]/70 transition-colors hover:border-[#ff5a36]/40">
        <span className="text-[#f6f1e8]/40">Last message: </span>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={String(tomorrow)} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }} className="inline-block">
            {tomorrow ? "“We'll confirm tomorrow.”" : "“Let us check internally.”"}
          </motion.span>
        </AnimatePresence>
        <span className="mt-1 block text-[11px] text-[#ff5a36]">Tap to change it</span>
      </button>
      <div className="mt-3 flex items-center gap-2">
        {[1, 2].map((d) => (
          <span key={d} className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
            <motion.span className="absolute inset-0 origin-left bg-[#ff5a36]" initial={false} animate={{ scaleX: d <= days ? 1 : 0 }} transition={{ duration: 0.35, ease }} />
          </span>
        ))}
        <span className="w-24 text-right text-xs font-semibold">Follow up in {days} {days === 1 ? "day" : "days"}</span>
      </div>
    </div>
  );
}

function Bento() {
  const cards: { title: string; copy: string; tag: string; big: boolean; demo?: ReactNode }[] = [
    {
      title: "Below your rate, automatically",
      copy: "Set a minimum in rupees. Anything priced under it leaves Brand deals for Below your rate. Your 20M-follower floor and a 20k-follower floor are finally different numbers — and your audience suggests the starting point.",
      tag: "Filtration",
      big: true,
      demo: <MinimumDemo />,
    },
    {
      title: "Follow up in 2 days. Or 1.",
      copy: "The desk sets the wait from the last message — “tomorrow” means 1 day, everything else 2. Reminders live on this device.",
      tag: "Timing",
      big: false,
      demo: <FollowUpDemo />,
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
              {c.demo}
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
            <p className="mt-3 max-w-xl text-sm leading-7 text-[#f6f1e8]/55">Connect any of the six. The desk reads the ones you add.</p>
          </div>
          <Link href="/connect" className="rounded-full bg-[#f6f1e8] px-5 py-2.5 text-sm font-semibold text-[#14110e] hover:bg-white">Connect inboxes</Link>
        </div>
      </Reveal>
      <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sources.map((s, i) => (
          <Reveal key={s.name} delay={i * 0.04}>
            <div className="h-full rounded-3xl border border-white/10 bg-white/[0.03] p-6 transition hover:-translate-y-1 hover:border-[#ff5a36]/40">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-serif text-2xl">{s.name}</h3>
                {/* <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${s.live ? "bg-[#ff5a36] text-[#14110e]" : "bg-white/10 text-[#f6f1e8]/60"}`}>{s.state}</span> */}
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
