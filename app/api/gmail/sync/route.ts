import { NextResponse } from "next/server";
import { publicConfig, secretKey } from "@/lib/config";
import { fetchRecentThreads, freshAccessToken } from "@/lib/gmail";
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
    return NextResponse.json({ error: "Add the Supabase URL and key before connecting Gmail." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims as { sub?: string; email?: string } | undefined;
  if (error || !claims?.sub) {
    return NextResponse.json({ error: "Sign in with Google first." }, { status: 401 });
  }
  if (!secretKey()) {
    return NextResponse.json(
      { error: "Add SUPABASE_SECRET_KEY so the server can use the Gmail token." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { data: connection, error: connectionError } = await admin
    .from("gmail_connections")
    .select("user_id, access_token, refresh_token, expires_at")
    .eq("user_id", claims.sub)
    .maybeSingle();

  if (connectionError && isMissingTable(connectionError)) {
    return NextResponse.json(
      {
        error:
          "The database tables are not created yet. In Supabase, open the SQL editor and run supabase/migrations/0001_inbox.sql. Then sign in with Google again.",
      },
      { status: 400 },
    );
  }
  if (connectionError) {
    return NextResponse.json({ error: "Could not read the saved Gmail connection." }, { status: 500 });
  }
  if (!connection?.access_token) {
    return NextResponse.json(
      { error: "Gmail is not connected yet. Sign out, sign in with Google again, and allow inbox access." },
      { status: 400 },
    );
  }

  try {
    const accessToken = await freshAccessToken(connection, async (next) => {
      await admin
        .from("gmail_connections")
        .update({
          access_token: next.access_token,
          expires_at: next.expires_at,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", claims.sub);
    });

    const conversations = await fetchRecentThreads(accessToken, claims.email ?? null);
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
    const message = error instanceof Error ? error.message : "Gmail sync failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
