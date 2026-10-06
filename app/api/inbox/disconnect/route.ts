import { NextResponse } from "next/server";
import { secretKey } from "@/lib/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { getViewer } from "@/lib/viewer";

const channels = new Set(["outlook", "x", "whatsapp", "messenger"]);

export async function POST(request: Request) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!secretKey()) return NextResponse.json({ error: "We couldn't update the connection. Please try again." }, { status: 500 });

  const body = await request.json().catch(() => null) as { id?: string } | null;
  const id = body?.id ?? "";
  if (id !== "gmail" && id !== "instagram" && !channels.has(id)) {
    return NextResponse.json({ error: "That inbox can't be disconnected." }, { status: 400 });
  }

  const admin = createAdminClient();
  if (id === "gmail" || id === "instagram") {
    const threads = await admin.from("conversations").delete().eq("user_id", viewer.id).eq("source", id);
    if (threads.error) return NextResponse.json({ error: "Disconnect failed. Please try again." }, { status: 500 });
    const table = id === "gmail" ? "gmail_connections" : "instagram_connections";
    const removed = await admin.from(table).delete().eq("user_id", viewer.id);
    if (removed.error) return NextResponse.json({ error: "Disconnect failed. Please try again." }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const removed = await admin.from("channel_connections").delete().eq("user_id", viewer.id).eq("provider", id);
  if (removed.error) return NextResponse.json({ error: "Disconnect failed. Please try again." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
