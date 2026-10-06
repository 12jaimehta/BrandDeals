# Integrations and pending work

Updated: 6 October 2026

The stack is chosen: Next.js, Supabase, OpenAI, and Google sign-in. Gmail sync and Instagram DM sync are in the app. Everything below is the setup those paths still need, or what is not built.

## 1. Create the Supabase project and run the SQL

Pending until you have a project.

1. Create a project at supabase.com.
2. Open the SQL editor and run `supabase/migrations/0001_inbox.sql`.
3. Copy `.env.example` to `.env.local`.
4. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from Project Settings → API.
5. Set `SUPABASE_SECRET_KEY` to the secret key. The server uses it only to store the Gmail token. The browser cannot read that table.

Restart `npm run dev` after saving `.env.local`.

## 2. Google sign-in and Gmail read-only

Pending until the Google client exists.

The sign-in route and the callback are already in the app. They request `gmail.readonly` and, on the way back, save the provider token.

1. In Google Cloud, create an OAuth client of type Web application.
2. On the consent screen, add the scope `https://www.googleapis.com/auth/gmail.readonly`. Restricted Gmail scopes need Google's verification before a public app can leave testing. A private test user can use it before that.
3. Authorized redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`
4. In Supabase → Authentication → Providers → Google, paste that client id and secret, and enable the provider.
5. In Supabase → Authentication → URL configuration, add `http://localhost:3000/auth/callback` to the redirect allow list, and set the site URL to `http://localhost:3000`.
6. Put the same client id and secret in `.env.local` as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. The app needs them when the short-lived Gmail token expires. They must match the client configured in Supabase.

Then use **Sign in with Google** and **Sync Gmail**. Sync reads up to 12 recent threads, skips chats and drafts, and does not send mail.

If Google does not return a Gmail token, sign in again and accept inbox access. Supabase only exposes `provider_token` on that first exchange, so the callback has to store it immediately.

## 3. OpenAI

Pending until you add a key. Sync still works without it, using the rules reader.

Set `OPENAI_API_KEY`. The default model is `gpt-4.1-mini`. Change `OPENAI_MODEL` if you want a different one.

Sync sends each thread to the model and asks for the same fields the deal card shows. A brand or a fee that is not written in the message is discarded. If a call fails, that thread falls back to the rules reader.

Without a key, sync still works and every thread uses the rules reader.

## 4. Instagram

Built. It uses Instagram Login and the official conversations API. Personal accounts cannot be read. The app does not scrape Instagram.

1. In the Supabase SQL editor, run `supabase/migrations/0002_instagram.sql`.
2. Create a Meta app, add Instagram, and choose API setup with Instagram login.
3. Set the redirect URI to `http://localhost:3000/auth/instagram/callback`.
4. Add `INSTAGRAM_APP_ID` and `INSTAGRAM_APP_SECRET` to `.env` and restart the app.
5. The Instagram account must be professional. While the Meta app is in development, that account also has to be an Instagram tester on the app.
6. Sign in with Google, then use **Connect Instagram** and **Sync Instagram**.

Sync reads up to 8 recent DM threads and the latest text messages in each. It does not send a reply. Requests that have been idle for 30 days are not returned by Instagram.

## 5. Reminders that leave the browser

Not built.

The follow-up date is saved in this browser. The `deals` table has `follow_up_on` and `followed_up` columns ready for a later reminder. A later version can email you, or collect a morning list, when the date arrives. It still should not message the brand unless you send the reply yourself.

## 6. Sending the reply

Not built, on purpose for now.

The draft can be copied. Sending through Gmail would be a separate permission (`gmail.send`) and a separate confirmation step.

## 7. Rate rules on the server

The table exists. The inbox still keeps the three numbers in this browser:

- Days of usage you already include
- Rupees to add for each extra 30 days of usage
- Rupees to add for each 30 days of exclusivity

Moving those numbers into `rate_rules` is a small follow-up so they survive a new computer. A fuller rate card, per Reel and per Story, can wait.

## Left with existing creator CRMs

These stay out of this project:

- Contracts and e-sign
- Invoices
- Collecting payment
- Media kits and pitch outreach

## Suggested order once the keys exist

1. Run the SQL and sign in with Google on localhost.
2. Sync Gmail. The Samsung numbers in `npm test` are the check that the reader still does the ₹25,000 usage math.
3. Add the OpenAI key and sync again.
4. Connect Instagram for a professional account.
5. Deliver follow-up reminders outside the browser.
6. Only then, if you want it, send a reply you have already approved.
