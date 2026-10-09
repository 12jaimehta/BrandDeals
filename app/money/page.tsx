import { redirect } from "next/navigation";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { MoneyBoard } from "@/components/money/MoneyBoard";
import { PageShell } from "@/components/ui";
import { hasGmailConnection } from "@/lib/gmail-status";
import { listInvoices } from "@/lib/invoices";
import { loadSavedConversations } from "@/lib/saved-inbox";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export default async function MoneyPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const client = await createClient();
  const [conversations, invoices, gmailConnected] = await Promise.all([
    loadSavedConversations(client, viewer.id),
    listInvoices(client, viewer.id),
    hasGmailConnection(viewer.id),
  ]);

  return (
    <PageShell>
      <SiteHeader email={viewer.email ?? null} />
      <main className="relative">
        <MoneyBoard conversations={conversations} initialInvoices={invoices} gmailConnected={gmailConnected} />
      </main>
      <SiteFooter />
    </PageShell>
  );
}
