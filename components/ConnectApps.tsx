"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as const;

const notices: Record<string, string> = {
  error: "Google sign-in did not finish. Please try again.",
  unconfigured: "Sign-in isn't set up yet. Please come back in a bit.",
  "signed-in": "Gmail is connected. Add another inbox, or continue to the desk.",
  "needs-sql": "Your account needs a quick setup on our side — please try again in a moment.",
  "no-gmail-token": "Google signed you in, but didn't grant inbox access. Connect Gmail again.",
  "no-secret": "We couldn't save the connection. Please try again.",
  "save-failed": "Saving the connection failed. Please try again.",
  instagram: "Instagram is connected. Add another inbox, or continue to the desk.",
  "instagram-unconfigured": "Instagram isn't set up yet. Please come back in a bit.",
  "instagram-denied": "Instagram sign-in was cancelled.",
  "instagram-mismatch": "Instagram sign-in expired. Connect it again.",
  "instagram-failed": "Instagram didn't finish connecting. Use a professional account and allow message access.",
  "needs-instagram-sql": "Your account needs a quick setup on our side — please try again in a moment.",
  "sign-in-first": "Connect Gmail first. That creates your account, then Instagram can be added.",
  "instagram-localhost": "Instagram needs a secure address. Connect it from your live site address, not localhost.",
};

