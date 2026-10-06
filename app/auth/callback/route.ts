import { NextResponse } from "next/server";
import { secretKey } from "@/lib/config";
import { publicOrigin } from "@/lib/public-origin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const origin = publicOrigin(request);

  if (!code) return NextResponse.redirect(`${origin}/auth/auth-code-error`);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.session) return NextResponse.redirect(`${origin}/auth/auth-code-error`);

  const session = data.session;
  if (!session.provider_token) {
    return NextResponse.redirect(`${origin}/connect?auth=no-gmail-token`);
  }
  if (!secretKey()) {
    return NextResponse.redirect(`${origin}/connect?auth=no-secret`);
  }

  const admin = createAdminClient();
  const row: {
    user_id: string;
    access_token: string;
    expires_at: string;
    updated_at: string;
    refresh_token?: string;
  } = {
    user_id: session.user.id,
    access_token: session.provider_token,
    expires_at: new Date(Date.now() + 50 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (session.provider_refresh_token) row.refresh_token = session.provider_refresh_token;
  const { error: saveError } = await admin.from("gmail_connections").upsert(row);
  if (saveError && isMissingTable(saveError)) {
    return NextResponse.redirect(`${origin}/connect?auth=needs-sql`);
  }
  if (saveError) {
    return NextResponse.redirect(`${origin}/connect?auth=save-failed`);
  }

  return NextResponse.redirect(`${origin}/connect?auth=signed-in`);
}

function isMissingTable(error: { code?: string; message?: string }) {
  return error.code === "PGRST205" || /could not find the table/i.test(error.message ?? "");
}
