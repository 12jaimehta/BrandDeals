import { NextResponse } from "next/server";
import { publicBaseline } from "@/lib/public-benchmark";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    return NextResponse.json({ baseline: null, reason: "Sign in to look up a published price." }, { status: 401 });
  }

  const username = new URL(request.url).searchParams.get("username")?.trim() ?? "";
  if (!username) {
    return NextResponse.json({ baseline: null, reason: "No Instagram username to look up." });
  }

  const configured = Boolean(process.env.MODASH_API_KEY?.trim() || (process.env.HYPEAUDITOR_API_ID?.trim() && process.env.HYPEAUDITOR_API_TOKEN?.trim()));
  if (!configured) {
    return NextResponse.json({
      baseline: null,
      reason: "No Modash or HypeAuditor key is set, so no public price is shown.",
    });
  }

  try {
    const baseline = await publicBaseline(username);
    if (!baseline) {
      return NextResponse.json({
        baseline: null,
        reason: "The connected source did not publish a post price for this account.",
      });
    }
    return NextResponse.json({ baseline, reason: null });
  } catch {
    return NextResponse.json({
      baseline: null,
      reason: "The pricing source did not answer. No number was filled in.",
    });
  }
}
