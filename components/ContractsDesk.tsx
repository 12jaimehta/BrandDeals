"use client";

import { useState } from "react";
import { AgreementBuilder, ContractChecker } from "@/components/ContractTools";
import { Kicker, Toast, useToast } from "@/components/ui";
import type { AgreementInput } from "@/lib/contract.mjs";

export function ContractsDesk({ maxUsageDays, maxExclusivityDays, creator }: { maxUsageDays: number | null; maxExclusivityDays: number | null; creator: NonNullable<AgreementInput["creator"]> }) {
  const [mode, setMode] = useState<"check" | "make">("check");
  const [toast, showToast] = useToast();
  const tabs: Array<["check" | "make", string, string]> = [
    ["check", "Check a contract", "Paste the brand's contract. Risky clauses are flagged with the exact line and what to ask for instead."],
    ["make", "Make an agreement", "A plain one-page agreement from your deal terms. Fixed template, no AI writing legal text."],
  ];

  return (
    <div className="mx-auto max-w-4xl px-5 pb-24 pt-28 sm:px-8">
      <Kicker>Contracts</Kicker>
      <h1 className="mt-3 font-serif text-5xl tracking-tight sm:text-6xl">Read the fine print before you sign it.</h1>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {tabs.map(([id, title, body]) => (
          <button key={id} type="button" onClick={() => setMode(id)} className={`rounded-3xl p-5 text-left transition ${mode === id ? "bg-[#f6f1e8] text-[#14110e]" : "border border-white/10 bg-white/[0.03] hover:border-white/25"}`}>
            <p className="font-semibold">{title}</p>
            <p className={`mt-1 text-sm ${mode === id ? "text-[#14110e]/60" : "text-[#f6f1e8]/50"}`}>{body}</p>
          </button>
        ))}
      </div>
      <div className="mt-6 rounded-3xl bg-[#f6f1e8] p-5 text-[#14110e] sm:p-7">
        {mode === "check" ? (
          <ContractChecker
            maxUsageDays={maxUsageDays}
            maxExclusivityDays={maxExclusivityDays}
            onUseInReply={(text) => navigator.clipboard?.writeText(text).then(() => showToast("Reply copied. Paste it to the brand."), () => undefined)}
          />
        ) : (
          <AgreementBuilder initial={{ creator, deal: { usageDays: maxUsageDays ?? 30, exclusivityDays: 0, advancePercent: 50, gstRate: creator.gstin ? 18 : 0 } }} />
        )}
      </div>
      <p className="mt-4 text-xs text-[#f6f1e8]/40">Not legal advice. Have a lawyer review anything large before you sign.</p>
      <Toast message={toast} />
    </div>
  );
}
