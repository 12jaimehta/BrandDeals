"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (authNotice && notices[authNotice]) setToast(notices[authNotice]);
  }, [authNotice]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <header className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-zinc-950 text-sm font-semibold text-white">B</span>
          <span className="font-serif text-lg tracking-tight">Inboxes</span>
        </Link>
        <Link href="/deals" className="grid h-9 w-9 place-items-center rounded-full border border-zinc-200 bg-white text-lg leading-none text-zinc-500 hover:text-zinc-950" aria-label="Skip and open the desk">×</Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-24 pt-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-700">Connect</p>
        <h1 className="mt-3 font-serif text-5xl tracking-tight">Add the inboxes brands write to.</h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-zinc-600">
          {email ? `Signed in as ${email}. ` : ""}
          Connect the ones you use. You can close this and open the desk whenever you want.
        </p>

        <div className="mt-10 grid gap-3">
          <InboxCard
            name="Gmail"
            detail="Reads brand email. This also creates your account."
            status={gmailConnected ? "Connected" : "Ready"}
            action={gmailConnected ? null : supabaseConfigured ? { href: "/auth/sign-in", label: "Connect Gmail" } : { href: "", label: "Add Supabase keys", disabled: true }}
            onDisabled={() => setToast("Add the Supabase URL and publishable key to .env first.")}
          />
          <InboxCard
            name="Instagram"
            detail="Reads DMs on a professional account."
            status={instagramConnected ? "Connected" : instagramConfigured && email ? "Ready" : "Ready after Gmail"}
            action={instagramConnected ? null : email && instagramConfigured ? { href: "/auth/instagram", label: "Connect Instagram" } : { href: "", label: email ? "Add Instagram keys" : "Connect Gmail first", disabled: true }}
            onDisabled={() => setToast(email ? "Add INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET to .env." : "Connect Gmail first. That creates your account.")}
          />
          <InboxCard name="Outlook" detail="Microsoft Graph mail. Brand email on Outlook and Hotmail." status="Official API" />
          <InboxCard name="X" detail="Direct messages through the X API." status="Official API" />
          <InboxCard name="Messenger" detail="A Facebook Page inbox through the Messenger API." status="Official API" />
          <InboxCard name="WhatsApp Business" detail="A WhatsApp Business inbox through the Cloud API." status="Official API" />
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href="/deals" className="rounded-xl bg-zinc-950 px-5 py-3 text-sm font-medium text-white hover:bg-zinc-800">Continue to the desk</Link>
          <Link href="/deals" className="rounded-xl px-3 py-3 text-sm text-zinc-500 hover:text-zinc-950">Skip for now</Link>
        </div>
      </main>

      <div className={`fixed bottom-5 left-1/2 z-20 w-[min(32rem,calc(100%-2rem))] -translate-x-1/2 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm shadow-xl ${toast == null ? "hidden" : ""}`} role="status">{toast}</div>
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
  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="font-medium">{name}</h2>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${status === "Connected" ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-600"}`}>{status}</span>
        </div>
        <p className="mt-1 text-sm leading-6 text-zinc-500">{detail}</p>
      </div>
      {action ? (
        action.disabled ? (
          <button className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-500" type="button" onClick={onDisabled}>{action.label}</button>
        ) : (
          <a className="rounded-lg bg-zinc-950 px-3 py-2 text-center text-sm font-medium text-white hover:bg-zinc-800" href={action.href}>{action.label}</a>
        )
      ) : status === "Connected" ? (
        <span className="text-sm text-zinc-400">Added</span>
      ) : (
        <span className="text-sm text-zinc-400">Next</span>
      )}
    </article>
  );
}
