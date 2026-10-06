import { createClient } from "@/lib/supabase/server";
import type { Conversation, Extraction } from "@/lib/read-deal.mjs";

export type StoredReading = {
  conversation: Conversation;
  extraction: Extraction;
  reader: "rules" | "openai";
};

export async function storeReadings(userId: string, readings: StoredReading[]) {
  const supabase = await createClient();
  const stored: Array<Conversation & { extraction: Extraction; reader: "rules" | "openai" }> = [];

  for (const item of readings) {
    const source = item.conversation.source;
    const externalId = item.conversation.id.replace(new RegExp(`^${source}:`), "");
    const { data: saved, error } = await supabase
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

    await supabase.from("deals").upsert({
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
    });

    stored.push({
      ...item.conversation,
      id: saved.id,
      extraction: item.extraction,
      reader: item.reader,
    });
  }

  return stored.length
    ? stored
    : readings.map((item) => ({
        ...item.conversation,
        extraction: item.extraction,
        reader: item.reader,
      }));
}
