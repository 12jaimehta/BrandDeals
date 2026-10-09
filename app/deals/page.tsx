import { redirect } from "next/navigation";
import { Desk } from "@/components/desk/Desk";
import { publicConfig } from "@/lib/config";
import { loadDeskData } from "@/lib/desk-data";
import { hasGmailConnection } from "@/lib/gmail-status";
import { hasInstagramConnection } from "@/lib/instagram-status";
import { listInvoices } from "@/lib/invoices";
import { creatorName, loadProfile } from "@/lib/profile";
import { loadSettings } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<{ auth?: string }>;
}) {
  const params = await searchParams;
  const viewer = await getViewer();
  if (!viewer) redirect("/login");

  const client = await createClient();
  const [desk, invoices, settings, profile, gmailConnected, instagramConnected] = await Promise.all([
    loadDeskData(client, viewer.id),
    listInvoices(client, viewer.id),
    loadSettings(client, viewer.id),
    loadProfile(client, viewer.id),
    hasGmailConnection(viewer.id),
    hasInstagramConnection(viewer.id),
  ]);

  if (!gmailConnected && !instagramConnected && !profile?.handle && !desk.conversations.length) {
    redirect("/connect?auth=need-inbox");
  }

  return (
    <Desk
      email={viewer.email ?? null}
      creatorName={creatorName(profile, viewer.email ?? null)}
      profile={profile}
      supabaseConfigured={publicConfig().configured}
      gmailConnected={gmailConnected}
      instagramConnected={instagramConnected}
      initialConversations={desk.conversations}
      initialActivity={desk.activity}
      initialInvoices={invoices}
      initialSettings={settings}
      authNotice={params.auth ?? null}
    />
  );
}
