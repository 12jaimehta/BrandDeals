import { NextResponse } from "next/server";
import { publicConfig, secretKey } from "@/lib/config";
import {
  fetchInstagramConversations,
  instagramProfile,
  refreshInstagramToken,
} from "@/lib/instagram";
import { readConversation } from "@/lib/read-with-model";
import { storeReadings } from "@/lib/store-deals";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function isMissingTable(error: { code?: string; message?: string }) {
  return error.code === "PGRST205" || /could not find the table/i.test(error.message ?? "");
}

async function mapPool<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>) {
  const results = new Array<R>(items.length);
  let index = 0;
  async function run() {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await worker(items[current]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => run()));
  return results;
}

export async function POST() {
  if (!publicConfig().configured) {
    return NextResponse.json({ error: "Add the Supabase URL and key before connecting Instagram." }, { status: 400 });
  }
  if (!process.env.INSTAGRAM_APP_ID || !process.env.INSTAGRAM_APP_SECRET) {
    return NextResponse.json(
      { error: "Add INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET to .env, then connect Instagram." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims as { sub?: string } | undefined;
  if (error || !claims?.sub) {
    return NextResponse.json({ error: "Sign in with Google first." }, { status: 401 });
  }
  if (!secretKey()) {
    return NextResponse.json({ error: "Add SUPABASE_SECRET_KEY so the Instagram token can be read." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: connection, error: connectionError } = await admin
    .from("instagram_connections")
    .select("user_id, instagram_user_id, username, access_token, expires_at")
    .eq("user_id", claims.sub)
    .maybeSingle();

  if (connectionError && isMissingTable(connectionError)) {
    return NextResponse.json(
      { error: "Run supabase/migrations/0002_instagram.sql in the Supabase SQL editor, then connect Instagram again." },
      { status: 400 },
    );
  }
  if (connectionError) {
    return NextResponse.json({ error: "Could not read the saved Instagram connection." }, { status: 500 });
  }
  if (!connection?.access_token) {
    return NextResponse.json({ error: "Connect Instagram first. The account has to be a professional account." }, { status: 400 });
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
    const conversations = await fetchInstagramConversations(accessToken, {
      ...profile,
      user_id: profile.user_id || connection.instagram_user_id,
      username: profile.username || connection.username,
    });
    const readings = await mapPool(conversations, 3, async (conversation) => ({
      conversation,
      ...(await readConversation(conversation)),
    }));
    const visible = await storeReadings(claims.sub, readings);
    return NextResponse.json({
      conversations: visible,
      brandDeals: visible.filter((item) => item.extraction.isBrandOpportunity).length,
      modelErrors: readings.filter((item) => item.modelError).length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Instagram sync failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
