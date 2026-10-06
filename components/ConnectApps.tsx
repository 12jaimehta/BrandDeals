"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as const;

type InboxId = "gmail" | "instagram" | "whatsapp" | "outlook" | "x" | "messenger";

const notices: Record<string, string> = {
  error: "Google sign-in did not finish. Please try again.",
  unconfigured: "Sign-in isn't set up yet. Please come back in a bit.",
  "logged-in": "Signed in. Connect any inbox you use — or skip straight to the desk.",
  "signed-in": "Gmail is connected. Add another inbox, or continue to the desk.",
  "needs-sql": "Your account needs a quick setup on our side — please try again in a moment.",
  "no-gmail-token": "Google signed you in, but didn't grant inbox access. Connect Gmail again.",
  "no-secret": "We couldn't save the connection. Please try again.",
  "save-failed": "Saving the connection failed. Please try again.",
  instagram: "Instagram is connected. Add another inbox, or continue to the desk.",
  "instagram-unconfigured": "Instagram isn't set up yet. Add the Instagram keys, then retry.",
  "instagram-denied": "Instagram sign-in was cancelled.",
  "instagram-mismatch": "Instagram sign-in expired. Connect it again.",
  "instagram-failed": "Instagram didn't finish connecting. Use a professional account and allow message access.",
  "needs-instagram-sql": "Run supabase/migrations/0002_instagram.sql in the Supabase SQL editor, then connect Instagram again.",
  "sign-in-first": "Sign in first — then connect any inbox. Nothing connects on its own.",
  "instagram-localhost": "Instagram needs a secure address. Connect it from your live site address, not localhost.",
  "outlook-unconfigured": "Outlook needs a Microsoft app registration first. The setup notes below list the two keys.",
  "x-unconfigured": "X needs a developer app first. The setup notes below list the two keys.",
  "whatsapp-unconfigured": "WhatsApp Business needs a Meta app with the WhatsApp product first. Keys are listed below.",
  "messenger-unconfigured": "Messenger needs a Meta app with the Messenger product first. Keys are listed below.",
};

const setupHints: Record<string, string> = {
  gmail: "Sign-in isn't set up yet. Please come back in a bit.",
  instagram: "Instagram isn't set up yet. Please come back in a bit.",
  whatsapp: "WhatsApp Business needs WHATSAPP_APP_ID and WHATSAPP_APP_SECRET. The setup notes below have the steps.",
  outlook: "Outlook needs OUTLOOK_CLIENT_ID and OUTLOOK_CLIENT_SECRET. The setup notes below have the steps.",
  x: "X needs X_CLIENT_ID and X_CLIENT_SECRET. The setup notes below have the steps.",
  messenger: "Messenger needs MESSENGER_APP_ID and MESSENGER_APP_SECRET. The setup notes below have the steps.",
};

const setupNotes: Array<{ name: string; keys: string; steps: string }> = [
  {
    name: "Outlook",
    keys: "OUTLOOK_CLIENT_ID · OUTLOOK_CLIENT_SECRET",
    steps: "Register an app in the Microsoft Entra admin center, add the Mail.Read and Mail.Send delegated permissions, and set the redirect URI to your-site/auth/outlook/callback.",
  },
  {
    name: "X",
    keys: "X_CLIENT_ID · X_CLIENT_SECRET",
    steps: "Create an app in the X developer portal, turn on OAuth 2.0 with read + DM access, and set the redirect URI to your-site/auth/x/callback.",
  },
  {
    name: "WhatsApp Business",
    keys: "WHATSAPP_APP_ID · WHATSAPP_APP_SECRET",
    steps: "Create a Meta app, add the WhatsApp product, connect your business number, and set the redirect URI to your-site/auth/whatsapp/callback.",
  },
  {
    name: "Messenger",
    keys: "MESSENGER_APP_ID · MESSENGER_APP_SECRET",
    steps: "Create a Meta app, add the Messenger product on your Page with pages_messaging permission, and set the redirect URI to your-site/auth/messenger/callback.",
  },
];

