import { NextResponse } from "next/server";
import { cleanNewInvoice, createInvoice, listInvoices } from "@/lib/invoices";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  return NextResponse.json({ invoices: await listInvoices(await createClient(), viewer.id) });
}

export async function POST(request: Request) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  try {
    const invoice = await createInvoice(await createClient(), viewer.id, cleanNewInvoice(await request.json().catch(() => null)));
    return NextResponse.json({ invoice });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "The invoice was not created." }, { status: 400 });
  }
}
