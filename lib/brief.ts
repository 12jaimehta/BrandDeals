import { CATEGORIES, detectCategories } from "@/lib/agent.mjs";
import { formatINR, listGaps, type Extraction } from "@/lib/read-deal.mjs";

export type Brief = {
  brandName: string;
  contactName: string;
  email: string;
  campaign: string;
  reels: number;
  stories: number;
  posts: number;
  otherDeliverables: string;
  budget: number | null;
  usageDays: number | null;
  exclusivityDays: number | null;
  deadline: string | null;
  payment: string;
  category: string;
  message: string;
};

export const PAYMENT_OPTIONS = ["100% advance", "50% advance", "Net 15 after going live", "Net 30 after going live", "Net 45 after going live"];

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function count(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.min(50, Math.round(number)) : 0;
}

function optional(value: unknown, max: number) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.min(max, Math.round(number)) : null;
}

export function cleanBrief(input: unknown): { brief: Brief | null; error: string | null } {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const brief: Brief = {
    brandName: text(raw.brandName, 80),
    contactName: text(raw.contactName, 80),
    email: text(raw.email, 200).toLowerCase(),
    campaign: text(raw.campaign, 120),
    reels: count(raw.reels),
    stories: count(raw.stories),
    posts: count(raw.posts),
    otherDeliverables: text(raw.otherDeliverables, 200),
    budget: optional(raw.budget, 100000000),
    usageDays: optional(raw.usageDays, 3650),
    exclusivityDays: optional(raw.exclusivityDays, 3650),
    deadline: typeof raw.deadline === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.deadline) ? raw.deadline : null,
    payment: PAYMENT_OPTIONS.includes(String(raw.payment)) ? String(raw.payment) : "",
    category: CATEGORIES.some((category) => category.id === raw.category) ? String(raw.category) : "",
    message: typeof raw.message === "string" ? raw.message.trim().slice(0, 2000) : "",
  };
  if (!brief.brandName) return { brief: null, error: "Add the brand name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(brief.email)) return { brief: null, error: "Add a work email so the creator can reply." };
  if (!brief.reels && !brief.stories && !brief.posts && !brief.otherDeliverables) return { brief: null, error: "Say what you'd like the creator to make." };
  return { brief, error: null };
}

export function briefDeliverables(brief: Brief) {
  const list: string[] = [];
  if (brief.reels) list.push(`${brief.reels} ${brief.reels === 1 ? "Reel" : "Reels"}`);
  if (brief.stories) list.push(`${brief.stories} ${brief.stories === 1 ? "Story" : "Stories"}`);
  if (brief.posts) list.push(`${brief.posts} ${brief.posts === 1 ? "Post" : "Posts"}`);
  if (brief.otherDeliverables) list.push(brief.otherDeliverables);
  return list;
}

export function briefText(brief: Brief) {
  const lines = [
    `Brief from ${brief.contactName || brief.brandName} at ${brief.brandName}${brief.campaign ? ` for ${brief.campaign}` : ""}.`,
    `Deliverables: ${briefDeliverables(brief).join(", ")}.`,
    `Budget: ${brief.budget != null ? formatINR(brief.budget) : "not stated"}.`,
    `Usage rights: ${brief.usageDays != null ? `${brief.usageDays} days` : "not stated"}.`,
    `Exclusivity: ${brief.exclusivityDays != null ? (brief.exclusivityDays === 0 ? "none" : `${brief.exclusivityDays} days`) : "not stated"}.`,
    `Go-live by: ${brief.deadline ?? "not stated"}.`,
    `Payment: ${brief.payment || "not stated"}.`,
  ];
  if (brief.message) lines.push("", brief.message);
  return lines.join("\n");
}

export function briefExtraction(brief: Brief): { extraction: Extraction; category: string | null } {
  const extraction: Extraction = {
    isBrandOpportunity: true,
    detectionReason: "Submitted on your deal link.",
    brand: brief.brandName,
    campaign: brief.campaign || null,
    offerAmount: brief.budget,
    offerApproximate: false,
    deliverables: briefDeliverables(brief),
    deadline: brief.deadline,
    usageRightsDays: brief.usageDays,
    usageVia: brief.usageDays != null ? "usage rights" : null,
    exclusivityDays: brief.exclusivityDays,
    payment: brief.payment || null,
    notes: [],
    gaps: [],
  };
  extraction.gaps = listGaps(extraction);
  const category = brief.category || detectCategories(`${brief.brandName} ${brief.campaign} ${brief.message}`)[0] || null;
  return { extraction, category };
}
