import { NextResponse } from "next/server";
import { publicConfig } from "@/lib/config";
import { publicOrigin } from "@/lib/public-origin";
import { createClient } from "@/lib/supabase/server";

// Plain sign-in. No inbox scopes — it only creates the account.
// Connecting an inbox is a separate, optional tap on /connect.
export async function GET(request: Request) {
  const origin = publicOrigin(request);
  if (!publicConfig().configured) {
    return NextResponse.redirect(`${origin}/login?error=unconfigured`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
      queryParams: {
        prompt: "select_account",
      },
    },
  });

  if (error || !data.url) {
    return NextResponse.redirect(`${origin}/login?error=error`);
  }
  return NextResponse.redirect(data.url);
}
