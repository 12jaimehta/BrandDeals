"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as const;

const notices: Record<string, string> = {
  error: "Google sign-in did not finish. Check the Supabase Google provider and redirect URL.",
  unconfigured: "Add the Supabase URL and publishable key to .env first.",
  "signed-in": "Gmail is connected. Add another inbox, or continue to the desk.",
  "needs-sql": "Run supabase/migrations/0001_inbox.sql in the Supabase SQL editor, then connect Gmail again.",
  "no-gmail-token": "Google signed you in, but did not grant inbox access. Connect Gmail again.",
  "no-secret": "Add SUPABASE_SECRET_KEY to .env so the connection can be saved.",
  "save-failed": "Saving the connection failed. Check the Supabase secret key and the SQL migrations.",
  instagram: "Instagram is connected. Add another inbox, or continue to the desk.",
  "instagram-unconfigured": "Add INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET to .env, then connect Instagram.",
  "instagram-denied": "Instagram sign-in was cancelled.",
  "instagram-mismatch": "Instagram sign-in expired. Connect it again.",
  "instagram-failed": "Instagram did not finish connecting. Use a professional account and allow message access.",
  "needs-instagram-sql": "Run supabase/migrations/0002_instagram.sql in the Supabase SQL editor, then connect Instagram again.",
  "sign-in-first": "Connect Gmail first. That creates your account, then Instagram can be added.",
  "instagram-localhost": "Instagram needs the https tunnel address. Connect it from that address, not localhost.",
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

  const cards = [
    {
      name: "Gmail",
      detail: "Reads brand email. This also creates your account.",
      status: gmailConnected ? "Connected" : "Ready",
      action: gmailConnected ? null : supabaseConfigured ? { href: "/auth/sign-in", label: "Connect Gmail" } : { href: "", label: "Add Supabase keys", disabled: true },
    },
    {
      name: "Instagram",
      detail: "Reads DMs on a professional account.",
      status: instagramConnected ? "Connected" : instagramConfigured && email ? "Ready" : "After Gmail",
      action: instagramConnected ? null : email && instagramConfigured ? { href: "/auth/instagram", label: "Connect Instagram" } : { href: "", label: email ? "Add Instagram keys" : "Connect Gmail first", disabled: true },
    },
    { name: "Outlook", detail: "Microsoft Graph mail. Brand email on Outlook and Hotmail.", status: "Official API", action: null },
    { name: "X", detail: "Direct messages through the X API.", status: "Official API", action: null },
    { name: "Messenger", detail: "A Facebook Page inbox through the Messenger API.", status: "Official API", action: null },
    { name: "WhatsApp Business", detail: "A WhatsApp Business inbox through the Cloud API.", status: "Official API", action: null },
  ];

  return (
    <div className="min-h-screen bg-[#14110e] text-[#f6f1e8]">
      <header className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#ff5a36] text-sm font-semibold text-[#14110e]">B</span>
          <span className="truncate font-serif text-lg tracking-tight">Inboxes</span>
        </Link>
        <Link href="/deals" className="grid h-9 w-9 place-items-center rounded-full border border-white/15 text-lg leading-none text-[#f6f1e8]/70 hover:text-white" aria-label="Skip and open the desk">×</Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-28 pt-8">
        <motion.p initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ff5a36]">
          Connect
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
          {email ? `Signed in as ${email}. ` : ""}
          Connect the ones you use. You can close this and open the desk whenever you want.
        </motion.p>

        <div className="mt-10 grid gap-3">
          {cards.map((card, index) => (
            <motion.div
              key={card.name}
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + index * 0.06, duration: 0.45, ease }}
            >
              <InboxCard
                {...card}
                onDisabled={() => setToast(card.name === "Instagram"
                  ? (email ? "Add INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET to .env." : "Connect Gmail first. That creates your account.")
                  : "Add the Supabase URL and publishable key to .env first.")}
              />
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          className="mt-8 flex flex-wrap items-center gap-3"
        >
          <Link href="/deals" className="rounded-full bg-[#ff5a36] px-5 py-3 text-sm font-semibold text-[#14110e] hover:bg-[#ff7a5c]">Continue to the desk</Link>
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
  detail,
  status,
  action,
  onDisabled,
}: {
  name: string;
  detail: string;
  status: string;
  action?: { href: string; label: string; disabled?: boolean } | null;
  onDisabled?: () => void;
}) {
  const connected = status === "Connected";
  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#1c1814] px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-serif text-2xl tracking-tight">{name}</h2>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${connected ? "bg-[#ff5a36] text-[#14110e]" : "bg-white/10 text-[#f6f1e8]/70"}`}>{status}</span>
        </div>
        <p className="mt-1 text-sm leading-6 text-[#f6f1e8]/55">{detail}</p>
      </div>
      {action ? (
        action.disabled ? (
          <button className="rounded-full border border-white/15 px-3 py-2 text-sm text-[#f6f1e8]/70" type="button" onClick={onDisabled}>{action.label}</button>
        ) : (
          <a className="rounded-full bg-[#f6f1e8] px-3 py-2 text-center text-sm font-semibold text-[#14110e] hover:bg-white" href={action.href}>{action.label}</a>
        )
      ) : connected ? (
        <span className="text-sm text-[#ff5a36]">Added</span>
      ) : (
        <span className="text-sm text-[#f6f1e8]/35">Next</span>
      )}
    </article>
  );
}
