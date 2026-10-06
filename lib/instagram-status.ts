import { secretKey } from "@/lib/config";
import { createAdminClient } from "@/lib/supabase/admin";

export async function hasInstagramConnection(userId: string) {
  if (!secretKey()) return false;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("instagram_connections")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) return false;
    return Boolean(data);
  } catch {
    return false;
  }
}
