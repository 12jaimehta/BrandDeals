import type { SupabaseClient } from "@supabase/supabase-js";
import { loadSavedConversations } from "@/lib/saved-inbox";
import type { Activity } from "@/lib/activity";
import type { DeskConversation } from "@/lib/deal-rows";

export type { Activity };


type ActivityRow = {
  id: string;
  conversation_id: string | null;
  invoice_id: string | null;
  kind: string;
  status: "sent" | "skipped" | "failed";
  channel: string | null;
  reason: string | null;
  text: string | null;
  created_at: string;
};

export async function loadActivity(client: SupabaseClient, userId: string, limit = 80): Promise<Activity[]> {
  const { data, error } = await client
    .from("agent_actions")
    .select("id, conversation_id, invoice_id, kind, status, channel, reason, text, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return (data as ActivityRow[]).map((row) => ({
    id: row.id,
    conversationId: row.conversation_id,
    invoiceId: row.invoice_id,
    kind: row.kind,
    status: row.status,
    channel: row.channel,
    reason: row.reason ?? "",
    text: row.text ?? "",
    createdAt: row.created_at,
  }));
}

export async function loadDeskData(client: SupabaseClient, userId: string): Promise<{ conversations: DeskConversation[]; activity: Activity[] }> {
  const [conversations, activity] = await Promise.all([loadSavedConversations(client, userId), loadActivity(client, userId)]);
  return { conversations, activity };
}
