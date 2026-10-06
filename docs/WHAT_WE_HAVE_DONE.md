# What we have done

Updated: 6 October 2026

Brand Deal Inbox reads brand conversations and manages the next step on the deal. Creator tools already cover contracts, invoicing, payments, and pitches. This project is the reading and deal-management layer.

## Stack you chose

- Next.js, TypeScript, one app for the inbox and the API
- Supabase for Postgres and Google sign-in
- OpenAI to read live conversations
- Sign in with Google, the same account as Gmail

The rules reader stays in place. It fills in whenever OpenAI is missing or a single message fails. The Samsung brief below is the test case in `tests/read-deals.mjs`, not a thread in the app.

## What you can do now

```bash
npm install
npm run dev
```

Then open http://localhost:3000. Sign in with Google and sync Gmail, or connect a professional Instagram account and sync DMs. The inbox starts empty until a sync returns messages.

A brand thread is read into:

- Brand
- Campaign
- Offer
- Deliverables
- Deadline
- Usage rights
- Exclusivity
- Payment

The Samsung thread is the reference brief:

| Term | Read from the mail |
| --- | --- |
| Brand | Samsung |
| Campaign | Galaxy AI |
| Offer | ₹80,000 |
| Deliverables | 2 Reels + 3 Stories |
| Deadline | Oct 18 |
| Usage rights | 90 days |
| Exclusivity | 30 days |
| Payment | 50% advance |

With the default rate rules (30 days of usage included, ₹12,500 for each extra 30 days), the advice is:

> They're asking for 90-day usage rights. Your normal rate should increase by ₹25,000.

The suggested counter is ₹1,05,000. That is 60 extra days, which is 2 blocks of ₹12,500.

You can also:

- Set a follow-up reminder. Samsung is 2 days. Nykaa is 1 day because the last message says "tomorrow".
- Copy a reply draft. Nothing is emailed or sent as a DM.
- Edit the rate rules. The advice updates from your numbers, and the rules stay in this browser.
- Set a conversation aside and mark a follow-up done.
- Dates are shown in India time so the server and the browser agree.

`prototype/index.html` still opens the fictional sample threads with no install. The Next app does not.

## What is built for the live mailbox

These paths run from the keys in `.env`.

- Google sign-in through Supabase, requesting Gmail read-only access
- A callback that stores the Gmail token in `gmail_connections` with the Supabase secret key
- `POST /api/gmail/sync` reads recent Gmail threads, extracts each one, and saves the conversation and the deal
- Instagram Login at `/auth/instagram`, then `POST /api/instagram/sync` reads recent DMs for a professional account
- OpenAI reads a thread when `OPENAI_API_KEY` is set. A fee or brand the message did not actually write is dropped. If the model fails, that thread uses the rules reader.
- SQL for rate rules, conversations, deals, and Gmail tokens is in `supabase/migrations/0001_inbox.sql`. Instagram tokens are in `supabase/migrations/0002_instagram.sql`
- Gmail and Instagram tokens have no browser policy. Only the server, using the secret key, can read them.

## How the rules reader works

`lib/read-deal.mjs` reads the subject and the message text. It looks for money, Reel, Story, and Post counts, dates, usage language, exclusivity, and payment phrases.

A conversation becomes a brand deal when those commercial signals add up. A newsletter cue keeps a message out. A personal note with no fee, deliverables, or deadline stays out.

Blank terms stay blank.

Brand names come from a few sentence patterns: a "Samsung Partnerships" sign-off, a "boAt wants" line, or an Instagram handle ending in `.creators`. The sender's email domain is not treated as the brand, because agencies write from their own domains.

Rate advice is arithmetic on your rules:

- Extra usage days = asked days minus the days you already include.
- Blocks = those extra days divided by 30, rounded up.
- Usage increase = blocks times your per-30-day amount.
- If you set an exclusivity amount, each 30 days of exclusivity is added on top.
- Suggested counter = their offer plus those increases, when they stated an offer.

Follow-up timing is also a rule: 1 day when the latest message says "tomorrow", otherwise 2 days. The reminder lives in this browser only.

## Checks

```bash
npm test
```

`tests/read-deals.mjs` checks the Samsung brief, the ₹25,000 usage increase, boAt, Nykaa, the unnamed Brightline brand, and the two messages that are not deals.

## Files

- `app/` — Next.js inbox, Google and Instagram callbacks, and sync routes
- `components/Inbox.tsx` — the deal desk
- `lib/read-deal.mjs` — rules reader, rate advice, reply draft, and the test fixtures
- `lib/read-with-model.ts` — OpenAI reading, with the rules reader underneath
- `lib/gmail.ts` — read-only Gmail fetch
- `lib/instagram.ts` — Instagram Login and read-only DM fetch
- `supabase/migrations/0001_inbox.sql` — tables and row security
- `supabase/migrations/0002_instagram.sql` — Instagram token table
- `prototype/` — fictional sample inbox, not used by the app
- `docs/INTEGRATIONS_AND_PENDING.md` — what is still open

## Product defaults

- Replies are copied by you. The app does not send email or DMs.
- Reminders stay on this device.
- Contracts, invoices, payments, and pitches stay in the creator tools you already use.
- Live mail uses the official Gmail API. Instagram DMs use Instagram Login and the official conversations API. Personal Instagram accounts cannot be read.

The Samsung, Nykaa, boAt, and Brightline names live only in the reader tests and the prototype.
