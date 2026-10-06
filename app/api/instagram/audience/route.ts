import { NextResponse } from "next/server";
import { secretKey } from "@/lib/config";
import { instagramProfile, refreshInstagramToken } from "@/lib/instagram";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims as { sub?: string } | undefined;
  if (error || !claims?.sub || !secretKey()) {
    return NextResponse.json({ followers: null });
  }

  const admin = createAdminClient();
  const { data: connection, error: connectionError } = await admin
    .from("instagram_connections")
    .select("access_token, expires_at, username")
    .eq("user_id", claims.sub)
    .maybeSingle();
  if (connectionError || !connection?.access_token) {
    return NextResponse.json({ followers: null });
  }

  try {
    let accessToken = connection.access_token as string;
    const expires = connection.expires_at ? new Date(connection.expires_at).getTime() : 0;
    if (!expires || expires < Date.now() + 7 * 24 * 60 * 60 * 1000) {
      const refreshed = await refreshInstagramToken(accessToken);
      accessToken = refreshed.accessToken;
      await admin
        .from("instagram_connections")
        .update({
          access_token: refreshed.accessToken,
          expires_at: refreshed.expiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", claims.sub);
    }
    const profile = await instagramProfile(accessToken);
    let followers = profile.followers_count ?? null;
    if (followers == null) {
      const counted = await fetch(
        `https://graph.instagram.com/me?fields=followers_count,username&access_token=${encodeURIComponent(accessToken)}`,
      );
      if (counted.ok) {
        const body = (await counted.json()) as { followers_count?: number; username?: string };
        followers = body.followers_count ?? null;
      }
    }
    return NextResponse.json({
      followers,
      username: profile.username || connection.username || null,
    });
  } catch {
    return NextResponse.json({ followers: null, username: connection.username ?? null });
  }
}
