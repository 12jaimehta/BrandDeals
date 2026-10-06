import { ConnectApps } from "@/components/ConnectApps";
import { instagramConfig, publicConfig } from "@/lib/config";
import { hasInstagramConnection } from "@/lib/instagram-status";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export default async function ConnectPage({
  searchParams,
}: {
  searchParams: Promise<{ auth?: string }>;
}) {
  const params = await searchParams;
  const viewer = await getViewer();
  const instagramConnected = viewer ? await hasInstagramConnection(viewer.id) : false;

  return (
    <ConnectApps
      email={viewer?.email ?? null}
      gmailConnected={Boolean(viewer)}
      instagramConnected={instagramConnected}
      instagramConfigured={instagramConfig().configured}
      supabaseConfigured={publicConfig().configured}
      authNotice={params.auth ?? null}
    />
  );
}
