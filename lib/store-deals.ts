import type { SupabaseClient } from "@supabase/supabase-js";
import { detectCategories } from "@/lib/agent.mjs";
import { EMPTY_META, metaFrom, type DealRow, type DeskConversation, type Reader } from "@/lib/deal-rows";
import type { Conversation, Extraction } from "@/lib/read-deal.mjs";

export type StoredReading = {
  conversation: Conversation;
  extraction: Extraction;
  reader: Reader;
};

function textOf(conversation: Conversation) {
  return `${conversation.subject}\n${conversation.messages.map((message) => message.text).join("\n")}`;
}

export async function storeReadings(client: SupabaseClient, userId: string, readings: StoredReading[]): Promise<DeskConversation[]> {
  const stored: DeskConversation[] = [];

  for (const item of readings) {
    const source = item.conversation.source;
    const externalId = item.conversation.id.replace(new RegExp(`^${source}:`), "");
    const { data: saved, error } = await client
      .from("conversations")
      .upsert(
        {
          user_id: userId,
          source,
          external_id: externalId,
          from_name: item.conversation.fromName,
          from_handle: item.conversation.fromHandle,
          subject: item.conversation.subject,
          received_at: item.conversation.receivedAt,
          messages: item.conversation.messages,
        },
        { onConflict: "user_id,source,external_id" },
      )
      .select("id")
      .single();
    if (error || !saved) continue;

    const category = item.extraction.isBrandOpportunity ? detectCategories(textOf(item.conversation))[0] ?? null : null;
    const row = {
      conversation_id: saved.id,
      user_id: userId,
      is_brand_opportunity: item.extraction.isBrandOpportunity,
      detection_reason: item.extraction.detectionReason,
      brand: item.extraction.brand,
      campaign: item.extraction.campaign,
      offer_amount: item.extraction.offerAmount,
      offer_approximate: item.extraction.offerApproximate,
      deliverables: item.extraction.deliverables,
      deadline: item.extraction.deadline,
      usage_rights_days: item.extraction.usageRightsDays,
      usage_via: item.extraction.usageVia,
      exclusivity_days: item.extraction.exclusivityDays,
      payment: item.extraction.payment,
      notes: item.extraction.notes,
      reader: item.reader,
      updated_at: new Date().toISOString(),
    };
    let deal = await client.from("deals").upsert({ ...row, category }).select("*").single();
    if (deal.error) deal = await client.from("deals").upsert(row).select("*").single();

    stored.push({
      ...item.conversation,
      id: saved.id,
      extraction: item.extraction,
      reader: item.reader,
      meta: deal.data ? metaFrom(deal.data as DealRow) : { ...EMPTY_META, category },
    });
  }

  return stored.length
    ? stored
    : readings.map((item) => ({ ...item.conversation, extraction: item.extraction, reader: item.reader, meta: EMPTY_META }));
}
