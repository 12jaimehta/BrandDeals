import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { secretKey } from "@/lib/config";
import { exchangeMessengerCode, messengerCallbackUrl, messengerPage } from "@/lib/messenger";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicOrigin } from "@/lib/public-origin";
import { getViewer } from "@/lib/viewer";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = publicOrigin(request);
  if (url.searchParams.get("error")) {
    return NextResponse.redirect(`${origin}/connect?auth=messenger-denied`);
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const expected = cookieStore.get("ms_oauth_state")?.value;
  if (!code || !state || !expected || state !== expected) {
    return NextResponse.redirect(`${origin}/connect?auth=messenger-mismatch`);
  }

  const viewer = await getViewer();
  if (!viewer) return NextResponse.redirect(`${origin}/login?error=sign-in-first`);
  if (!secretKey()) return NextResponse.redirect(`${origin}/connect?auth=no-secret`);

  try {
    const token = await exchangeMessengerCode(code, messengerCallbackUrl(origin));
    const page = await messengerPage(token.access_token!);
    if (!page) return NextResponse.redirect(`${origin}/connect?auth=messenger-no-page`);

    const admin = createAdminClient();
    const { error } = await admin.from("channel_connections").upsert({
      user_id: viewer.id,
      provider: "messenger",
      provider_user_id: page.id,
      username: page.name || null,
      access_token: page.accessToken,
      refresh_token: null,
      expires_at: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,provider" });
    if (error && (error.code === "PGRST205" || /could not find the table/i.test(error.message))) {
      return NextResponse.redirect(`${origin}/connect?auth=needs-channels-sql`);
    }
    if (error) return NextResponse.redirect(`${origin}/connect?auth=save-failed`);
  } catch {
    return NextResponse.redirect(`${origin}/connect?auth=messenger-failed`);
  }

  const response = NextResponse.redirect(`${origin}/connect?auth=messenger`);
  response.cookies.set("ms_oauth_state", "", { path: "/", maxAge: 0 });
  return response;
}
