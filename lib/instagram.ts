import type { Conversation, DealMessage } from "@/lib/read-deal.mjs";
import { instagramConfig } from "@/lib/config";

const GRAPH = "https://graph.instagram.com";

type IgProfile = {
  id?: string;
  user_id?: string;
  username?: string;
  name?: string;
  followers_count?: number;
};

type IgActor = { id?: string; username?: string };

type IgMessage = {
  id?: string;
  created_time?: string;
  from?: IgActor;
  message?: string;
};

type TokenPayload = {
  access_token?: string;
  user_id?: string | number;
  data?: { access_token?: string; user_id?: string | number }[];
  error_message?: string;
  error_type?: string;
};

export function instagramAuthorizeUrl(redirectUri: string, state: string) {
  const { appId } = instagramConfig();
  const url = new URL("https://www.instagram.com/oauth/authorize");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "instagram_business_basic,instagram_business_manage_messages");
  url.searchParams.set("state", state);
  url.searchParams.set("force_reauth", "true");
  return url.toString();
}

export async function exchangeInstagramCode(code: string, redirectUri: string) {
  const { appId, appSecret } = instagramConfig();
  const response = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code,
    }),
  });
  const body = (await response.json()) as TokenPayload;
  const token = body.access_token || body.data?.[0]?.access_token;
  const userId = body.user_id || body.data?.[0]?.user_id;
  if (!response.ok || !token) {
    throw new Error(body.error_message || "Instagram did not return an access token.");
  }
  const longLived = await exchangeLongLivedToken(token);
  return {
    accessToken: longLived.accessToken,
    expiresAt: longLived.expiresAt,
    instagramUserId: String(userId ?? ""),
  };
}

async function exchangeLongLivedToken(shortToken: string) {
  const { appSecret } = instagramConfig();
  const url = new URL(`${GRAPH}/access_token`);
  url.searchParams.set("grant_type", "ig_exchange_token");
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("access_token", shortToken);
  const response = await fetch(url);
  const body = (await response.json()) as { access_token?: string; expires_in?: number; error?: { message?: string } };
  if (!response.ok || !body.access_token) {
    return {
      accessToken: shortToken,
      expiresAt: new Date(Date.now() + 55 * 60 * 1000).toISOString(),
    };
  }
  const seconds = body.expires_in ?? 60 * 24 * 60 * 60;
  return {
    accessToken: body.access_token,
    expiresAt: new Date(Date.now() + seconds * 1000).toISOString(),
  };
}

export async function refreshInstagramToken(accessToken: string) {
  const url = new URL(`${GRAPH}/refresh_access_token`);
  url.searchParams.set("grant_type", "ig_refresh_token");
  url.searchParams.set("access_token", accessToken);
  const response = await fetch(url);
  const body = (await response.json()) as { access_token?: string; expires_in?: number; error?: { message?: string } };
  if (!response.ok || !body.access_token) {
    throw new Error("Instagram access expired. Connect Instagram again.");
  }
  const seconds = body.expires_in ?? 60 * 24 * 60 * 60;
  return {
    accessToken: body.access_token,
    expiresAt: new Date(Date.now() + seconds * 1000).toISOString(),
  };
}

