export type AgreementInput = {
  creator?: { name?: string; legalName?: string; address?: string; pan?: string; gstin?: string };
  brand?: { name?: string; contactName?: string; email?: string };
  deal?: {
    campaign?: string | null;
    deliverables?: string[];
    fee?: number | null;
    gstRate?: number;
    advancePercent?: number;
    usageDays?: number | null;
    exclusivityDays?: number | null;
    deadline?: string | null;
  };
  date?: Date | string;
};

export type ContractFlag = {
  id: string;
  severity: "high" | "medium";
  title: string;
  why: string;
  ask: string;
  quote: string | null;
};

export function buildAgreement(input: AgreementInput): string;
export function scanContract(text: string, limits?: { maxUsageDays?: number | null; maxExclusivityDays?: number | null }): ContractFlag[];
export function sentences(text: string): string[];
