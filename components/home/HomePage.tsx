"use client";

import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as const;

const sources = [
  { name: "Gmail", detail: "Brand mail, read with the Gmail API.", state: "Connect now", live: true },
  { name: "Instagram", detail: "DMs on a professional account.", state: "Connect now", live: true },
  { name: "Outlook", detail: "Brand mail via Microsoft Graph.", state: "Official API", live: false },
  { name: "X", detail: "Direct messages via the X API.", state: "Official API", live: false },
  { name: "Messenger", detail: "Page inbox via the Messenger API.", state: "Official API", live: false },
  { name: "WhatsApp Business", detail: "Business inbox via the Cloud API.", state: "Official API", live: false },
];

const notes = [
  { title: "Offer", value: "₹80,000", copy: "Stated in the thread." },
  { title: "Usage", value: "90 days", copy: "30 days are already in your rate." },
  { title: "Uplift", value: "+₹25,000", copy: "Two extra blocks at ₹12,500." },
  { title: "Counter", value: "₹1,05,000", copy: "The fee plus the usage." },
  { title: "Follow up", value: "In 2 days", copy: "Unless they said tomorrow." },
];

export function HomePage() {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const bar = useSpring(scrollYProgress, { stiffness: 140, damping: 28, mass: 0.2 });

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#14110e] text-[#f6f1e8]">
      <motion.div className="fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-[#ff5a36]" style={{ scaleX: reduce ? 0 : bar }} />
      <Nav />
      <main>
        <Hero reduce={Boolean(reduce)} />
        <Manuscript reduce={Boolean(reduce)} />
        <Count />
        <Inboxes />
        <Close />
      </main>
      <footer className="border-t border-white/10 px-6 py-8 text-sm text-[#f6f1e8]/45">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <span>Brand Deal Inbox</span>
          <Link href="/deals" className="hover:text-[#f6f1e8]">Open the desk</Link>
        </div>
      </footer>
    </div>
  );
}

function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-[#14110e]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#ff5a36] text-sm font-semibold text-[#14110e]">B</span>
          <span className="truncate font-serif text-base tracking-tight sm:text-lg">Brand Deal Inbox</span>
        </Link>
        <nav className="flex shrink-0 items-center gap-1 text-sm">
          <a href="#letter" className="hidden rounded-lg px-3 py-2 text-[#f6f1e8]/60 hover:text-[#f6f1e8] sm:inline">The letter</a>
          <Link href="/connect" className="rounded-lg px-3 py-2 text-[#f6f1e8]/80 hover:text-[#f6f1e8]">Inboxes</Link>
          <Link href="/deals" className="whitespace-nowrap rounded-full bg-[#f6f1e8] px-3 py-2 font-medium text-[#14110e] hover:bg-white">Open desk</Link>
        </nav>
      </div>
    </header>
  );
}

function Line({ children, delay }: { children: ReactNode; delay: number }) {
  const reduce = useReducedMotion();
  return (
    <span className="block overflow-hidden">
      <motion.span
        className="block"
        initial={reduce ? false : { y: "110%" }}
        animate={{ y: "0%" }}
        transition={{ duration: 0.9, delay, ease }}
      >
        {children}
      </motion.span>
    </span>
  );
}

