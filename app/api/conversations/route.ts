import { NextResponse } from "next/server";
import { loadDeskData } from "@/lib/desk-data";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  return NextResponse.json(await loadDeskData(await createClient(), viewer.id));
}
