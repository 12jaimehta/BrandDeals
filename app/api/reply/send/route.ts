import { NextResponse } from "next/server";
import { publicConfig, secretKey } from "@/lib/config";
import { appendSent, loadThread, logAction, sendOnThread } from "@/lib/channels";
import { createAdminClient } from "@/lib/supabase/admin";
import { getViewer } from "@/lib/viewer";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!publicConfig().configured) {
    return NextResponse.json({ error: "Add the Supabase URL and key before sending." }, { status: 400 });
  }
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!secretKey()) {
    return NextResponse.json({ error: "Add SUPABASE_SECRET_KEY so the server can use the saved connection." }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as { id?: string; text?: string; kind?: string } | null;
  const text = body?.text?.trim() ?? "";
  if (!body?.id || !text) {
    return NextResponse.json({ error: "Choose a thread and approve the reply first." }, { status: 400 });
  }
  if (text.length > 4000) {
    return NextResponse.json({ error: "Keep the reply under 4,000 characters." }, { status: 400 });
  }

  const admin = createAdminClient();
  const thread = await loadThread(admin, body.id);
  if (!thread || thread.user_id !== viewer.id) {
    return NextResponse.json({ error: "Couldn't find that thread. Sync again, then retry." }, { status: 404 });
  }

  try {
    const channel = await sendOnThread(admin, thread, text);
    const at = new Date().toISOString();
    await appendSent(admin, thread, text, at);
    await logAction(admin, {
      userId: viewer.id,
      conversationId: thread.id,
      kind: body.kind ? `approved_${body.kind}`.slice(0, 40) : "approved_reply",
      status: "sent",
      channel,
      text,
      reason: "You approved and sent this.",
    }).catch(() => undefined);
    return NextResponse.json({ at, channel });
  } catch (sendError) {
    const message = sendError instanceof Error ? sendError.message : "The reply was not sent.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
