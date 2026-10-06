import { publicConfig } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";

export async function getViewer() {
  if (!publicConfig().configured) return null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();
    const claims = data?.claims as { sub?: string; email?: string } | undefined;
    if (error || !claims?.sub) return null;
    return { id: claims.sub, email: claims.email ?? null };
  } catch {
    return null;
  }
}
