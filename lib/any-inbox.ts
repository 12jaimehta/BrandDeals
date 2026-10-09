import { secretKey } from "@/lib/config";
import { hasGmailConnection } from "@/lib/gmail-status";
import { hasInstagramConnection } from "@/lib/instagram-status";
import { createAdminClient } from "@/lib/supabase/admin";

export async function hasAnyInbox(userId: string) {
  const [gmail, instagram] = await Promise.all([
    hasGmailConnection(userId),
    hasInstagramConnection(userId),
  ]);
  return gmail || instagram;
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
