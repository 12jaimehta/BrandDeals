import type { SupabaseClient } from "@supabase/supabase-js";
import { freshAccessToken, sendGmailReply } from "@/lib/gmail";
import { instagramThreadSender, refreshInstagramToken, sendInstagramMessage } from "@/lib/instagram";
import { asMessages } from "@/lib/deal-rows";

export type ThreadRow = {
  id: string;
  user_id: string;
  source: string;
  external_id: string;
  from_handle: string | null;
  subject: string | null;
  messages?: unknown;
  contact_email?: string | null;
};

export async function gmailToken(admin: SupabaseClient, userId: string) {
  const { data: connection } = await admin
    .from("gmail_connections")
    .select("user_id, access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (!connection?.access_token) throw new Error("Gmail is not connected. Connect Gmail to send from the desk.");
  return freshAccessToken(connection, async (next) => {
    await admin
      .from("gmail_connections")
      .update({ access_token: next.access_token, expires_at: next.expires_at, updated_at: new Date().toISOString() })
      .eq("user_id", userId);
  });
}

export async function instagramToken(admin: SupabaseClient, userId: string) {
  const { data: connection } = await admin
    .from("instagram_connections")
    .select("user_id, access_token, expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (!connection?.access_token) throw new Error("Connect Instagram first.");
  let accessToken = connection.access_token as string;
  const expires = connection.expires_at ? new Date(connection.expires_at).getTime() : 0;
  if (!expires || expires < Date.now() + 7 * 24 * 60 * 60 * 1000) {
    const refreshed = await refreshInstagramToken(accessToken);
    accessToken = refreshed.accessToken;
    await admin
      .from("instagram_connections")
      .update({ access_token: refreshed.accessToken, expires_at: refreshed.expiresAt, updated_at: new Date().toISOString() })
      .eq("user_id", userId);
  }
  return accessToken;
}

export async function sendEmail(admin: SupabaseClient, userId: string, input: { to: string; subject: string; body: string; threadId?: string }) {
  const token = await gmailToken(admin, userId);
  await sendGmailReply(token, input);
}

export async function loadThread(admin: SupabaseClient, conversationId: string): Promise<ThreadRow | null> {
  const { data } = await admin
    .from("conversations")
    .select("id, user_id, source, external_id, from_handle, subject, messages, deals(contact_email)")
    .eq("id", conversationId)
    .maybeSingle();
  if (!data) return null;
  const deal = (Array.isArray(data.deals) ? data.deals[0] : data.deals) as { contact_email?: string | null } | null;
  return { ...(data as ThreadRow), contact_email: deal?.contact_email ?? null };
}

// Sends on the channel the brand used. Deal-link briefs are answered by email.
export async function sendOnThread(admin: SupabaseClient, thread: ThreadRow, text: string) {
  if (thread.source === "gmail") {
    await sendEmail(admin, thread.user_id, { threadId: thread.external_id, to: thread.from_handle ?? "", subject: thread.subject ?? "", body: text });
    return "gmail" as const;
  }
  if (thread.source === "link") {
    const to = thread.contact_email || thread.from_handle || "";
    if (!to.includes("@")) throw new Error("This brief has no email to reply to.");
    const subject = thread.subject ? `Re: ${thread.subject}` : "Re: your collaboration brief";
    await sendEmail(admin, thread.user_id, { to, subject, body: text });
    return "gmail" as const;
  }
  if (thread.source === "instagram") {
    const token = await instagramToken(admin, thread.user_id);
    const recipient = await instagramThreadSender(token, thread.external_id);
    await sendInstagramMessage(token, recipient, text);
    return "instagram" as const;
  }
  throw new Error("This thread can't be sent from here.");
}

export async function appendSent(admin: SupabaseClient, thread: ThreadRow, text: string, at = new Date().toISOString()) {
  const messages = [...asMessages(thread.messages), { from: "you" as const, at, text }];
  await admin.from("conversations").update({ messages, received_at: at }).eq("id", thread.id);
  return messages;
}

export async function logAction(
  admin: SupabaseClient,
  entry: { userId: string; conversationId?: string | null; invoiceId?: string | null; kind: string; status: "sent" | "skipped" | "failed"; channel?: string | null; text?: string; reason?: string },
) {
  await admin.from("agent_actions").insert({
    user_id: entry.userId,
    conversation_id: entry.conversationId ?? null,
    invoice_id: entry.invoiceId ?? null,
    kind: entry.kind,
    status: entry.status,
    channel: entry.channel ?? null,
    text: entry.text ?? "",
    reason: entry.reason ?? "",
  });
}
