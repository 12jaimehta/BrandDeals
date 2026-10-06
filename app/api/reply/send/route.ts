import { NextResponse } from "next/server";
import { publicConfig, secretKey } from "@/lib/config";
import { freshAccessToken, sendGmailReply } from "@/lib/gmail";
import {
  instagramThreadSender,
  refreshInstagramToken,
  sendInstagramMessage,
} from "@/lib/instagram";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!publicConfig().configured) {
    return NextResponse.json({ error: "Add the Supabase URL and key before sending." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims as { sub?: string } | undefined;
  if (error || !claims?.sub) {
    return NextResponse.json({ error: "Sign in with Google first." }, { status: 401 });
  }
  if (!secretKey()) {
    return NextResponse.json(
      { error: "Add SUPABASE_SECRET_KEY so the server can use the saved connection." },
      { status: 400 },
    );
  }

  const body = (await request.json().catch(() => null)) as { id?: string; text?: string } | null;
  const text = body?.text?.trim() ?? "";
  if (!body?.id || !text) {
    return NextResponse.json({ error: "Choose a thread and approve the reply first." }, { status: 400 });
  }
  if (text.length > 4000) {
    return NextResponse.json({ error: "Keep the reply under 4,000 characters." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: thread, error: threadError } = await admin
    .from("conversations")
    .select("id, user_id, source, external_id, from_handle, subject")
    .eq("id", body.id)
    .maybeSingle();

  if (threadError || !thread || thread.user_id !== claims.sub) {
    return NextResponse.json({ error: "Couldn't find that thread. Sync again, then retry." }, { status: 404 });
  }

  try {
    if (thread.source === "gmail") {
      const { data: connection } = await admin
        .from("gmail_connections")
        .select("user_id, access_token, refresh_token, expires_at")
        .eq("user_id", claims.sub)
        .maybeSingle();
      if (!connection?.access_token) {
        return NextResponse.json({ error: "Gmail is not connected. Sign in with Google again." }, { status: 400 });
      }
      const accessToken = await freshAccessToken(connection, async (next) => {
        await admin
          .from("gmail_connections")
          .update({ access_token: next.access_token, expires_at: next.expires_at, updated_at: new Date().toISOString() })
          .eq("user_id", claims.sub);
      });
      await sendGmailReply(accessToken, {
        threadId: thread.external_id,
        to: thread.from_handle,
        subject: thread.subject ?? "",
        body: text,
      });
      return NextResponse.json({ at: new Date().toISOString(), channel: "gmail" });
    }

    if (thread.source === "instagram") {
      const { data: connection } = await admin
        .from("instagram_connections")
        .select("user_id, access_token, expires_at")
        .eq("user_id", claims.sub)
        .maybeSingle();
      if (!connection?.access_token) {
        return NextResponse.json({ error: "Connect Instagram first." }, { status: 400 });
      }
      let accessToken = connection.access_token as string;
      const expires = connection.expires_at ? new Date(connection.expires_at).getTime() : 0;
      if (!expires || expires < Date.now() + 7 * 24 * 60 * 60 * 1000) {
        const refreshed = await refreshInstagramToken(accessToken);
        accessToken = refreshed.accessToken;
        await admin
          .from("instagram_connections")
          .update({
            access_token: refreshed.accessToken,
            expires_at: refreshed.expiresAt,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", claims.sub);
      }
      const recipient = await instagramThreadSender(accessToken, thread.external_id);
      await sendInstagramMessage(accessToken, recipient, text);
      return NextResponse.json({ at: new Date().toISOString(), channel: "instagram" });
    }

    return NextResponse.json({ error: "This thread can't be sent from here." }, { status: 400 });
  } catch (sendError) {
    const message = sendError instanceof Error ? sendError.message : "The reply was not sent.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
