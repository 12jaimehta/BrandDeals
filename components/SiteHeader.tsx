"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

type Active = "home" | "inboxes" | "desk" | "what" | "read" | "rates";

const links = [
  { href: "/what", label: "What it does" },
  { href: "/read", label: "Live read" },
  { href: "/rates", label: "Rate engine" },
  { href: "/connect", label: "Inboxes" },
  { href: "/deals", label: "Desk" },
];

export function SiteHeader({
  email,
  fixed = true,
  desk,
}: {
  email: string | null;
  active?: Active;
  fixed?: boolean;
  desk?: {
    autoSync: boolean;
    onAutoSync: (next: boolean) => void;
    syncing: boolean;
    onSync: () => void;
  };
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const onDesk = pathname === "/deals";

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const menu = (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-40 bg-[#14110e]"
        >
          <motion.nav
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.35, delay: 0.05 }}
            className="mx-auto flex h-full max-w-3xl flex-col justify-center px-8 pb-10 pt-24"
            aria-label="Pages"
          >
            <ul className="space-y-1">
              {links.map((link) => {
                const current = pathname === link.href;
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={`block py-1 font-serif text-4xl tracking-tight transition hover:text-[#ff5a36] sm:text-6xl ${current ? "text-[#ff5a36]" : "text-[#f6f1e8]"}`}
                      onClick={() => setOpen(false)}
                    >
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="mt-10 flex flex-wrap items-center gap-4 border-t border-white/10 pt-6 text-sm">
              {email ? (
                <>
                  <span className="max-w-xs truncate text-[#f6f1e8]/50">{email}</span>
                  <a href="/auth/sign-out" className="text-[#f6f1e8]/80 hover:text-white">Sign out</a>
                </>
              ) : (
                <Link href="/login" className="rounded-full bg-[#f6f1e8] px-5 py-2.5 font-medium text-[#14110e] hover:bg-white" onClick={() => setOpen(false)}>
                  Sign in
                </Link>
              )}
              {desk ? (
                <label className="ml-auto flex items-center gap-2 text-[#f6f1e8]/60">
                  <input className="h-4 w-4 accent-[#ff5a36]" type="checkbox" checked={desk.autoSync} onChange={(event) => desk.onAutoSync(event.target.checked)} />
                  Auto sync
                </label>
              ) : null}
            </div>
          </motion.nav>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  return (
    <>
      <header className={`${fixed ? "fixed" : "relative"} inset-x-0 top-0 z-50 border-b border-white/10 bg-[#14110e]/90 backdrop-blur-xl`}>
        <div className={`mx-auto flex h-16 items-center gap-3 px-4 sm:px-6 ${onDesk ? "max-w-none" : "max-w-6xl"}`}>
          <Link href="/" className="flex min-w-0 items-center gap-2.5" onClick={() => setOpen(false)}>
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#ff5a36] text-sm font-semibold text-[#14110e]">B</span>
            <span className="truncate font-serif text-base tracking-tight sm:text-lg">Brand Deal Inbox</span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            {desk ? (
              <button className="whitespace-nowrap rounded-full bg-[#ff5a36] px-3.5 py-2 text-sm font-semibold text-[#14110e] transition hover:bg-[#ff7a5c] disabled:opacity-50" type="button" onClick={desk.onSync} disabled={desk.syncing}>
                {desk.syncing ? "Reading…" : "Sync"}
              </button>
            ) : null}
            <button
              type="button"
              className="grid h-11 w-11 place-items-center text-[#f6f1e8] transition hover:text-[#ff5a36]"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen((value) => !value)}
            >
              <MenuMark open={open} />
            </button>
          </div>
        </div>
      </header>
      {mounted ? createPortal(menu, document.body) : null}
    </>
  );
}

function MenuMark({ open }: { open: boolean }) {
  return (
    <span className="relative block h-4 w-6" aria-hidden="true">
      <span className={`absolute left-0 h-[1.5px] w-6 rounded-full bg-current transition duration-300 ${open ? "top-1/2 -translate-y-1/2 rotate-45" : "top-0"}`} />
      <span className={`absolute left-0 top-1/2 h-[1.5px] w-6 -translate-y-1/2 rounded-full bg-current transition duration-300 ${open ? "opacity-0" : "opacity-100"}`} />
      <span className={`absolute left-0 h-[1.5px] w-6 rounded-full bg-current transition duration-300 ${open ? "top-1/2 -translate-y-1/2 -rotate-45" : "bottom-0"}`} />
    </span>
  );
}

export function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-white/10 px-6 py-10 text-sm text-[#f6f1e8]/45">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <span className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-md bg-[#ff5a36] text-xs font-semibold text-[#14110e]">B</span>
          Brand Deal Inbox
        </span>
        <span className="flex flex-wrap gap-x-4 gap-y-2">
          <Link href="/what" className="hover:text-[#f6f1e8]">What it does</Link>
          <Link href="/read" className="hover:text-[#f6f1e8]">Live read</Link>
          <Link href="/rates" className="hover:text-[#f6f1e8]">Rate engine</Link>
          <Link href="/connect" className="hover:text-[#f6f1e8]">Inboxes</Link>
          <Link href="/deals" className="hover:text-[#f6f1e8]">Desk</Link>
        </span>
      </div>
    </footer>
  );
}
