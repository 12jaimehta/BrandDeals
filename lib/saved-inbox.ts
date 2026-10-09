import type { SupabaseClient } from "@supabase/supabase-js";
import { CONVERSATION_COLUMNS, deskConversationFrom, type ConversationRow, type DeskConversation } from "@/lib/deal-rows";
import { createClient } from "@/lib/supabase/server";

export type { DeskConversation };

export async function loadSavedConversations(client?: SupabaseClient, userId?: string): Promise<DeskConversation[]> {
  try {
    const supabase = client ?? (await createClient());
    let query = supabase.from("conversations").select(CONVERSATION_COLUMNS).order("received_at", { ascending: false }).limit(80);
    if (userId) query = query.eq("user_id", userId);
    const { data, error } = await query;
    if (error || !data) return [];
    return (data as unknown as ConversationRow[]).flatMap((row) => {
      const conversation = deskConversationFrom(row);
      return conversation ? [conversation] : [];
    });
  } catch {
    return [];
  }
}
