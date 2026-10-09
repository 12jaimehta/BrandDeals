import { redirect } from "next/navigation";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { MoneyBoard } from "@/components/money/MoneyBoard";
import { PageShell } from "@/components/ui";
import { feeSummary, loadBilling } from "@/lib/billing";
import { hasGmailConnection } from "@/lib/gmail-status";
import { listInvoices } from "@/lib/invoices";
import { loadProfile } from "@/lib/profile";
import { razorpayConfig } from "@/lib/razorpay";
import { loadSavedConversations } from "@/lib/saved-inbox";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export default async function MoneyPage({ searchParams }: { searchParams: Promise<{ billing?: string }> }) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const params = await searchParams;
  const client = await createClient();
  const [conversations, invoices, gmailConnected, billing, fees, profile] = await Promise.all([
    loadSavedConversations(client, viewer.id),
    listInvoices(client, viewer.id),
    hasGmailConnection(viewer.id),
    loadBilling(client, viewer.id),
    feeSummary(client, viewer.id),
    loadProfile(client, viewer.id),
  ]);
  const config = razorpayConfig();

  return (
    <PageShell>
      <SiteHeader email={viewer.email ?? null} />
      <main className="relative">
        <MoneyBoard
          conversations={conversations}
          initialInvoices={invoices}
          gmailConnected={gmailConnected}
          billing={billing}
          fees={fees}
          payments={{ configured: config.configured, agencyAvailable: Boolean(config.configured && config.agencyPlanId), payoutLinked: Boolean(profile?.razorpayAccountId) }}
          notice={params.billing ?? null}
        />
      </main>
      <SiteFooter />
    </PageShell>
  );
}
