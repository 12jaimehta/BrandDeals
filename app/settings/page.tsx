import { redirect } from "next/navigation";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { PageShell } from "@/components/ui";
import { EMPTY_PROFILE, loadProfile } from "@/lib/profile";
import { pageOrigin } from "@/lib/public-origin";
import { loadSettings } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const client = await createClient();
  const [settings, profile, origin] = await Promise.all([loadSettings(client, viewer.id), loadProfile(client, viewer.id), pageOrigin()]);

  return (
    <PageShell>
      <SiteHeader email={viewer.email ?? null} />
      <main className="relative">
        <SettingsForm initialSettings={settings} initialProfile={profile ?? EMPTY_PROFILE} origin={origin} />
      </main>
      <SiteFooter />
    </PageShell>
  );
}
