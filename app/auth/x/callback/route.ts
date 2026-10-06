import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { secretKey } from "@/lib/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicOrigin } from "@/lib/public-origin";
import { getViewer } from "@/lib/viewer";
import { exchangeXCode, xCallbackUrl, xProfile } from "@/lib/x";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = publicOrigin(request);
  if (url.searchParams.get("error")) {
    return NextResponse.redirect(`${origin}/connect?auth=x-denied`);
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const expected = cookieStore.get("x_oauth_state")?.value;
  const verifier = cookieStore.get("x_code_verifier")?.value;
  if (!code || !state || !expected || state !== expected || !verifier) {
    return NextResponse.redirect(`${origin}/connect?auth=x-mismatch`);
  }

  const viewer = await getViewer();
  if (!viewer) return NextResponse.redirect(`${origin}/login?error=sign-in-first`);
  if (!secretKey()) return NextResponse.redirect(`${origin}/connect?auth=no-secret`);

  try {
    const token = await exchangeXCode(code, xCallbackUrl(origin), verifier);
    const profile = await xProfile(token.access_token!);
    const admin = createAdminClient();
    const { error } = await admin.from("channel_connections").upsert({
      user_id: viewer.id,
      provider: "x",
      provider_user_id: profile.id,
      username: profile.username ?? null,
      access_token: token.access_token,
      refresh_token: token.refresh_token ?? null,
      expires_at: new Date(Date.now() + (token.expires_in ?? 7200) * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,provider" });
    if (error && (error.code === "PGRST205" || /could not find the table/i.test(error.message))) {
      return NextResponse.redirect(`${origin}/connect?auth=needs-channels-sql`);
    }
    if (error) return NextResponse.redirect(`${origin}/connect?auth=save-failed`);
  } catch {
    return NextResponse.redirect(`${origin}/connect?auth=x-failed`);
  }

  const response = NextResponse.redirect(`${origin}/connect?auth=x`);
  response.cookies.set("x_oauth_state", "", { path: "/", maxAge: 0 });
  response.cookies.set("x_code_verifier", "", { path: "/", maxAge: 0 });
  return response;
}
