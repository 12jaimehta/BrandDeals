import Link from "next/link";

export default function AuthCodeError() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6">
      <h1 className="font-serif text-4xl tracking-tight">Gmail did not finish connecting</h1>
      <p className="mt-4 text-sm leading-6 text-zinc-600">
        Check that the Supabase redirect URL includes this site&apos;s /auth/callback path, and that the Google provider is enabled.
      </p>
      <Link href="/connect" className="mt-6 text-sm font-medium underline">Back to inboxes</Link>
    </main>
  );
}
