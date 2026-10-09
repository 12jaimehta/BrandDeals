"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { formatINR } from "@/lib/read-deal.mjs";

export const ease = [0.22, 1, 0.36, 1] as const;
export const snap = { type: "spring", stiffness: 420, damping: 36 } as const;

export const inputDark = "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-[#f6f1e8] outline-none transition placeholder:text-[#f6f1e8]/30 focus:border-[#ff5a36]/60";
export const inputLight = "w-full rounded-xl border border-[#14110e]/12 bg-white px-3 py-2 text-sm text-[#14110e] outline-none transition placeholder:text-[#14110e]/30 focus:border-[#ff5a36]";
export const buttonHot = "rounded-full bg-[#ff5a36] px-4 py-2 text-sm font-semibold text-[#14110e] transition hover:bg-[#ff7a5c] disabled:cursor-not-allowed disabled:opacity-50";
export const buttonCream = "rounded-full bg-[#f6f1e8] px-4 py-2 text-sm font-semibold text-[#14110e] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50";
export const buttonInk = "rounded-full bg-[#14110e] px-4 py-2 text-sm font-semibold text-[#f6f1e8] transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50";
export const buttonGhostDark = "rounded-full border border-white/20 px-4 py-2 text-sm text-[#f6f1e8] transition hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-50";
export const buttonGhostLight = "rounded-full border border-[#14110e]/15 px-4 py-2 text-sm text-[#14110e] transition hover:border-[#14110e]/40 disabled:cursor-not-allowed disabled:opacity-50";

export function useToast(ms = 3800) {
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), ms);
    return () => window.clearTimeout(timer);
  }, [toast, ms]);
  const show = useCallback((message: string | null) => setToast(message), []);
  return [toast, show] as const;
}

export function Toast({ message }: { message: string | null }) {
  return (
    <AnimatePresence>
      {message ? (
        <motion.div
          key={message}
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          className="fixed bottom-5 left-1/2 z-[60] w-[min(34rem,calc(100%-2rem))] -translate-x-1/2 rounded-2xl bg-[#f6f1e8] px-4 py-3 text-sm text-[#14110e] shadow-xl"
          role="status"
          aria-live="polite"
        >
          {message}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function CountTo({ from, to, delay = 0.3 }: { from: number; to: number; delay?: number }) {
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

export function Kicker({ children, tone = "hot" }: { children: ReactNode; tone?: "hot" | "muted" }) {
  return (
    <p className={`flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] ${tone === "hot" ? "text-[#ff5a36]" : "text-current opacity-45"}`}>
      {tone === "hot" ? <span className="h-1.5 w-1.5 rounded-full bg-[#ff5a36]" /> : null}
      {children}
    </p>
  );
}

export function Switch({ on, onChange, label, disabled }: { on: boolean; onChange: (next: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:cursor-not-allowed disabled:opacity-40 ${on ? "bg-[#ff5a36]" : "bg-white/15"}`}
    >
      <motion.span layout transition={snap} className={`absolute top-0.5 h-5 w-5 rounded-full bg-[#f6f1e8] shadow ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#14110e] text-[#f6f1e8]">
      <div className="site-grain" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-28 left-1/2 h-[26rem] w-[46rem] -translate-x-1/2 rounded-full bg-[#ff5a36]/10 blur-[110px]" />
      </div>
      {children}
    </div>
  );
}

export async function api<T>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: init?.json !== undefined ? { "Content-Type": "application/json", ...init?.headers } : init?.headers,
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
  });
  const body = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(body.error || "Something went wrong.");
  return body;
}
