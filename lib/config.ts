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

export function openaiConfig() {
  const key = process.env.OPENAI_API_KEY ?? "";
  return { key, model: process.env.OPENAI_MODEL || "gpt-4.1-mini", configured: Boolean(key) };
}