function Hero({ reduce }: { reduce: boolean }) {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-10 pt-28 md:pt-32">
      <motion.p
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="text-xs font-semibold uppercase tracking-[0.22em] text-[#ff5a36]"
      >
        A desk for brand mail
      </motion.p>
      <h1 className="mt-5 max-w-4xl font-serif text-5xl leading-[0.9] tracking-tight sm:text-7xl md:text-8xl">
        <Line delay={0.05}>Your brand deals,</Line>
        <Line delay={0.16}>
          <span className="italic text-[#ff5a36]">read</span> before you reply.
        </Line>
      </h1>
      <motion.div
        className="mt-6 h-px origin-left bg-[#ff5a36]"
        initial={reduce ? false : { scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.1, delay: 0.45, ease }}
      />
      <div className="mt-8 flex flex-col justify-between gap-8 md:flex-row md:items-end">
        <motion.p
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6, ease }}
          className="max-w-md text-lg leading-8 text-[#f6f1e8]/65"
        >
          Connect the inboxes where brands already write. The desk lifts the fee, the usage, and the deadline out of the thread. You still send the reply.
        </motion.p>
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.6, ease }}
          className="flex flex-wrap gap-3"
        >
          <Link href="/connect" className="rounded-full bg-[#ff5a36] px-5 py-3 text-sm font-semibold text-[#14110e] hover:bg-[#ff7a5c]">Connect inboxes</Link>
          <Link href="/deals" className="rounded-full border border-white/15 px-5 py-3 text-sm font-medium hover:bg-white/5">Go to the desk</Link>
        </motion.div>
      </div>
    </section>
  );
}

