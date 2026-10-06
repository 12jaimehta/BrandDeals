import { createClient } from "@supabase/supabase-js";
import { publicConfig, secretKey } from "@/lib/config";

export function createAdminClient() {
  const { url } = publicConfig();
  const key = secretKey();
  if (!url || !key) throw new Error("Supabase secret key is missing.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
