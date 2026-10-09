import { NextResponse } from "next/server";
import { instagramConfig, publicConfig, secretKey } from "@/lib/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { syncInstagram } from "@/lib/sync";
import { getViewer } from "@/lib/viewer";

export const runtime = "nodejs";

export async function POST() {
  if (!publicConfig().configured) {
    return NextResponse.json({ error: "Add the Supabase URL and key before connecting Instagram." }, { status: 400 });
  }
  if (!instagramConfig().configured) {
    return NextResponse.json({ error: "Add INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET to .env, then connect Instagram." }, { status: 400 });
  }
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!secretKey()) {
    return NextResponse.json({ error: "Add SUPABASE_SECRET_KEY so the Instagram token can be read." }, { status: 400 });
  }
  try {
    const result = await syncInstagram(await createClient(), createAdminClient(), viewer.id);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Instagram sync failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
