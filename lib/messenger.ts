import { messengerConfig } from "@/lib/config";

const VERSION = "v23.0";
const DIALOG = `https://www.facebook.com/${VERSION}/dialog/oauth`;
const GRAPH = `https://graph.facebook.com/${VERSION}`;
const SCOPES = "pages_show_list,pages_messaging,pages_read_engagement";

export function messengerCallbackUrl(origin: string) {
  return `${origin}/auth/messenger/callback`;
}

export function messengerAuthorizeUrl(redirectUri: string, state: string) {
  const { appId } = messengerConfig();
  const url = new URL(DIALOG);
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", SCOPES);
  return url.toString();
}

export async function exchangeMessengerCode(code: string, redirectUri: string) {
  const { appId, appSecret } = messengerConfig();
  const short = await tokenRequest({
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code,
  });
  if (!short.access_token) throw new Error("Messenger did not return a token.");
  const long = await tokenRequest({
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: short.access_token,
  }).catch(() => short);
  return long.access_token ? long : short;
}

export async function messengerPage(userToken: string) {
  const url = new URL(`${GRAPH}/me/accounts`);
  url.searchParams.set("fields", "id,name,access_token");
  url.searchParams.set("access_token", userToken);
  const response = await fetch(url);
  const body = await response.json().catch(() => ({})) as {
    data?: Array<{ id?: string; name?: string; access_token?: string }>;
    error?: { message?: string };
  };
  if (!response.ok) throw new Error(body.error?.message || "Messenger did not return your Pages.");
  const page = (body.data ?? []).find((item) => item.id && item.access_token);
  if (!page?.id || !page.access_token) return null;
  return { id: page.id, name: page.name ?? "", accessToken: page.access_token };
}

async function tokenRequest(params: Record<string, string>) {
  const url = new URL(`${GRAPH}/oauth/access_token`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const response = await fetch(url);
  const body = await response.json().catch(() => ({})) as {
    access_token?: string;
    expires_in?: number;
    error?: { message?: string };
  };
  if (!response.ok || !body.access_token) {
    throw new Error(body.error?.message || "Messenger did not return a token.");
  }
  return body;
}
