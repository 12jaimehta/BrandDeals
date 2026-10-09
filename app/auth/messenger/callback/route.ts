import { NextResponse } from "next/server";
import { publicOrigin } from "@/lib/public-origin";

export async function GET(request: Request) {
  return NextResponse.redirect(`${publicOrigin(request)}/connect?auth=paused`);
}
