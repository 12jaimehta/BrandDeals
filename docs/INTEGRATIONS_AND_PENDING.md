# Integrations and pending work

Updated: 8 October 2026

Counter runs on Next.js, Supabase, Gmail, Instagram, and OpenAI. Below is the setup each path needs, followed by what is not built yet.

## 1. Supabase

1. Create a project at supabase.com.
2. In the SQL editor, run the migrations in order:
   - `supabase/migrations/0001_inbox.sql`: rate rules, conversations, deals, Gmail tokens
   - `supabase/migrations/0002_instagram.sql`: Instagram tokens
   - `supabase/migrations/0004_deal_desk.sql`: deal-link source, deal status and agreed fee, guardrails and autopilot, creator profiles, the agent action log, invoices. It also drops the unused `channel_connections` table.
   - `supabase/migrations/0005_payments.sql`: Razorpay payment links, fees, plans, webhook idempotency, the deal-link Gmail thread, and the shared brief rate limit. It also makes invoice payment and fee columns server-only.
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

There is no separate "sandbox API". The app always calls the live `graph.instagram.com`. What's limited is the Meta app: in Development mode, Meta only lets accounts listed as Instagram testers grant `instagram_business_manage_messages`. Any creator can connect once Meta App Review approves Advanced Access for that permission (business verification, a screencast, and a privacy policy). The Postman collection in `sandbox/instagram` is just a way to test those calls and measure rate limits before the review.

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

## 6. Razorpay

Counter collects invoice payments on its own Razorpay account and splits them with Razorpay Route.

1. Activate Razorpay and enable **Route** and **Payment Links** (and **Subscriptions** for the agency plan).
2. For each creator, create a Route linked account (Dashboard → Route → Linked accounts, with their KYC and bank account). Give the creator the `acc_…` ID; they paste it into Settings → Invoices.
3. Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`.
4. Add a webhook to `https://<your-domain>/api/razorpay/webhook` for `payment_link.paid`, `payment_link.cancelled`, `payment_link.expired`, and `subscription.*`. Put its secret in `RAZORPAY_WEBHOOK_SECRET`.
5. Optional: create a ₹24,000 monthly plan and set `RAZORPAY_AGENCY_PLAN_ID`.

How money moves:

- Sending an invoice (and each reminder) creates a payment link for the balance. When the brand pays, the webhook marks the invoice paid and transfers the payment minus Razorpay's fee minus Counter's 5% (of the pre-GST amount) to the creator. A failed transfer shows **Retry payout** on the Money page.
- Invoices marked paid by hand make the 5% due. The creator pays everything due in one payment link from the Money page.
- Invoices not tied to a desk deal, and every invoice on the agency plan, carry no fee.

## 7. The deal link

No setup beyond the migration and the secret key. Creators claim a handle in Settings; the page lives at `/c/<handle>`. The brief API has a honeypot field and limits counted in Supabase: 6 briefs an hour per network and 40 an hour per creator. Network addresses are stored hashed and cleared daily by the cron.

## Not built yet

- **Automated payout onboarding.** Linked accounts are created in the Razorpay dashboard. Next: the Route accounts API (`/v2/accounts`) so creators finish KYC inside Counter.
- **GST on Counter's own fee.** The 5% is collected as one amount. Before scale, issue Counter's tax invoice for its fee and add GST on it.
- **Agency roster view.** The agency plan is billable; a multi-creator view is not built.
- **E-sign.** Agreements are copied, downloaded, or printed. Next: Leegality or Digio for Aadhaar e-sign.
- **WhatsApp, X, Outlook, Messenger.** Removed on purpose. Gmail, Instagram, and the deal link cover where Indian brand deals arrive.
