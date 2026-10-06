import { ConnectApps } from "@/components/ConnectApps";
import {
  instagramConfig,
  messengerConfig,
  outlookConfig,
  publicConfig,
  whatsappConfig,
  xConfig,
} from "@/lib/config";
import { hasAnyInbox, hasProviderConnection } from "@/lib/any-inbox";
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
      connected={{
        gmail: gmailConnected,
        instagram: instagramConnected,
        whatsapp: false,
        outlook: false,
        x: viewer ? await hasProviderConnection(viewer.id, "x") : false,
        messenger: viewer ? await hasProviderConnection(viewer.id, "messenger") : false,
      }}
      configured={{
        gmail: publicConfig().configured,
        instagram: instagramConfig().configured,
        whatsapp: whatsappConfig().configured,
        outlook: outlookConfig().configured,
        x: xConfig().configured,
        messenger: messengerConfig().configured,
      }}
      authNotice={params.auth ?? null}
    />
  );
}
