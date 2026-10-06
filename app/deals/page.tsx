import { Inbox } from "@/components/Inbox";
import { instagramConfig, publicConfig } from "@/lib/config";
import { loadSavedConversations } from "@/lib/saved-inbox";
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
  const saved = viewer ? await loadSavedConversations() : [];
  const instagramConnected = viewer ? await hasInstagramConnection(viewer.id) : false;

  return (
    <Inbox
      supabaseConfigured={publicConfig().configured}
      email={viewer?.email ?? null}
      savedConversations={saved}
      authNotice={params.auth ?? null}
      instagramConfigured={instagramConfig().configured}
      instagramConnected={instagramConnected}
    />
  );
}
