# Brand Deal Inbox

Reads brand conversations from Gmail and Instagram and manages the deal: the terms, the usage-rights adjustment, and when to follow up.

Creator CRMs already handle contracts, invoices, payments, and pitches. This project is the layer that reads the conversation.

## Run it

Use Node 22 or newer. Next.js 16 and the current Supabase libraries expect it.

```bash
npm install
npm test
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Sign in with Google to read Gmail. Connect a professional Instagram account to read DMs. The Samsung brief in `tests/read-deals.mjs` is the check for the reader: ₹80,000, 90-day usage, and a ₹25,000 increase.

## Stack

- Next.js (TypeScript)
- Supabase for Postgres and Google sign-in
- OpenAI for reading live mail, with the rules reader as the fallback
- Gmail read-only through the same Google account

Copy `.env.example` to `.env.local` when you are ready to connect those. The steps are in [Integrations and pending work](docs/INTEGRATIONS_AND_PENDING.md).

## Docs

- [What we have done](docs/WHAT_WE_HAVE_DONE.md)
- [Integrations and pending work](docs/INTEGRATIONS_AND_PENDING.md)
