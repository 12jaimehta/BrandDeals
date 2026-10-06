import { createClient } from "@/lib/supabase/server";
import type { Conversation, DealMessage, Extraction } from "@/lib/read-deal.mjs";

export type StoredConversation = Conversation & {
  extraction: Extraction;
  reader: "rules" | "openai";
};

type DealRow = {
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
  reader: "rules" | "openai" | null;
};

function asMessages(value: unknown): DealMessage[] {
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

function dealFrom(row: DealRow | DealRow[] | null): { extraction: Extraction; reader: "rules" | "openai" } | null {
  const deal = Array.isArray(row) ? row[0] : row;
  if (!deal) return null;
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
  return { extraction, reader: deal.reader === "openai" ? "openai" : "rules" };
}

export async function loadSavedConversations(): Promise<StoredConversation[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("conversations")
      .select("id, source, from_name, from_handle, subject, received_at, messages, deals(*)")
      .order("received_at", { ascending: false })
      .limit(40);
    if (error || !data) return [];

    return data.flatMap((row) => {
      const messages = asMessages(row.messages);
      const reading = dealFrom(row.deals as DealRow | DealRow[] | null);
      if (!reading || (row.source !== "gmail" && row.source !== "instagram")) return [];
      return [{
        id: row.id as string,
        source: row.source,
        fromName: (row.from_name as string) || "",
        fromHandle: (row.from_handle as string) || "",
        subject: (row.subject as string) || "",
        receivedAt: row.received_at as string,
        messages,
        extraction: reading.extraction,
        reader: reading.reader,
      }];
    });
  } catch {
    return [];
  }
}
