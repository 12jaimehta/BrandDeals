export type DealSource = "gmail" | "instagram";

export type DealMessage = {
  from: "them" | "you";
  at: string;
  text: string;
};

export type Conversation = {
  id: string;
  source: DealSource;
  fromName: string;
  fromHandle: string;
  subject: string;
  receivedAt: string;
  messages: DealMessage[];
};

export type Extraction = {
  isBrandOpportunity: boolean;
  detectionReason: string;
  brand: string | null;
  campaign: string | null;
  offerAmount: number | null;
  offerApproximate: boolean;
  deliverables: string[];
  deadline: string | null;
  usageRightsDays: number | null;
  usageVia: string | null;
  exclusivityDays: number | null;
  payment: string | null;
  notes: string[];
  gaps: string[];
};

export type RateRules = {
  usageIncludedDays: number;
  usageUpliftPer30Days: number;
  exclusivityUpliftPer30Days: number;
  minimumOffer: number;
};

export type Advice = {
  extraDays: number;
  blocks: number;
  usageAmount: number;
  exclusivityBlocks: number;
  exclusivityAmount: number;
  suggestedOffer: number | null;
};

export const CONVERSATIONS: Conversation[];
export const DEFAULT_RULES: RateRules;
export function extractDeal(conversation: Conversation): Extraction;
export function buildAdvice(extraction: Extraction, rules: RateRules): Advice;
export function belowMinimum(extraction: Extraction, minimumOffer: number): boolean;
export function suggestedMinimum(): null;
export function recommendedWaitDays(conversation: Conversation): number;
export function suggestedReply(conversation: Conversation, extraction: Extraction, advice: Advice, rules?: RateRules): string;
export function formatINR(amount: number): string;
export function formatDate(value: string): string;
export function formatWhen(value: string): string;
export function daysUntil(iso: string): number;
export function addDays(count: number): Date;
export function toISODate(date: Date): string;
export function listGaps(extraction: Extraction): string[];
