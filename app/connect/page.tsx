import { ConnectApps } from "@/components/ConnectApps";
import { instagramConfig, publicConfig } from "@/lib/config";
import { hasAnyInbox } from "@/lib/any-inbox";
import { hasGmailConnection } from "@/lib/gmail-status";
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
  const gmailConnected = viewer ? await hasGmailConnection(viewer.id) : false;
  const instagramConnected = viewer ? await hasInstagramConnection(viewer.id) : false;

  return (
    <ConnectApps
      email={viewer?.email ?? null}
      signedIn={Boolean(viewer)}
      canOpenDesk={viewer ? await hasAnyInbox(viewer.id) : false}
      instagramLive={process.env.INSTAGRAM_LIVE === "true"}
      connected={{ gmail: gmailConnected, instagram: instagramConnected }}
      configured={{ gmail: publicConfig().configured, instagram: instagramConfig().configured }}
      authNotice={params.auth ?? null}
    />
  );
}
