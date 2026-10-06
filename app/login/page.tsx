import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

const errors: Record<string, string> = {
  unconfigured: "Sign-in isn't set up yet. Please come back in a bit.",
  error: "Google sign-in did not finish. Please try again.",
  "sign-in-first": "Sign in first — then connect any inbox you use.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const viewer = await getViewer();
  if (viewer) redirect("/connect");

  const message = params.error ? (errors[params.error] ?? null) : null;

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-[#14110e] text-[#f6f1e8]">
      <div className="site-grain" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-28 left-1/2 h-[26rem] w-[46rem] -translate-x-1/2 rounded-full bg-[#ff5a36]/12 blur-[110px]" />
      </div>
      <SiteHeader email={null} />

      <main className="relative z-10 flex flex-1 items-center justify-center px-6 py-24">
      <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#1c1814] p-8 text-center shadow-[0_60px_140px_-40px_rgba(0,0,0,0.9)] sm:p-10">
        <Link href="/" className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#ff5a36] text-lg font-semibold text-[#14110e]">
          B
        </Link>
        <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#ff5a36]">Sign in</p>
        <h1 className="mt-2 font-serif text-4xl tracking-tight">Your desk is one tap away.</h1>
        <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-[#f6f1e8]/60">
          Sign-in only creates your account. Every inbox stays optional — connect just the ones you use.
        </p>

        {message ? (
          <p className="mt-5 rounded-2xl border border-[#ff5a36]/40 bg-[#ff5a36]/10 px-4 py-3 text-sm text-white" role="alert">
            {message}
          </p>
        ) : null}

        <a
          href="/auth/login"
          className="mt-7 flex items-center justify-center gap-3 rounded-full bg-[#f6f1e8] px-5 py-3.5 text-sm font-semibold text-[#14110e] transition hover:bg-white"
        >
          <span className="grid h-5 w-5 place-items-center rounded-full bg-white text-xs font-bold text-[#4285F4] ring-1 ring-black/10">G</span>
          Sign in with Google
        </a>

        <p className="mt-5 text-xs leading-5 text-[#f6f1e8]/40">
          No inbox connects on its own. After sign-in you land on the inbox list — add one, add all, or skip to the desk.
        </p>

        <div className="mt-6 flex items-center justify-center gap-4 text-sm">
          <Link href="/" className="text-[#f6f1e8]/55 hover:text-white">Home</Link>
          <Link href="/connect" className="text-[#f6f1e8]/55 hover:text-white">See the inboxes</Link>
        </div>
      </div>
      </main>
      <SiteFooter />
    </div>
  );
}
