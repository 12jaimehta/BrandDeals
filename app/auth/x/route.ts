import { NextResponse } from "next/server";
import { xConfig } from "@/lib/config";
import { publicOrigin } from "@/lib/public-origin";
import { getViewer } from "@/lib/viewer";
import { xAuthorizeUrl, xCallbackUrl, xCodeVerifier } from "@/lib/x";

export async function GET(request: Request) {
  const origin = publicOrigin(request);
  if (!xConfig().configured) {
    return NextResponse.redirect(`${origin}/connect?auth=x-unconfigured`);
  }
  const viewer = await getViewer();
  if (!viewer) return NextResponse.redirect(`${origin}/login?error=sign-in-first`);

  const state = crypto.randomUUID();
  const verifier = xCodeVerifier();
  const response = NextResponse.redirect(
    await xAuthorizeUrl(xCallbackUrl(origin), state, verifier),
  );
  const secure = origin.startsWith("https://");
  const cookie = { httpOnly: true, sameSite: "lax" as const, secure, path: "/", maxAge: 600 };
  response.cookies.set("x_oauth_state", state, cookie);
  response.cookies.set("x_code_verifier", verifier, cookie);
  return response;
}
