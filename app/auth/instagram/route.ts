import { NextResponse } from "next/server";
import { instagramConfig } from "@/lib/config";
import { instagramAuthorizeUrl } from "@/lib/instagram";
import { publicOrigin } from "@/lib/public-origin";
import { getViewer } from "@/lib/viewer";

export async function GET(request: Request) {
  const origin = publicOrigin(request);
  if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
    return NextResponse.redirect(`${origin}/connect?auth=instagram-localhost`);
  }
  if (!instagramConfig().configured) {
    return NextResponse.redirect(`${origin}/connect?auth=instagram-unconfigured`);
  }
  const viewer = await getViewer();
  if (!viewer) return NextResponse.redirect(`${origin}/login?error=sign-in-first`);

  const state = crypto.randomUUID();
  const response = NextResponse.redirect(
    instagramAuthorizeUrl(`${origin}/auth/instagram/callback`, state),
  );
  response.cookies.set("ig_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: origin.startsWith("https://"),
    path: "/",
    maxAge: 600,
  });
  return response;
}
