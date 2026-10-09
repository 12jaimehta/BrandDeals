import type { SupabaseClient } from "@supabase/supabase-js";
import { gmailToken, instagramToken } from "@/lib/channels";
import { isMissingTable } from "@/lib/deal-rows";
import { fetchRecentThreads } from "@/lib/gmail";
import { fetchInstagramConversations, instagramProfile } from "@/lib/instagram";
import type { Conversation } from "@/lib/read-deal.mjs";
import { readConversation } from "@/lib/read-with-model";
import { storeReadings } from "@/lib/store-deals";

async function mapPool<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>) {
  const results = new Array<R>(items.length);
  let index = 0;
  async function run() {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await worker(items[current]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => run()));
  return results;
}

async function readAndStore(client: SupabaseClient, userId: string, conversations: Conversation[]) {
  const readings = await mapPool(conversations, 3, async (conversation) => ({
    conversation,
    ...(await readConversation(conversation)),
  }));
  const visible = await storeReadings(client, userId, readings);
  return {
    conversations: visible,
    brandDeals: visible.filter((item) => item.extraction.isBrandOpportunity).length,
    modelErrors: readings.filter((item) => item.modelError).length,
  };
}

export async function syncGmail(client: SupabaseClient, admin: SupabaseClient, userId: string, email: string | null) {
  const probe = await admin.from("gmail_connections").select("user_id").eq("user_id", userId).maybeSingle();
  if (isMissingTable(probe.error)) {
    throw new Error("The database tables are not created yet. In Supabase, run supabase/migrations/0001_inbox.sql, then sign in again.");
  }
  if (!probe.data) throw new Error("Gmail is not connected yet. Connect Gmail and allow inbox access.");
  const token = await gmailToken(admin, userId);
  const conversations = await fetchRecentThreads(token, email);
  return readAndStore(client, userId, conversations);
}

export async function syncInstagram(client: SupabaseClient, admin: SupabaseClient, userId: string) {
  const { data: connection, error } = await admin
    .from("instagram_connections")
    .select("instagram_user_id, username")
    .eq("user_id", userId)
    .maybeSingle();
  if (isMissingTable(error)) throw new Error("Run supabase/migrations/0002_instagram.sql in the Supabase SQL editor, then connect Instagram again.");
  if (!connection) throw new Error("Connect Instagram first. The account has to be a professional account.");
  const token = await instagramToken(admin, userId);
  const profile = await instagramProfile(token);
  const conversations = await fetchInstagramConversations(token, {
    ...profile,
    user_id: profile.user_id || connection.instagram_user_id,
    username: profile.username || connection.username,
  });
  return readAndStore(client, userId, conversations);
}
