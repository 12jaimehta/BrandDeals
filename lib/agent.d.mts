import type { Advice, Conversation, Extraction, RateRules } from "./read-deal.mjs";

export type Autopilot = {
  enabled: boolean;
  askBudget: boolean;
  askTerms: boolean;
  followUps: boolean;
  declineBlocked: boolean;
  counter: boolean;
  paymentReminders: boolean;
};

export type Guardrails = RateRules & {
  maxUsageDays: number | null;
  maxExclusivityDays: number | null;
  blockedCategories: string[];
};

export type ActionKind =
  | "decline_blocked"
  | "ask_budget"
  | "ask_terms"
  | "counter"
  | "ready_for_yes"
  | "follow_up"
  | "waiting"
  | "closed";

export type PlannedAction = {
  kind: ActionKind;
  title: string;
  reason: string;
  text: string | null;
  amount: number | null;
  autopilotKey: keyof Autopilot | null;
  needsYou: boolean;
};

export type Category = { id: string; label: string; words: string[] };

export type CounterPlan = {
  target: number | null;
  usageDays: number | null;
  exclusivityDays: number | null;
  usageCapped: boolean;
  exclusivityCapped: boolean;
  belowMinimum: boolean;
  advice: Advice;
};

export const CATEGORIES: Category[];
export const DEFAULT_AUTOPILOT: Autopilot;
export const DEFAULT_GUARDRAILS: Pick<Guardrails, "maxUsageDays" | "maxExclusivityDays" | "blockedCategories">;
export const INSTAGRAM_WINDOW_HOURS: number;
export function detectCategories(text: string): string[];
export function categoryLabel(id: string): string;
export function counterFor(extraction: Extraction, rules: Guardrails): CounterPlan;
export function planDeal(input: {
  conversation: Conversation;
  extraction: Extraction;
  rules: Guardrails;
  category?: string | null;
  status?: "open" | "won" | "lost";
  creatorName?: string;
  now?: Date;
}): PlannedAction | null;
export function canAutoSend(
  planned: PlannedAction | null,
  autopilot: Partial<Autopilot>,
  context?: { source?: string; lastThemAt?: string | null; minimumOffer?: number; now?: Date },
): { ok: boolean; reason: string };
export function lastFromThem(conversation: Conversation): Conversation["messages"][number] | null;
