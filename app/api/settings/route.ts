import { NextResponse } from "next/server";
import { cleanSettings, loadSettings, saveSettings } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  return NextResponse.json(await loadSettings(await createClient(), viewer.id));
}

export async function PUT(request: Request) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const settings = cleanSettings(await request.json().catch(() => null));
  try {
    await saveSettings(await createClient(), viewer.id, settings);
    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Your settings were not saved." }, { status: 400 });
  }
}
