import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PrintButton } from "@/components/PrintButton";
import { amountInWords, balanceOf, displayStatus } from "@/lib/invoice.mjs";
import { invoiceFrom, type InvoiceRow } from "@/lib/invoices";
import { creatorName, loadProfile } from "@/lib/profile";
import { formatDate, formatINR } from "@/lib/read-deal.mjs";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const { id } = await params;
  const client = await createClient();
  const [{ data }, profile] = await Promise.all([
    client.from("invoices").select("*").eq("id", id).eq("user_id", viewer.id).maybeSingle(),
    loadProfile(client, viewer.id),
  ]);
  if (!data) notFound();
  const invoice = invoiceFrom(data as InvoiceRow);
  const status = displayStatus(invoice);
  const name = profile?.legalName || creatorName(profile, viewer.email ?? null);
  const advance = invoice.advancePercent ? Math.round((invoice.total * invoice.advancePercent) / 100) : 0;
  const upiLink = profile?.upiId ? `upi://pay?pa=${encodeURIComponent(profile.upiId)}&pn=${encodeURIComponent(name)}&am=${balanceOf(invoice)}&cu=INR&tn=${encodeURIComponent(invoice.number)}` : null;

  return (
    <div className="min-h-screen bg-[#e9e3d8] px-4 py-10 text-[#14110e] print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-3xl items-center justify-between print:hidden">
        <Link href="/money" className="text-sm underline">Back to Money</Link>
        <PrintButton />
      </div>
      <article className="mx-auto max-w-3xl rounded-3xl bg-[#fbf8f2] p-8 shadow-sm sm:p-12 print:rounded-none print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="font-serif text-4xl tracking-tight">Invoice</p>
            <p className="mt-1 text-sm text-[#14110e]/55">{invoice.number}</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold">{name}</p>
            {profile?.address ? <p className="whitespace-pre-line text-[#14110e]/60">{profile.address}</p> : null}
            {profile?.pan ? <p className="text-[#14110e]/60">PAN {profile.pan}</p> : null}
            {profile?.gstin ? <p className="text-[#14110e]/60">GSTIN {profile.gstin}</p> : null}
          </div>
        </header>

        <section className="mt-10 grid gap-6 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-[#14110e]/45">Bill to</p>
            <p className="mt-1 font-semibold">{invoice.billToName || invoice.brand}</p>
            {invoice.billToEmail ? <p className="text-[#14110e]/60">{invoice.billToEmail}</p> : null}
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-[#14110e]/45">Issued</p>
            <p className="mt-1">{formatDate(invoice.issuedOn)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-[#14110e]/45">Due</p>
            <p className="mt-1">{formatDate(invoice.dueOn)}</p>
            <p className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide print:hidden ${status === "paid" ? "bg-emerald-100 text-emerald-800" : status === "overdue" ? "bg-[#ff5a36]" : "bg-[#14110e]/10"}`}>{status.replace("_", " ")}</p>
          </div>
        </section>

        <table className="mt-10 w-full text-sm">
          <thead>
            <tr className="border-b border-[#14110e]/15 text-left text-xs uppercase tracking-[0.14em] text-[#14110e]/45">
              <th className="pb-2 font-medium">Description</th>
              <th className="pb-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, index) => (
              <tr key={index} className="border-b border-[#14110e]/8">
                <td className="py-3">{item.label}</td>
                <td className="py-3 text-right tabular-nums">{formatINR(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="ml-auto mt-6 w-full max-w-xs space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-[#14110e]/55">Subtotal</dt><dd className="tabular-nums">{formatINR(invoice.subtotal)}</dd></div>
          {invoice.gstRate ? <div className="flex justify-between"><dt className="text-[#14110e]/55">GST {invoice.gstRate}%</dt><dd className="tabular-nums">{formatINR(invoice.gstAmount)}</dd></div> : null}
          <div className="flex justify-between border-t border-[#14110e]/15 pt-2 text-base font-semibold"><dt>Total</dt><dd className="tabular-nums">{formatINR(invoice.total)}</dd></div>
          {invoice.paidAmount > 0 ? <div className="flex justify-between"><dt className="text-[#14110e]/55">Received</dt><dd className="tabular-nums">−{formatINR(invoice.paidAmount)}</dd></div> : null}
          {invoice.paidAmount > 0 ? <div className="flex justify-between font-semibold"><dt>Balance</dt><dd className="tabular-nums">{formatINR(balanceOf(invoice))}</dd></div> : null}
          {advance ? <div className="flex justify-between text-[#14110e]/65"><dt>Advance due now ({invoice.advancePercent}%)</dt><dd className="tabular-nums">{formatINR(advance)}</dd></div> : null}
        </dl>
        <p className="mt-4 text-right text-xs text-[#14110e]/55">{amountInWords(invoice.total)}</p>

        <section className="mt-12 rounded-2xl bg-[#14110e]/[0.04] p-5 text-sm">
          <p className="text-xs uppercase tracking-[0.14em] text-[#14110e]/45">Pay to</p>
          <p className="mt-1 font-semibold">{name}</p>
          {profile?.upiId ? <p>UPI: {profile.upiId}{upiLink ? <a href={upiLink} className="ml-2 underline print:hidden">Pay by UPI</a> : null}</p> : <p className="text-[#14110e]/50 print:hidden">Add your UPI ID in <Link href="/settings#invoice" className="underline">Settings</Link>.</p>}
          {invoice.notes ? <p className="mt-3 whitespace-pre-line text-[#14110e]/65">{invoice.notes}</p> : null}
        </section>
      </article>
    </div>
  );
}
