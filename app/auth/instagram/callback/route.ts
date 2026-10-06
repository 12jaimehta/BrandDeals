import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { secretKey } from "@/lib/config";
import { exchangeInstagramCode, instagramProfile } from "@/lib/instagram";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicOrigin } from "@/lib/public-origin";
import { getViewer } from "@/lib/viewer";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = publicOrigin(request);
  const denied = url.searchParams.get("error");
  if (denied) return NextResponse.redirect(`${origin}/connect?auth=instagram-denied`);

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const expected = cookieStore.get("ig_oauth_state")?.value;
  if (!code || !state || !expected || state !== expected) {
    return NextResponse.redirect(`${origin}/connect?auth=instagram-mismatch`);
  }

  const viewer = await getViewer();
  if (!viewer) return NextResponse.redirect(`${origin}/connect?auth=sign-in-first`);
  if (!secretKey()) return NextResponse.redirect(`${origin}/connect?auth=no-secret`);

  try {
    const token = await exchangeInstagramCode(code, `${origin}/auth/instagram/callback`);
    const profile = await instagramProfile(token.accessToken);
    const admin = createAdminClient();
    const { error } = await admin.from("instagram_connections").upsert({
      user_id: viewer.id,
      instagram_user_id: profile.user_id || profile.id || token.instagramUserId,
      username: profile.username ?? null,
      access_token: token.accessToken,
      expires_at: token.expiresAt,
      updated_at: new Date().toISOString(),
    });
    if (error && (error.code === "PGRST205" || /could not find the table/i.test(error.message))) {
      return NextResponse.redirect(`${origin}/connect?auth=needs-instagram-sql`);
    }
    if (error) return NextResponse.redirect(`${origin}/connect?auth=save-failed`);
  } catch {
    return NextResponse.redirect(`${origin}/connect?auth=instagram-failed`);
  }

  const response = NextResponse.redirect(`${origin}/connect?auth=instagram`);
  response.cookies.set("ig_oauth_state", "", { path: "/", maxAge: 0 });
  return response;
}
