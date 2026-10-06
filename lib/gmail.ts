import type { Conversation, DealMessage } from "@/lib/read-deal.mjs";

type GmailHeader = { name?: string; value?: string };
type GmailPart = {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailPart[];
  headers?: GmailHeader[];
};
type GmailMessage = {
  id?: string;
  internalDate?: string;
  payload?: GmailPart;
};
type GmailThread = { id?: string; messages?: GmailMessage[] };

function decodeBase64Url(data: string) {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf8");
}

function plainText(part: GmailPart | undefined): string {
  if (!part) return "";
  if (part.mimeType === "text/plain" && part.body?.data) return decodeBase64Url(part.body.data);
  for (const child of part.parts ?? []) {
    const text = plainText(child);
    if (text) return text;
  }
  return "";
}

function htmlText(part: GmailPart | undefined): string {
  if (!part) return "";
  if (part.mimeType === "text/html" && part.body?.data) {
    return decodeBase64Url(part.body.data)
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  for (const child of part.parts ?? []) {
    const text = htmlText(child);
    if (text) return text;
  }
  return "";
}

function header(headers: GmailHeader[] | undefined, name: string) {
  return headers?.find((item) => item.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function parseFrom(value: string) {
  const match = value.match(/^\s*"?([^"<]*)"?\s*<([^>]+)>\s*$/);
  if (!match) return { name: value.trim(), email: value.trim() };
  return { name: match[1].trim() || match[2].trim(), email: match[2].trim() };
}

function clip(text: string) {
  const trimmed = text.trim();
  return trimmed.length > 6000 ? `${trimmed.slice(0, 6000).trim()}…` : trimmed;
}

export function threadToConversation(thread: GmailThread, userEmail: string | null): Conversation | null {
  const messages = (thread.messages ?? [])
    .map((message): DealMessage | null => {
      const payload = message.payload;
      const text = clip(plainText(payload) || htmlText(payload));
      if (!text) return null;
      const from = parseFrom(header(payload?.headers, "From"));
      const you = Boolean(userEmail && from.email.toLowerCase() === userEmail.toLowerCase());
      const at = message.internalDate
        ? new Date(Number(message.internalDate)).toISOString()
        : new Date().toISOString();
      return { from: you ? "you" : "them", at, text };
    })
    .filter((message): message is DealMessage => Boolean(message))
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  if (!messages.length || !thread.id) return null;

  const firstThem = (thread.messages ?? []).find((message) => {
    const from = parseFrom(header(message.payload?.headers, "From"));
    return !(userEmail && from.email.toLowerCase() === userEmail.toLowerCase());
  });
  const anchor = firstThem ?? thread.messages?.[0];
  const from = parseFrom(header(anchor?.payload?.headers, "From"));
  const subject = header(anchor?.payload?.headers, "Subject");
  const receivedAt = messages[messages.length - 1]?.at ?? new Date().toISOString();

  return {
    id: `gmail:${thread.id}`,
    source: "gmail",
    fromName: from.name || from.email,
    fromHandle: from.email,
    subject,
    receivedAt,
    messages,
  };
}

type TokenRow = {
  user_id: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
};

export async function freshAccessToken(
  row: TokenRow,
  persist: (next: { access_token: string; expires_at: string }) => Promise<void>,
) {
  const expires = row.expires_at ? new Date(row.expires_at).getTime() : 0;
  if (row.access_token && expires > Date.now() + 60_000) return row.access_token;
  if (!row.refresh_token) {
    throw new Error("Gmail access expired. Sign in with Google again.");
  }
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Gmail access expired. Add the Google client id and secret so it can be refreshed.");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: row.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  const json = (await response.json()) as { access_token?: string; expires_in?: number; error?: string };
  if (!response.ok || !json.access_token) {
    throw new Error(
      json.error === "invalid_grant"
        ? "Gmail access was revoked. Sign in with Google again."
        : "Google did not refresh the Gmail token.",
    );
  }
  const expiresAt = new Date(Date.now() + (json.expires_in ?? 3600) * 1000).toISOString();
  await persist({ access_token: json.access_token, expires_at: expiresAt });
  return json.access_token;
}

export async function fetchRecentThreads(accessToken: string, userEmail: string | null) {  const listUrl = new URL("https://gmail.googleapis.com/gmail/v1/users/me/threads");
  listUrl.searchParams.set("maxResults", "12");
  listUrl.searchParams.set("q", "newer_than:21d -in:chats -in:drafts");
  const listResponse = await fetch(listUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (listResponse.status === 401) throw new Error("Gmail refused the token. Sign in with Google again.");
  if (!listResponse.ok) {
    const body = (await listResponse.json().catch(() => null)) as {
      error?: { message?: string; errors?: { reason?: string }[] };
    } | null;
    const reason = body?.error?.errors?.[0]?.reason;
    if (reason === "accessNotConfigured") {
      throw new Error("Turn on the Gmail API in the same Google Cloud project as the OAuth client, then sync again.");
    }
    if (reason === "insufficientPermissions") {
      throw new Error("This Google sign-in did not include inbox access. Sign in again and allow Gmail to be read.");
    }
    throw new Error("Gmail did not return the inbox.");
  }
  const list = (await listResponse.json()) as { threads?: { id: string }[] };
  const ids = (list.threads ?? []).map((thread) => thread.id).slice(0, 12);

  const threads = await Promise.all(
    ids.map(async (id) => {
      const response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/threads/${id}?format=full`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!response.ok) return null;
      return (await response.json()) as GmailThread;
    }),
  );

  return threads
    .map((thread) => (thread ? threadToConversation(thread, userEmail) : null))
    .filter((conversation): conversation is Conversation => Boolean(conversation));
}

function encodeBase64Url(text: string) {
  return Buffer.from(text, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function sendGmailReply(
  accessToken: string,
  input: { threadId: string; to: string; subject: string; body: string },
) {
  const subject = /^re:/i.test(input.subject.trim())
    ? input.subject.trim()
    : `Re: ${input.subject.trim() || "your message"}`;
  const raw = encodeBase64Url(
    [`To: ${input.to}`, `Subject: ${subject}`, "Content-Type: text/plain; charset=utf-8", "", input.body].join("\r\n"),
  );
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw, threadId: input.threadId }),
  });
  if (response.status === 401) {
    throw new Error("Gmail refused the token. Sign in with Google again.");
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: { message?: string; errors?: { reason?: string }[] };
    } | null;
    if (body?.error?.errors?.[0]?.reason === "insufficientPermissions") {
      throw new Error("This sign-in can't send mail yet. Sign out, sign in with Google again, and allow sending.");
    }
    throw new Error(body?.error?.message?.slice(0, 220) || "Gmail did not send the reply.");
  }
  return (await response.json()) as { id?: string; threadId?: string };
}
