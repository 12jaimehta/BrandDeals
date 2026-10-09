# Counter

The AI deal desk for creators. Counter reads brand emails and Instagram DMs, works out what each deal is worth, negotiates inside the creator's rules, checks the contract, sends the GST invoice, and chases the payment. Only the creator can say yes.

The pitch is in [PITCH.md](PITCH.md).

## What's in the product

- **Desk** (`/deals`): every brand thread from Gmail, Instagram, and the deal link. Each deal shows the agent's next step (ask for budget, ask for terms, counter, follow up, decline, or "your decision"), a draft you can edit or rewrite with AI, the terms with the counter maths, a contract tab, and a close tab with invoicing.
- **Autopilot**: off by default. The creator switches on individual actions. A run happens after every sync and once a day by cron. Hard rules in `lib/agent.mjs` (`canAutoSend`): never send a message that accepts a deal, never counter below the minimum, respect Instagram's 24-hour window.
- **Deal link** (`/c/<handle>`): a public brief form. Brands state budget, deliverables, usage, exclusivity, deadline, and payment terms. It lands on the desk already read.
- **Contracts** (`/contracts`): a rules-based clause scanner (perpetual usage, pay-when-paid, penalties, unlimited revisions, and more), an optional AI review that must quote the contract verbatim, and a fixed-template agreement builder.
- **Money** (`/money`): won, negotiated uplift, outstanding, collected; GST invoices with amount in words and UPI; payment reminders at −3, 0, +7, and +14 days.
- **Settings** (`/settings`): guardrails, blocked categories, autopilot switches, deal link, and invoice details.

## Run it

Use Node 22 or newer. Next.js 16 and the current Supabase libraries expect it.

```bash
npm install
npm test
npm run typecheck
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Set up

1. Copy `.env.example` to `.env.local` and fill in Supabase, Google, and optionally OpenAI and Instagram.
2. In the Supabase SQL editor, run the migrations in `supabase/migrations/` in order. `0004_deal_desk.sql` adds deal status, guardrails, autopilot, creator profiles, the agent log, and invoices.
3. Set `CRON_SECRET` in Vercel. `vercel.json` runs `/api/cron/autopilot` daily at 09:00 IST.

More detail: [Integrations and pending work](docs/INTEGRATIONS_AND_PENDING.md).

## Stack

- Next.js 16 (App Router, TypeScript), Tailwind v4, framer-motion
- Supabase for Postgres, row-level security, and Google sign-in
- Gmail API (read and send) and the Instagram Graph API (official messaging)
- OpenAI for reading, rewriting, and contract review, with rules-based fallbacks for each
- Pure logic modules (`lib/*.mjs`) tested with plain Node: `tests/*.mjs`

## Docs

- [Pitch](PITCH.md)
- [What we have done](docs/WHAT_WE_HAVE_DONE.md)
- [Integrations and pending work](docs/INTEGRATIONS_AND_PENDING.md)
