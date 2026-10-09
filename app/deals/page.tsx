import { redirect } from "next/navigation";
import { Inbox } from "@/components/Inbox";
import { instagramConfig, publicConfig } from "@/lib/config";
import { hasAnyInbox } from "@/lib/any-inbox";
import { loadSavedConversations } from "@/lib/saved-inbox";
import { hasGmailConnection } from "@/lib/gmail-status";
import { hasInstagramConnection } from "@/lib/instagram-status";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<{ auth?: string }>;
}) {
  const params = await searchParams;
  const viewer = await getViewer();
  if (!viewer || !(await hasAnyInbox(viewer.id))) {
    redirect("/connect?auth=need-inbox");
  }
  const [saved, gmailConnected, instagramConnected] = await Promise.all([
    loadSavedConversations(),
    hasGmailConnection(viewer.id),
    hasInstagramConnection(viewer.id),
  ]);

  return (
    <Inbox
      supabaseConfigured={publicConfig().configured}
      email={viewer.email ?? null}
      savedConversations={saved}
      authNotice={params.auth ?? null}
      instagramConfigured={instagramConfig().configured}
      gmailConnected={gmailConnected}
      instagramConnected={instagramConnected}
      waitingSources={[]}
    />
  );
}
