# Integrations and pending work

Updated: 8 October 2026

Counter runs on Next.js, Supabase, Gmail, Instagram, and OpenAI. Below is the setup each path needs, followed by what is not built yet.

## 1. Supabase

1. Create a project at supabase.com.
2. In the SQL editor, run the migrations in order:
   - `supabase/migrations/0001_inbox.sql`: rate rules, conversations, deals, Gmail tokens
   - `supabase/migrations/0002_instagram.sql`: Instagram tokens
   - `supabase/migrations/0004_deal_desk.sql`: deal-link source, deal status and agreed fee, guardrails and autopilot, creator profiles, the agent action log, invoices. It also drops the unused `channel_connections` table.
3. Copy `.env.example` to `.env.local`. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SECRET_KEY`.

The secret key is server-only. It stores inbox tokens, lets the public deal link write a brief into the right creator's desk, and lets the cron run autopilot.

## 2. Google sign-in and Gmail

1. In Google Cloud, create an OAuth client (Web application).
2. Consent screen scopes: `gmail.readonly` and `gmail.send`. Both are restricted. A public launch needs Google's verification (including a security assessment for restricted scopes). Test users work before that.
3. Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`.
4. Supabase → Authentication → Providers → Google: paste the client id and secret.
5. Supabase → URL configuration: allow `http://localhost:3000/auth/callback` and your production `/auth/callback`.
6. Put the same id and secret in `.env.local` as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` so expired tokens can be refreshed.

Gmail is used to read brand threads, reply in-thread, reply to deal-link briefs, send invoices, and send payment reminders.

## 3. Instagram

Official Instagram API with Instagram Login. Professional accounts only. No scraping.

1. Create a Meta app, add Instagram, choose API setup with Instagram login.
2. Redirect URI: `https://<your-domain>/auth/instagram/callback` (Meta requires https).
3. Set `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`. Set `INSTAGRAM_LIVE=true` once Meta approves `instagram_business_manage_messages`.
4. Until approval, the creator's account must be a tester on the app.

Replies are only sent inside Meta's 24-hour window after the brand's last message. Autopilot checks this before every Instagram send.

## 4. OpenAI

Optional. Set `OPENAI_API_KEY` (default model `gpt-4.1-mini`, override with `OPENAI_MODEL`).

- Reading: each thread is read into deal terms. A brand or fee not written in the message is discarded. Failures fall back to the rules reader.
- Rewriting drafts: any rupee amount not already in the draft or thread rejects the rewrite.
- Contract review: every flag must quote the contract verbatim, or it is dropped. The rules scanner always runs.

## 5. Autopilot cron

Set `CRON_SECRET` in Vercel. `vercel.json` calls `/api/cron/autopilot` daily at 03:30 UTC (09:00 IST). It syncs Gmail and Instagram for every creator with autopilot on, then runs the agent. Autopilot also runs right after a manual sync on the desk.

Vercel Hobby allows one daily cron. A Pro plan can run it hourly by changing the schedule.

## 6. The deal link

No setup beyond the migration and the secret key. Creators claim a handle in Settings; the page lives at `/c/<handle>`. The brief API has a honeypot field and a per-IP limit of 6 briefs an hour per server instance.

## Not built yet

- **Billing.** The 5% (or agency plan) is recorded but not charged. Next: Razorpay subscriptions for agencies and a monthly invoice for the deal share.
- **Escrow / payment collection.** Payment is chased, not held. Next: Razorpay Route or a payment link on the invoice so brands pay through Counter.
- **Duplicate threads.** When a reply to a deal-link brief starts a new Gmail thread, a later Gmail sync can list that thread separately.
- **Shared rate limiting.** The brief limiter is in memory. Move it to Upstash or a Supabase table before heavy traffic.
- **Agency roster view.** The agency plan is priced; a multi-creator view is not built.
- **E-sign.** Agreements are copied, downloaded, or printed. Next: Leegality or Digio for Aadhaar e-sign.
- **WhatsApp, X, Outlook, Messenger.** Removed on purpose. Gmail, Instagram, and the deal link cover where Indian brand deals arrive.