async function igGet<T>(path: string, token: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${GRAPH}/${path.replace(/^\//, "")}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  url.searchParams.set("access_token", token);
  const response = await fetch(url);
  const body = (await response.json()) as T & { error?: { message?: string; code?: number } };
  if (!response.ok) {
    const message = body.error?.message || "Instagram did not answer.";
    if (body.error?.code === 190) throw new Error("Instagram access expired. Connect Instagram again.");
    if (/permission|not authorized|professional account/i.test(message)) {
      throw new Error("Instagram refused message access. Use a professional account that is a tester on your Meta app.");
    }
    throw new Error(message.slice(0, 220));
  }
  return body;
}

export async function instagramProfile(token: string) {
  return igGet<IgProfile>("me", token, { fields: "id,user_id,username,name" });
}

function clip(text: string) {
  const trimmed = text.trim();
  return trimmed.length > 4000 ? `${trimmed.slice(0, 4000).trim()}…` : trimmed;
}

function isOwn(actor: IgActor | undefined, ownIds: Set<string>, ownUsername: string | null) {
  if (!actor) return false;
  if (actor.id && ownIds.has(actor.id)) return true;
  if (ownUsername && actor.username && actor.username.toLowerCase() === ownUsername.toLowerCase()) return true;
  return false;
}

async function loadMessages(conversationId: string, token: string) {
  try {
    const expanded = await igGet<{ messages?: { data?: IgMessage[] } }>(conversationId, token, {
      fields: "messages.limit(8){id,created_time,from,message}",
    });
    const messages = expanded.messages?.data ?? [];
    if (messages.some((message) => message.message)) return messages;
  } catch {
    // Some conversations only return message ids. Read those one by one.
  }

  const listed = await igGet<{ messages?: { data?: IgMessage[] } }>(conversationId, token, {
    fields: "messages.limit(8)",
  });
  const ids = (listed.messages?.data ?? []).map((message) => message.id).filter((id): id is string => Boolean(id)).slice(0, 8);
  const detailed: IgMessage[] = [];
  for (const id of ids) {
    try {
      detailed.push(await igGet<IgMessage>(id, token, { fields: "id,created_time,from,message" }));
    } catch {
      // Messages older than the latest 20 cannot be read.
    }
  }
  return detailed;
}

export async function fetchInstagramConversations(
  token: string,
  profile: IgProfile,
): Promise<Conversation[]> {
  const ownIds = new Set([profile.id, profile.user_id].filter((id): id is string => Boolean(id)));
  const ownUsername = profile.username ?? null;
  const list = await igGet<{ data?: { id?: string; updated_time?: string }[] }>("me/conversations", token, {
    platform: "instagram",
    limit: "8",
  });

  const conversations: Conversation[] = [];
  for (const item of (list.data ?? []).slice(0, 8)) {
    if (!item.id) continue;
    let raw: IgMessage[] = [];
    try {
      raw = await loadMessages(item.id, token);
    } catch {
      continue;
    }
    const messages = raw
      .map((message): DealMessage | null => {
        const text = clip(message.message || "");
        if (!text) return null;
        return {
          from: isOwn(message.from, ownIds, ownUsername) ? "you" : "them",
          at: message.created_time || item.updated_time || new Date().toISOString(),
          text,
        };
      })
      .filter((message): message is DealMessage => Boolean(message))
      .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
    if (!messages.length) continue;

    const them = raw.find((message) => message.from && !isOwn(message.from, ownIds, ownUsername))?.from;
    const username = them?.username || "";
    conversations.push({
      id: `instagram:${item.id}`,
      source: "instagram",
      fromName: username || them?.id || "Instagram",
      fromHandle: username ? `@${username}` : them?.id || "instagram",
      subject: "",
      receivedAt: messages[messages.length - 1]?.at || item.updated_time || new Date().toISOString(),
      messages,
    });
  }
  return conversations;
}

export async function instagramThreadSender(token: string, conversationId: string): Promise<string> {
  const profile = await instagramProfile(token);
  const ownIds = new Set([profile.id, profile.user_id].filter((id): id is string => Boolean(id)));
  const ownUsername = profile.username ?? null;
  const raw = await loadMessages(conversationId, token);
  const them = raw.find((message) => message.from?.id && !isOwn(message.from, ownIds, ownUsername))?.from;
  if (!them?.id) {
    throw new Error("Could not find who to reply to. Sync Instagram again, then retry.");
  }
  return them.id;
}

export async function sendInstagramMessage(token: string, recipientId: string, text: string) {
  const url = new URL(`${GRAPH}/me/messages`);
  url.searchParams.set("access_token", token);
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: recipientId },
      messaging_type: "RESPONSE",
      message: { text },
    }),
  });
  const body = (await response.json().catch(() => null)) as {
    error?: { message?: string; code?: number };
  } | null;
  if (!response.ok) {
    if (body?.error?.code === 190) {
      throw new Error("Instagram access expired. Connect Instagram again.");
    }
    throw new Error((body?.error?.message || "Instagram did not send the reply.").slice(0, 220));
  }
}
