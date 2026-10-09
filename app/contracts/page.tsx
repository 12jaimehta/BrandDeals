import { redirect } from "next/navigation";
import { ContractsDesk } from "@/components/ContractsDesk";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { PageShell } from "@/components/ui";
import { creatorName, loadProfile } from "@/lib/profile";
import { loadSettings } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export default async function ContractsPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const client = await createClient();
  const [settings, profile] = await Promise.all([loadSettings(client, viewer.id), loadProfile(client, viewer.id)]);

  return (
    <PageShell>
      <SiteHeader email={viewer.email ?? null} />
      <main className="relative">
        <ContractsDesk
          maxUsageDays={settings.rules.maxUsageDays}
          maxExclusivityDays={settings.rules.maxExclusivityDays}
          creator={{ name: creatorName(profile, viewer.email ?? null), legalName: profile?.legalName, address: profile?.address, pan: profile?.pan, gstin: profile?.gstin }}
        />
      </main>
      <SiteFooter />
    </PageShell>
  );
}
