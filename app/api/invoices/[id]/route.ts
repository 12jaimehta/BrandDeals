import { NextResponse } from "next/server";
import { invoiceFrom, type InvoiceRow } from "@/lib/invoices";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";

type Patch = { status?: string; paidAmount?: number; dueOn?: string; billToEmail?: string; billToName?: string };

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as Patch | null;
  if (!body) return NextResponse.json({ error: "Nothing to change." }, { status: 400 });

  const supabase = await createClient();
  const { data: current } = await supabase.from("invoices").select("*").eq("id", id).eq("user_id", viewer.id).maybeSingle();
  if (!current) return NextResponse.json({ error: "Couldn't find that invoice." }, { status: 404 });
  const total = (current as InvoiceRow).total;

  const update: Record<string, unknown> = {};
  if (typeof body.paidAmount === "number" && Number.isFinite(body.paidAmount) && body.paidAmount >= 0) {
    const paid = Math.min(total, Math.round(body.paidAmount));
    update.paid_amount = paid;
    update.status = paid >= total ? "paid" : paid > 0 ? "partially_paid" : (current as InvoiceRow).status === "draft" ? "draft" : "sent";
  }
  if (body.status === "paid") {
    update.status = "paid";
    update.paid_amount = total;
  } else if (body.status === "void" || body.status === "sent" || body.status === "draft") {
    update.status = body.status;
  }
  if (typeof body.dueOn === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.dueOn)) update.due_on = body.dueOn;
  if (typeof body.billToEmail === "string") {
    const email = body.billToEmail.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "That email doesn't look right." }, { status: 400 });
    update.bill_to_email = email;
  }
  if (typeof body.billToName === "string") update.bill_to_name = body.billToName.trim().slice(0, 120);
  if (!Object.keys(update).length) return NextResponse.json({ error: "Nothing to change." }, { status: 400 });

  const { data, error } = await supabase.from("invoices").update(update).eq("id", id).eq("user_id", viewer.id).select("*").single();
  if (error || !data) return NextResponse.json({ error: "That change was not saved." }, { status: 400 });
  return NextResponse.json({ invoice: invoiceFrom(data as InvoiceRow) });
}
