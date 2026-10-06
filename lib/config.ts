function projectUrl(raw: string) {
  return raw
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/rest\/v1$/i, "")
    .replace(/\/auth\/v1$/i, "");
}

export function publicConfig() {
  const url = projectUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";
  return { url, key, configured: Boolean(url && key) };
}

export function secretKey() {
  return process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

export function instagramConfig() {
  const appId = process.env.INSTAGRAM_APP_ID ?? "";
  const appSecret = process.env.INSTAGRAM_APP_SECRET ?? "";
  return { appId, appSecret, configured: Boolean(appId && appSecret) };
}

export function outlookConfig() {
  const clientId = process.env.OUTLOOK_CLIENT_ID ?? "";
  const clientSecret = process.env.OUTLOOK_CLIENT_SECRET ?? "";
  return { clientId, clientSecret, configured: Boolean(clientId && clientSecret) };
}

export function xConfig() {
  const clientId = process.env.X_CLIENT_ID ?? "";
  const clientSecret = process.env.X_CLIENT_SECRET ?? "";
  return { clientId, clientSecret, configured: Boolean(clientId && clientSecret) };
}

export function whatsappConfig() {
  const appId = process.env.WHATSAPP_APP_ID ?? "";
  const appSecret = process.env.WHATSAPP_APP_SECRET ?? "";
  return { appId, appSecret, configured: Boolean(appId && appSecret) };
}

export function messengerConfig() {
  const appId = process.env.MESSENGER_APP_ID ?? "";
  const appSecret = process.env.MESSENGER_APP_SECRET ?? "";
  return { appId, appSecret, configured: Boolean(appId && appSecret) };
}
