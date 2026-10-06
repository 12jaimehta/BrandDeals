import { NextResponse } from "next/server";
import { messengerConfig } from "@/lib/config";
import { messengerAuthorizeUrl, messengerCallbackUrl } from "@/lib/messenger";
import { publicOrigin } from "@/lib/public-origin";
import { getViewer } from "@/lib/viewer";

export async function GET(request: Request) {
  const origin = publicOrigin(request);
  if (origin.startsWith("http://")) {
    return NextResponse.redirect(`${origin}/connect?auth=messenger-https`);
  }
  if (!messengerConfig().configured) {
    return NextResponse.redirect(`${origin}/connect?auth=messenger-unconfigured`);
  }
  const viewer = await getViewer();
  if (!viewer) return NextResponse.redirect(`${origin}/login?error=sign-in-first`);

  const state = crypto.randomUUID();
  const response = NextResponse.redirect(
    messengerAuthorizeUrl(messengerCallbackUrl(origin), state),
  );
  response.cookies.set("ms_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: origin.startsWith("https://"),
    path: "/",
    maxAge: 600,
  });
  return response;
}
