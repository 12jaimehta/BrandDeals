import { NextResponse } from "next/server";
import { publicConfig } from "@/lib/config";
import { publicOrigin } from "@/lib/public-origin";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const origin = publicOrigin(request);
  if (!publicConfig().configured) {
    return NextResponse.redirect(`${origin}/connect?auth=unconfigured`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
      scopes: "https://www.googleapis.com/auth/gmail.readonly",
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error || !data.url) {
    return NextResponse.redirect(`${origin}/connect?auth=error`);
  }
  return NextResponse.redirect(data.url);
}