function Manuscript({ reduce }: { reduce: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const [caption, setCaption] = useState("The letter");
  useMotionValueEvent(scrollYProgress, "change", (value) => {
    if (value < 0.16) setCaption("The letter");
    else if (value < 0.34) setCaption("The fee");
    else if (value < 0.52) setCaption("The usage");
    else if (value < 0.7) setCaption("The uplift");
    else setCaption("The reply");
  });

  const fades = [
    useTransform(scrollYProgress, [0, 1], [1, 1]),
    useTransform(scrollYProgress, [0.16, 0.3], [0, 1]),
    useTransform(scrollYProgress, [0.34, 0.48], [0, 1]),
    useTransform(scrollYProgress, [0.52, 0.66], [0, 1]),
    useTransform(scrollYProgress, [0.7, 0.86], [0, 1]),
  ];
  const shifts = [
    useTransform(scrollYProgress, [0, 1], [0, 0]),
    useTransform(scrollYProgress, [0.16, 0.3], [28, 0]),
    useTransform(scrollYProgress, [0.34, 0.48], [28, 0]),
    useTransform(scrollYProgress, [0.52, 0.66], [28, 0]),
    useTransform(scrollYProgress, [0.7, 0.86], [28, 0]),
  ];

  return (
    <section id="letter" ref={ref} className={`relative ${reduce ? "h-auto" : "h-[230vh]"}`}>
      <div className={`${reduce ? "relative h-auto" : "sticky top-16 h-[calc(100svh-4rem)]"} mx-auto flex max-w-6xl flex-col px-6 py-6`}>
        <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-[#f6f1e8]/45">
          <span>Samsung · Galaxy AI</span>
          <motion.span key={caption} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-[#ff5a36]">
            {reduce ? "The letter, read" : caption}
          </motion.span>
        </div>
        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
          <article className="min-h-0 overflow-y-auto rounded-[28px] bg-[#f6f1e8] p-6 text-[#14110e] shadow-[0_30px_80px_-40px_rgba(255,90,54,0.45)] md:p-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#14110e]/40">Gmail thread</p>
            <h2 className="mt-3 font-serif text-4xl tracking-tight">Ananya Shah</h2>
            <p className="mt-1 text-sm text-[#14110e]/50">Samsung Partnerships</p>
            <div className="mt-6 space-y-4 font-serif text-lg leading-8 md:text-xl">
              <p>We would love you on the Galaxy AI launch.</p>
              <p>The scope is 2 Reels and 3 Stories. The fee is ₹80,000, with 50% advance.</p>
              <p>We need usage rights for 90 days, and category exclusivity for 30 days.</p>
              <p>The live date needs to be on or before 18 October.</p>
            </div>
          </article>
          <aside className="flex min-h-0 flex-col justify-end gap-2 overflow-y-auto">
            {notes.map((note, index) => (
              <motion.div
                key={note.title}
                style={reduce ? undefined : { opacity: fades[index], y: shifts[index] }}
                className="rounded-2xl border border-white/10 bg-[#1c1814] px-4 py-3"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#ff5a36]">{note.title}</p>
                <p className="mt-1 font-serif text-2xl tracking-tight">{note.value}</p>
                <p className="text-xs text-[#f6f1e8]/50">{note.copy}</p>
              </motion.div>
            ))}
          </aside>
        </div>
      </div>
    </section>
  );
}

function Count() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 80%", "end 40%"] });
  const grow = useSpring(scrollYProgress, { stiffness: 70, damping: 20 });
  const steps = [
    ["01", "Choose the inboxes", "Gmail and Instagram connect today. Outlook, X, Messenger, and WhatsApp Business are the other official inboxes."],
    ["02", "The desk counts the deal", "90 days asked, 30 included. That is two extra blocks. 2 × ₹12,500 is ₹25,000, so the suggested counter is ₹1,05,000."],
    ["03", "You approve the reply", "A missing fee stays in the list and the draft asks for the budget. Grok can rewrite it. Nothing is sent for you."],
  ];
  return (
    <section ref={ref} className="border-y border-white/10">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-24 md:grid-cols-[72px_minmax(0,1fr)]">
        <div className="relative hidden md:block">
          <div className="absolute bottom-0 left-3 top-0 w-px bg-white/10" />
          <motion.div className="absolute bottom-0 left-3 top-0 w-px origin-top bg-[#ff5a36]" style={{ scaleY: grow }} />
        </div>
        <div className="space-y-16">
          {steps.map(([step, title, copy], index) => (
            <motion.article
              key={step}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, delay: index * 0.05, ease }}
            >
              <p className="font-serif text-5xl text-white/15">{step}</p>
              <h2 className="mt-3 font-serif text-4xl tracking-tight">{title}</h2>
              <p className="mt-3 max-w-xl text-base leading-7 text-[#f6f1e8]/60">{copy}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Inboxes() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h2 className="font-serif text-4xl tracking-tight md:text-6xl">Where the deals arrive</h2>
          <p className="mt-3 max-w-xl text-sm leading-7 text-[#f6f1e8]/55">Only inboxes with an official API. Personal apps with no inbox API are not listed.</p>
        </div>
        <Link href="/connect" className="rounded-full bg-[#f6f1e8] px-4 py-2.5 text-sm font-semibold text-[#14110e]">Add yours</Link>
      </div>
      <div className="mt-10 divide-y divide-white/10 border-y border-white/10">
        {sources.map((source, index) => (
          <motion.div
            key={source.name}
            initial={{ opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.45, delay: index * 0.04, ease }}
            whileHover={{ x: 8 }}
            className="flex items-center justify-between gap-4 py-5"
          >
            <div>
              <h3 className="font-serif text-2xl">{source.name}</h3>
              <p className="mt-1 text-sm text-[#f6f1e8]/50">{source.detail}</p>
            </div>
            <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold ${source.live ? "bg-[#ff5a36] text-[#14110e]" : "border border-white/15 text-[#f6f1e8]/70"}`}>
              {source.state}
            </span>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function Close() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 90%", "start 40%"] });
  const y = useTransform(scrollYProgress, [0, 1], [40, 0]);
  const opacity = useTransform(scrollYProgress, [0, 1], [0.2, 1]);
  return (
    <section ref={ref} className="mx-auto max-w-6xl px-6 pb-24">
      <motion.div style={{ y, opacity }}>
        <h2 className="max-w-3xl font-serif text-5xl leading-[0.92] tracking-tight md:text-7xl">
          Connect an inbox. <span className="italic text-[#ff5a36]">Keep</span> the reply.
        </h2>
        <p className="mt-5 max-w-lg text-base leading-7 text-[#f6f1e8]/60">After one inbox connects, you land back on the list and can add another, or skip straight to the desk.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/connect" className="rounded-full bg-[#ff5a36] px-5 py-3 text-sm font-semibold text-[#14110e]">Connect inboxes</Link>
          <Link href="/deals" className="rounded-full border border-white/15 px-5 py-3 text-sm font-medium">Open the desk</Link>
        </div>
      </motion.div>
    </section>
  );
}
