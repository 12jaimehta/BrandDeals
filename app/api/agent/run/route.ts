import { NextResponse } from "next/server";
import { secretKey } from "@/lib/config";
import { runAutopilot } from "@/lib/autopilot";
import { createAdminClient } from "@/lib/supabase/admin";
import { getViewer } from "@/lib/viewer";

export const runtime = "nodejs";

export async function POST() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!secretKey()) return NextResponse.json({ error: "Add SUPABASE_SECRET_KEY so the agent can use your connections." }, { status: 400 });
  try {
    return NextResponse.json(await runAutopilot(createAdminClient(), viewer.id, viewer.email));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Autopilot did not run." }, { status: 500 });
  }
}
