import { NextResponse } from "next/server";
import { publicConfig } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  if (publicConfig().configured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  return NextResponse.redirect(`${origin}/`);
}
