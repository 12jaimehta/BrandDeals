import { NextResponse } from "next/server";
import { publicOrigin } from "@/lib/public-origin";

export async function GET(request: Request) {
  const origin = publicOrigin(request);
  return NextResponse.redirect(`${origin}/connect?auth=x-unconfigured`);
}
