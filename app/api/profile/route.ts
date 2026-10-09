import { NextResponse } from "next/server";
import { cleanProfile, EMPTY_PROFILE, loadProfile, saveProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  return NextResponse.json((await loadProfile(await createClient(), viewer.id)) ?? EMPTY_PROFILE);
}

export async function PUT(request: Request) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const profile = cleanProfile(await request.json().catch(() => null));
  try {
    await saveProfile(await createClient(), viewer.id, profile);
    return NextResponse.json(profile);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Your profile was not saved." }, { status: 400 });
  }
}
