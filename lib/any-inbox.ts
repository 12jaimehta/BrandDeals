import { secretKey } from "@/lib/config";
import { hasGmailConnection } from "@/lib/gmail-status";
import { hasInstagramConnection } from "@/lib/instagram-status";
import { createAdminClient } from "@/lib/supabase/admin";

export async function hasAnyInbox(userId: string) {
  const [gmail, instagram, channel] = await Promise.all([
    hasGmailConnection(userId),
    hasInstagramConnection(userId),
    hasChannelConnection(userId),
  ]);
  return gmail || instagram || channel;
}

export async function hasProviderConnection(userId: string, provider: string) {
  if (!secretKey()) return false;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("channel_connections")
      .select("provider")
      .eq("user_id", userId)
      .eq("provider", provider)
      .maybeSingle();
    if (error) return false;
    return Boolean(data);
  } catch {
    return false;
  }
}

async function hasChannelConnection(userId: string) {
  if (!secretKey()) return false;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("channel_connections")
      .select("provider")
      .eq("user_id", userId)
      .limit(1);
    if (error) return false;
    return Boolean(data?.length);
  } catch {
    return false;
  }
}