export function ConnectApps({
  email,
  gmailConnected,
  instagramConnected,
  instagramConfigured,
  supabaseConfigured,
  authNotice,
}: {
  email: string | null;
  gmailConnected: boolean;
  instagramConnected: boolean;
  instagramConfigured: boolean;
  supabaseConfigured: boolean;
  authNotice: string | null;
}) {
  const reduce = useReducedMotion();
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (authNotice && notices[authNotice]) setToast(notices[authNotice]);
  }, [authNotice]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const live = [
    {
      name: "Gmail",
      mark: "✉",
      detail: "Brand email, connected in one tap. Signing in also creates your account.",
      hint: "Gmail is the account. Everything else attaches to it.",
      status: gmailConnected ? "Connected" : "Ready",
      action: gmailConnected
        ? null
        : supabaseConfigured
          ? { href: "/auth/sign-in", label: "Connect Gmail" }
          : { href: "", label: "Coming soon", disabled: true },
    },
    {
      name: "Instagram",
      mark: "◉",
      detail: "Your DMs, on a professional account — with access you approve.",
      hint: "A professional account is required.",
      status: instagramConnected ? "Connected" : instagramConfigured && email ? "Ready" : "After Gmail",
      action: instagramConnected
        ? null
        : email && instagramConfigured
          ? { href: "/auth/instagram", label: "Connect Instagram" }
          : { href: "", label: email ? "Coming soon" : "Connect Gmail first", disabled: true },
    },
  ];

  const soon = [
    { name: "WhatsApp Business", detail: "Your business inbox." },
    { name: "Outlook", detail: "Brand mail on Outlook and Hotmail." },
    { name: "X", detail: "Direct messages." },
    { name: "Messenger", detail: "Your Page inbox." },
  ];

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#14110e] text-[#f6f1e8]">
      <div className="site-grain" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-28 left-1/2 h-[26rem] w-[46rem] -translate-x-1/2 rounded-full bg-[#ff5a36]/12 blur-[110px]" />
        <motion.div
          className="absolute right-[-6rem] top-64 h-[18rem] w-[18rem] rounded-full bg-amber-400/10 blur-[100px]"
          animate={reduce ? undefined : { y: [0, 30, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-[#14110e]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#ff5a36] text-sm font-semibold text-[#14110e]">B</span>
            <span className="truncate font-serif text-base tracking-tight sm:text-lg">Brand Deal Inbox</span>
          </Link>
          <nav className="flex shrink-0 items-center gap-0.5 text-sm">
            <a href="/#what" className="hidden rounded-lg px-3 py-2 text-[#f6f1e8]/60 hover:text-white lg:inline">What it does</a>
            <a href="/#letter" className="hidden rounded-lg px-3 py-2 text-[#f6f1e8]/60 hover:text-white sm:inline">Live read</a>
            <a href="/#rates" className="hidden rounded-lg px-3 py-2 text-[#f6f1e8]/60 hover:text-white md:inline">Rate engine</a>
            <Link href="/connect" className="rounded-lg px-3 py-2 font-medium text-white">Inboxes</Link>
            <Link href="/deals" className="ml-1 whitespace-nowrap rounded-full bg-[#f6f1e8] px-3.5 py-2 font-medium text-[#14110e] hover:bg-white">Open desk</Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-3xl px-6 pb-28 pt-28">
        <motion.p initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#ff5a36]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#ff5a36]" /> Get started
        </motion.p>
        <h1 className="mt-3 overflow-hidden font-serif text-5xl tracking-tight md:text-6xl">
          <motion.span className="block" initial={reduce ? false : { y: "110%" }} animate={{ y: "0%" }} transition={{ duration: 0.8, ease }}>
            Add the inboxes brands write to.
          </motion.span>
        </h1>
        <motion.p
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5, ease }}
          className="mt-4 max-w-xl text-base leading-7 text-[#f6f1e8]/65"
        >
          {email ? <span className="text-[#f6f1e8]">Signed in as {email}. </span> : ""}
          After each inbox connects you land back here — add another, or skip straight to the desk.
        </motion.p>

        <motion.ol
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28, duration: 0.5, ease }}
          className="mt-6 grid grid-cols-3 gap-2"
        >
          {[
            ["01 · Connect", true],
            ["02 · Desk reads", false],
            ["03 · You approve", false],
          ].map(([label, on]) => (
            <motion.li
              key={label as string}
              whileHover={{ y: -2 }}
              className={`rounded-2xl border px-3 py-2.5 text-center text-xs font-medium ${on ? "border-[#ff5a36]/50 bg-[#ff5a36]/10 text-white" : "border-white/10 bg-white/[0.03] text-[#f6f1e8]/45"}`}
            >
              {label as string}
            </motion.li>
          ))}
        </motion.ol>

        <div className="mt-10 grid gap-3">
          {live.map((card, index) => (
            <motion.div
              key={card.name}
              initial={reduce ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + index * 0.07, duration: 0.5, ease }}
              whileHover={reduce ? undefined : { y: -3 }}
            >
              <InboxCard
                {...card}
                onDisabled={() => setToast(card.name === "Instagram"
                  ? "Connect Gmail first. That creates your account."
                  : "Sign-in isn't set up yet. Please come back in a bit.")}
              />
            </motion.div>
          ))}
        </div>

        <div className="mt-10 flex items-center gap-3">
          <p className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#f6f1e8]/40">Coming soon</p>
          <div className="h-px flex-1 bg-white/10" />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {soon.map((card, index) => (
            <motion.div
              key={card.name}
              initial={reduce ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.05, duration: 0.45, ease }}
              whileHover={reduce ? undefined : { y: -3 }}
              className="group rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4 transition hover:border-[#ff5a36]/30"
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-serif text-xl tracking-tight">{card.name}</h2>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium text-[#f6f1e8]/60 transition group-hover:bg-[#ff5a36]/20 group-hover:text-[#ff5a36]">Soon</span>
              </div>
              <p className="mt-1 text-sm text-[#f6f1e8]/50">{card.detail}</p>
            </motion.div>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-[#f6f1e8]/35">One desk for every inbox — so you stop checking six apps.</p>

        <motion.div
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 flex flex-wrap items-center gap-3"
        >
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Link href="/deals" className="rounded-full bg-[#ff5a36] px-5 py-3 text-sm font-semibold text-[#14110e] shadow-[0_18px_50px_-18px_rgba(255,90,54,0.8)] transition hover:bg-[#ff7a5c]">Continue to the desk</Link>
          </motion.div>
          <Link href="/deals" className="rounded-full px-3 py-3 text-sm text-[#f6f1e8]/55 hover:text-white">Skip for now</Link>
        </motion.div>
      </main>

      <AnimatePresence>
        {toast ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-5 left-1/2 z-20 w-[min(32rem,calc(100%-2rem))] -translate-x-1/2 rounded-2xl bg-[#f6f1e8] px-4 py-3 text-sm text-[#14110e] shadow-xl"
            role="status"
          >
            {toast}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function InboxCard({
  name,
  mark,
  detail,
  hint,
  status,
  action,
  onDisabled,
}: {
  name: string;
  mark: string;
  detail: string;
  hint: string;
  status: string;
  action?: { href: string; label: string; disabled?: boolean } | null;
  onDisabled?: () => void;
}) {
  const connected = status === "Connected";
  return (
    <article className={`relative overflow-hidden rounded-3xl border px-5 py-5 transition sm:flex sm:items-center sm:justify-between sm:gap-6 ${connected ? "border-[#ff5a36]/45 bg-[#ff5a36]/[0.07]" : "border-white/10 bg-[#1c1814]"}`}>
      {connected ? <div className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full bg-[#ff5a36]/20 blur-[50px]" /> : null}
      <div className="flex items-start gap-4">
        <motion.span
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-lg ${connected ? "bg-[#ff5a36] text-[#14110e]" : "bg-white/8 text-[#f6f1e8]"}`}
        >
          {mark}
        </motion.span>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-serif text-2xl tracking-tight">{name}</h2>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${connected ? "bg-[#ff5a36] text-[#14110e]" : "bg-white/10 text-[#f6f1e8]/70"}`}>{status}</span>
          </div>
          <p className="mt-1 max-w-md text-sm leading-6 text-[#f6f1e8]/55">{detail}</p>
          <p className="mt-1 text-xs text-[#f6f1e8]/35">{hint}</p>
        </div>
      </div>
      <div className="mt-4 shrink-0 sm:mt-0">
        {action ? (
          action.disabled ? (
            <button className="w-full rounded-full border border-white/15 px-4 py-2.5 text-sm text-[#f6f1e8]/70 sm:w-auto" type="button" onClick={onDisabled}>{action.label}</button>
          ) : (
            <a className="block rounded-full bg-[#f6f1e8] px-4 py-2.5 text-center text-sm font-semibold text-[#14110e] transition hover:bg-white" href={action.href}>{action.label}</a>
          )
        ) : connected ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#ff5a36]"><span className="grid h-5 w-5 place-items-center rounded-full bg-[#ff5a36] text-xs text-[#14110e]">✓</span> Added</span>
        ) : null}
      </div>
    </article>
  );
}
