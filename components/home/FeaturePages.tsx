"use client";

import { useReducedMotion } from "framer-motion";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { RateLab, ThreadDemo, WhatWeDo } from "@/components/home/HomePage";

function Shell({ email, active, children }: { email: string | null; active: "what" | "read" | "rates"; children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#14110e] text-[#f6f1e8] antialiased">
      <div className="site-grain" aria-hidden="true" />
      <SiteHeader email={email} active={active} />
      <main className="relative z-10 pt-16">{children}</main>
      <SiteFooter />
    </div>
  );
}

export function WhatPage({ email }: { email: string | null }) {
  return (
    <Shell email={email} active="what">
      <WhatWeDo />
    </Shell>
  );
}

export function ReadPage({ email }: { email: string | null }) {
  const reduce = useReducedMotion();
  return (
    <Shell email={email} active="read">
      <ThreadDemo reduce={Boolean(reduce)} />
    </Shell>
  );
}

export function RatesPage({ email }: { email: string | null }) {
  return (
    <Shell email={email} active="rates">
      <RateLab />
    </Shell>
  );
}
