import { NextResponse } from "next/server";
import { publicConfig, secretKey } from "@/lib/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { syncGmail } from "@/lib/sync";
import { getViewer } from "@/lib/viewer";

export const runtime = "nodejs";

export async function POST() {
  if (!publicConfig().configured) {
    return NextResponse.json({ error: "Add the Supabase URL and key before connecting Gmail." }, { status: 400 });
  }
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!secretKey()) {
    return NextResponse.json({ error: "Add SUPABASE_SECRET_KEY so the server can use the Gmail token." }, { status: 400 });
  }
  try {
    const result = await syncGmail(await createClient(), createAdminClient(), viewer.id, viewer.email);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gmail sync failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