export function ConnectApps({
  email,
  signedIn,
  connected,
  configured,
  authNotice,
}: {
  email: string | null;
  signedIn: boolean;
  connected: Record<InboxId, boolean>;
  configured: Record<InboxId, boolean>;
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

  const inboxes: Array<{
    id: InboxId;
    mark: string;
    name: string;
    detail: string;
    live: boolean;
    href: string;
    connectLabel: string;
  }> = [
    {
      id: "gmail",
      mark: "✉",
      name: "Gmail",
      detail: "Brand email, connected in one tap. Also signs you in if you're new.",
      live: true,
      href: "/auth/sign-in",
      connectLabel: "Connect Gmail",
    },
    {
      id: "instagram",
      mark: "◉",
      name: "Instagram",
      detail: "Your DMs, on a professional account — with access you approve.",
      live: true,
      href: "/auth/instagram",
      connectLabel: "Connect Instagram",
    },
    {
      id: "whatsapp",
      mark: "✆",
      name: "WhatsApp Business",
      detail: "Your business inbox.",
      live: false,
      href: "/auth/whatsapp",
      connectLabel: "Connect WhatsApp",
    },
    {
      id: "outlook",
      mark: "▦",
      name: "Outlook",
      detail: "Brand mail on Outlook and Hotmail.",
      live: false,
      href: "/auth/outlook",
      connectLabel: "Connect Outlook",
    },
    {
      id: "x",
      mark: "𝕏",
      name: "X",
      detail: "Direct messages.",
      live: false,
      href: "/auth/x",
      connectLabel: "Connect X",
    },
    {
      id: "messenger",
      mark: "💬",
      name: "Messenger",
      detail: "Your Page inbox.",
      live: false,
      href: "/auth/messenger",
      connectLabel: "Connect Messenger",
    },
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
            {signedIn ? (
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
          {signedIn && email ? <span className="text-[#f6f1e8]">Signed in as {email}. </span> : ""}
          Every inbox is optional — connect only the ones you use. After each one connects you land back here, or skip straight to the desk.
        </motion.p>

        <motion.ol
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28, duration: 0.5, ease }}
          className="mt-6 grid grid-cols-3 gap-2"
        >
          {[
            ["01 · Sign in", signedIn],
            ["02 · Add inboxes", false],
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

        {!signedIn ? (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.34, duration: 0.5, ease }}
            className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4"
          >
            <p className="text-sm text-[#f6f1e8]/70">Sign in first — it only creates your account, it connects nothing.</p>
            <a href="/auth/login" className="rounded-full bg-[#f6f1e8] px-4 py-2.5 text-sm font-semibold text-[#14110e] transition hover:bg-white">Sign in with Google</a>
          </motion.div>
        ) : null}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {inboxes.map((inbox, index) => {
            const isConnected = connected[inbox.id];
            const isConfigured = configured[inbox.id];
            const status = isConnected ? "Connected" : inbox.live ? (isConfigured ? "Ready" : "Setup needed") : "Soon";
            const needsSignIn = !signedIn && inbox.id === "instagram";
            const action = isConnected
              ? null
              : needsSignIn
                ? { href: "/login", label: "Sign in first" }
                : inbox.live && isConfigured
                  ? { href: inbox.href, label: inbox.connectLabel }
                  : inbox.live
                    ? { href: "", label: "Setup needed", disabled: true as const }
                    : isConfigured
                      ? { href: inbox.href, label: inbox.connectLabel }
                      : { href: "", label: "Soon", disabled: true as const };
            return (
              <motion.div
                key={inbox.id}
                initial={reduce ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + index * 0.05, duration: 0.45, ease }}
                whileHover={reduce ? undefined : { y: -3 }}
                className={`group rounded-2xl border px-5 py-4 transition ${isConnected ? "border-[#ff5a36]/45 bg-[#ff5a36]/[0.07]" : "border-white/10 bg-white/[0.02] hover:border-[#ff5a36]/30"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-base ${isConnected ? "bg-[#ff5a36] text-[#14110e]" : "bg-white/8 text-[#f6f1e8]"}`}>
                      {inbox.mark}
                    </span>
                    <h2 className="truncate font-serif text-xl tracking-tight">{inbox.name}</h2>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${isConnected ? "bg-[#ff5a36] font-semibold text-[#14110e]" : status === "Ready" ? "bg-emerald-400/15 text-emerald-300" : "bg-white/10 text-[#f6f1e8]/60"}`}>
                    {status}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-[#f6f1e8]/50">{inbox.detail}</p>
                <div className="mt-3">
                  {action ? (
                    action.disabled ? (
                      <button
                        className="w-full rounded-full border border-white/15 px-4 py-2 text-sm text-[#f6f1e8]/70 transition hover:border-white/30"
                        type="button"
                        onClick={() => setToast(setupHints[inbox.id])}
                      >
                        {action.label}
                      </button>
                    ) : (
                      <a
                        className="block rounded-full bg-[#f6f1e8] px-4 py-2 text-center text-sm font-semibold text-[#14110e] transition hover:bg-white"
                        href={action.href}
                      >
                        {action.label}
                      </a>
                    )
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#ff5a36]">
                      <span className="grid h-5 w-5 place-items-center rounded-full bg-[#ff5a36] text-xs text-[#14110e]">✓</span> Added
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
        <p className="mt-4 text-center text-xs text-[#f6f1e8]/35">One desk for every inbox — so you stop checking six apps.</p>

        <details className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4">
          <summary className="cursor-pointer text-sm font-semibold">How a “Soon” inbox goes live</summary>
          <div className="mt-3 space-y-3">
            {setupNotes.map((note) => (
              <div key={note.name} className="rounded-xl bg-white/[0.03] p-3">
                <p className="text-sm font-semibold">{note.name}</p>
                <p className="mt-0.5 font-mono text-[11px] text-[#ff5a36]/90">{note.keys}</p>
                <p className="mt-1 text-xs leading-5 text-[#f6f1e8]/55">{note.steps}</p>
              </div>
            ))}
            <p className="text-xs leading-5 text-[#f6f1e8]/45">
              Then run <span className="font-mono">supabase/migrations/0003_channels.sql</span> once in the Supabase SQL editor — it stores the new tokens next to Gmail and Instagram.
            </p>
          </div>
        </details>

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
