"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";

const ease = [0.22, 1, 0.36, 1] as const;

type InboxId = "gmail" | "instagram";

const notices: Record<string, string> = {
  error: "Google sign-in did not finish. Please try again.",
  unconfigured: "Sign-in isn't set up yet. Please come back in a bit.",
  "logged-in": "Signed in. Connect Gmail or Instagram to open the desk.",
  "need-inbox": "Connect Gmail or Instagram to open the desk.",
  paused: "X, WhatsApp, Outlook, and Messenger are paused. Connect Gmail or Instagram.",
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
  "x-unconfigured": "X isn't set up yet. Add the X keys, then connect it again.",
  x: "X is connected.",
  "x-denied": "X sign-in was cancelled.",
  "x-mismatch": "X sign-in expired. Connect it again.",
  "x-failed": "X didn't finish connecting. In the X app, the callback must be http://127.0.0.1:3000/auth/x/callback.",
  "needs-channels-sql": "Run supabase/migrations/0003_channels.sql in the Supabase SQL editor, then connect again.",
  "whatsapp-unconfigured": "WhatsApp Business isn't set up yet.",
  "messenger-https": "Facebook will not sign in over http. Open the https address for this site, then connect Messenger from there.",
  "messenger-unconfigured": "Messenger isn't set up yet. Add the Messenger keys, then connect it again.",
  messenger: "Messenger is connected.",
  "messenger-denied": "Messenger sign-in was cancelled.",
  "messenger-mismatch": "Messenger sign-in expired. Connect it again.",
  "messenger-no-page": "That Facebook login has no Page. Messenger connects a Page you admin.",
  "messenger-failed": "Messenger didn't finish connecting. In the Meta app, the callback must be the https address you opened, ending in /auth/messenger/callback.",
};

const setupHints: Record<InboxId, string> = {
  gmail: "Sign-in isn't set up yet. Please come back in a bit.",
  instagram: "Instagram isn't set up yet. Please come back in a bit.",
};

export function ConnectApps({
  email,
  signedIn,
  canOpenDesk,
  instagramLive,
  connected,
  configured,
  authNotice,
}: {
  email: string | null;
  signedIn: boolean;
  canOpenDesk: boolean;
  instagramLive: boolean;
  connected: Record<InboxId, boolean>;
  configured: Record<InboxId, boolean>;
  authNotice: string | null;
}) {
  const reduce = useReducedMotion();
  const router = useRouter();
  const [toast, setToast] = useState<string | null>(null);
  const [linked, setLinked] = useState(connected);
  const [deskOpen, setDeskOpen] = useState(canOpenDesk);
  const [disconnecting, setDisconnecting] = useState<InboxId | null>(null);

  useEffect(() => {
    setLinked(connected);
    setDeskOpen(canOpenDesk);
  }, [connected, canOpenDesk]);

  useEffect(() => {
    if (authNotice && notices[authNotice]) setToast(notices[authNotice]);
  }, [authNotice]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function disconnect(id: InboxId, name: string) {
    if (disconnecting) return;
    setDisconnecting(id);
    try {
      const response = await fetch("/api/inbox/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setToast(body.error || "Disconnect failed. Please try again.");
        return;
      }
      const next = { ...linked, [id]: false };
      setLinked(next);
      setDeskOpen(Object.values(next).some(Boolean));
      setToast(`${name} is disconnected.`);
      router.refresh();
    } catch {
      setToast("Disconnect failed. Please try again.");
    } finally {
      setDisconnecting(null);
    }
  }

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
      detail: "Brand email.",
      live: true,
      href: "/auth/sign-in",
      connectLabel: "Connect Gmail",
    },
    {
      id: "instagram",
      mark: "◉",
      name: "Instagram",
      detail: instagramLive
        ? "DMs on a professional account."
        : "Sandbox only. Meta app review is not cleared, so only tester accounts connect.",
      live: true,
      href: "/auth/instagram",
      connectLabel: "Connect Instagram",
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

      <SiteHeader email={signedIn ? email : null} active="inboxes" />

      <main className="relative z-10 mx-auto max-w-3xl px-6 pb-28 pt-28">
        <motion.p initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#ff5a36]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#ff5a36]" /> Inboxes
        </motion.p>
        <h1 className="mt-3 overflow-hidden font-serif text-5xl tracking-tight md:text-6xl">
          <motion.span className="block" initial={reduce ? false : { y: "110%" }} animate={{ y: "0%" }} transition={{ duration: 0.8, ease }}>
            Gmail and Instagram.
          </motion.span>
        </h1>
        <motion.p
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5, ease }}
          className="mt-4 max-w-xl text-base leading-7 text-[#f6f1e8]/65"
        >
          X, WhatsApp, Outlook, and Messenger are paused so the pipeline stays on these two. Gmail is the path that does not wait on Meta. If Instagram review blocks DMs, paste the email on the email desk.
        </motion.p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {inboxes.map((inbox, index) => {
            const isConnected = linked[inbox.id];
            const isConfigured = configured[inbox.id];
            const status = isConnected ? "Connected" : inbox.live ? (isConfigured ? "Ready" : "Setup needed") : "Soon";
            const needsAccount = !signedIn && inbox.id !== "gmail";
            const action = isConnected
              ? null
              : needsAccount
                ? { href: "/login", label: "Sign in to connect" }
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
                  {isConnected ? (
                    <button
                      className="shrink-0 rounded-full bg-[#ff5a36] px-2.5 py-0.5 text-[11px] font-semibold text-[#14110e] transition hover:bg-[#ff7a5c] disabled:opacity-50"
                      type="button"
                      onClick={() => void disconnect(inbox.id, inbox.name)}
                      disabled={disconnecting != null}
                    >
                      {disconnecting === inbox.id ? "Disconnecting…" : "Disconnect"}
                    </button>
                  ) : (
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${status === "Ready" ? "bg-emerald-400/15 text-emerald-300" : "bg-white/10 text-[#f6f1e8]/60"}`}>
                      {status}
                    </span>
                  )}
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
        <p className="mt-6 text-center text-xs leading-5 text-[#f6f1e8]/40">
          Before any creator outside the Meta tester list is added, run <span className="text-[#f6f1e8]/70">sandbox/instagram</span> in Postman. If that review is blocked, use the <Link href="/email" className="underline">email desk</Link>.
        </p>
        <p className="mt-4 text-center text-sm text-[#f6f1e8]/45">
          {deskOpen ? (
            <Link href="/deals" className="underline decoration-white/20 underline-offset-4 hover:text-white">Open the desk</Link>
          ) : (
            "Connect Gmail or Instagram to open the desk."
          )}
        </p>
      </main>
      <SiteFooter />

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
