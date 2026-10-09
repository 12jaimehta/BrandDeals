import { listGaps, type Conversation, type DealMessage, type DealSource, type Extraction } from "@/lib/read-deal.mjs";

export type Reader = "rules" | "openai" | "form";
export type DealStatus = "open" | "won" | "lost";

export type DealMeta = {
  status: DealStatus;
  category: string | null;
  contactEmail: string | null;
  agreedFee: number | null;
  followUpOn: string | null;
  followedUp: boolean;
  dismissed: boolean;
  closedAt: string | null;
};

export type DeskConversation = Conversation & {
  extraction: Extraction;
  reader: Reader;
  meta: DealMeta;
};

export type DealRow = {
  is_brand_opportunity: boolean;
  detection_reason: string | null;
  brand: string | null;
  campaign: string | null;
  offer_amount: number | null;
  offer_approximate: boolean | null;
  deliverables: unknown;
  deadline: string | null;
  usage_rights_days: number | null;
  usage_via: string | null;
  exclusivity_days: number | null;
  payment: string | null;
  notes: unknown;
  reader: Reader | null;
  category?: string | null;
  contact_email?: string | null;
  status?: string | null;
  agreed_fee?: number | null;
  follow_up_on?: string | null;
  followed_up?: boolean | null;
  dismissed?: boolean | null;
  closed_at?: string | null;
};

export type ConversationRow = {
  id: string;
  source: string;
  external_id?: string;
  from_name: string | null;
  from_handle: string | null;
  subject: string | null;
  received_at: string;
  messages: unknown;
  deals?: DealRow | DealRow[] | null;
};

export const CONVERSATION_COLUMNS = "id, source, external_id, from_name, from_handle, subject, received_at, messages, deals(*)";

export const EMPTY_META: DealMeta = {
  status: "open",
  category: null,
  contactEmail: null,
  agreedFee: null,
  followUpOn: null,
  followedUp: false,
  dismissed: false,
  closedAt: null,
};

export function asMessages(value: unknown): DealMessage[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const message = item as DealMessage;
    if ((message.from !== "them" && message.from !== "you") || typeof message.text !== "string") return [];
    return [{ from: message.from, at: message.at || new Date().toISOString(), text: message.text }];
  });
}

function asStrings(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function isSource(value: string): value is DealSource {
  return value === "gmail" || value === "instagram" || value === "link";
}

export function extractionFrom(deal: DealRow): Extraction {
  const extraction: Extraction = {
    isBrandOpportunity: Boolean(deal.is_brand_opportunity),
    detectionReason: deal.detection_reason || "",
    brand: deal.brand,
    campaign: deal.campaign,
    offerAmount: deal.offer_amount,
    offerApproximate: Boolean(deal.offer_approximate),
    deliverables: asStrings(deal.deliverables),
    deadline: deal.deadline,
    usageRightsDays: deal.usage_rights_days,
    usageVia: deal.usage_via,
    exclusivityDays: deal.exclusivity_days,
    payment: deal.payment,
    notes: asStrings(deal.notes),
    gaps: [],
  };
  extraction.gaps = extraction.isBrandOpportunity ? listGaps(extraction) : [];
  return extraction;
}

export function metaFrom(deal: DealRow): DealMeta {
  const status = deal.status === "won" || deal.status === "lost" ? deal.status : "open";
  return {
    status,
    category: deal.category ?? null,
    contactEmail: deal.contact_email ?? null,
    agreedFee: deal.agreed_fee ?? null,
    followUpOn: deal.follow_up_on ?? null,
    followedUp: Boolean(deal.followed_up),
    dismissed: Boolean(deal.dismissed),
    closedAt: deal.closed_at ?? null,
  };
}

export function readerOf(deal: DealRow): Reader {
  return deal.reader === "openai" || deal.reader === "form" ? deal.reader : "rules";
}

export function deskConversationFrom(row: ConversationRow): DeskConversation | null {
  const deal = Array.isArray(row.deals) ? row.deals[0] : row.deals;
  if (!deal || !isSource(row.source)) return null;
  return {
    id: row.id,
    source: row.source,
    fromName: row.from_name || "",
    fromHandle: row.from_handle || "",
    subject: row.subject || "",
    receivedAt: row.received_at,
    messages: asMessages(row.messages),
    extraction: extractionFrom(deal),
    reader: readerOf(deal),
    meta: metaFrom(deal),
  };
}

export function isMissingTable(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false;
  return error.code === "PGRST205" || error.code === "42P01" || /could not find the table|does not exist/i.test(error.message ?? "");
}
