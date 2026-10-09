import { NextResponse } from "next/server";
import { secretKey } from "@/lib/config";
import { runAutopilot } from "@/lib/autopilot";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncGmail, syncInstagram } from "@/lib/sync";

export const runtime = "nodejs";
export const maxDuration = 300;

// Vercel Cron calls this with "Authorization: Bearer <CRON_SECRET>".
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Not allowed." }, { status: 401 });
  }
  if (!secretKey()) return NextResponse.json({ error: "SUPABASE_SECRET_KEY is missing." }, { status: 500 });

  const admin = createAdminClient();
  await admin.from("brief_hits").delete().lt("created_at", new Date(Date.now() - 86400000).toISOString());
  const { data: users, error } = await admin.from("rate_rules").select("user_id").eq("autopilot->>enabled", "true").limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const summary = [];
  for (const { user_id: userId } of users ?? []) {
    const { data: user } = await admin.auth.admin.getUserById(userId);
    const email = user?.user?.email ?? null;
    await syncGmail(admin, admin, userId, email).catch(() => undefined);
    await syncInstagram(admin, admin, userId).catch(() => undefined);
    const result = await runAutopilot(admin, userId, email).catch((cause: unknown) => ({
      ran: false,
      sent: [],
      held: 0,
      reminders: 0,
      failures: [cause instanceof Error ? cause.message : "failed"],
    }));
    summary.push({ userId, sent: result.sent.length, reminders: result.reminders, failures: result.failures.length });
  }
  return NextResponse.json({ users: summary.length, summary });
}
