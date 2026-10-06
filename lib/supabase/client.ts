import { createBrowserClient } from "@supabase/ssr";
import { publicConfig } from "@/lib/config";

export function createClient() {
  const { url, key, configured } = publicConfig();
  if (!configured) {
    throw new Error("Supabase is not configured.");
  }
  return createBrowserClient(url, key);
}
