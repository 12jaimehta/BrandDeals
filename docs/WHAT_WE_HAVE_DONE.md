# What we have done

Updated: 8 October 2026

Counter is an AI deal desk for creators. It covers the whole deal: find the offer, read the terms, price it, negotiate inside the creator's rules, check the contract, invoice, and chase payment. The creator stays the only one who can accept.

## The flow

1. **Arrive.** Brand messages come from Gmail, Instagram DMs, or the creator's deal link (`/c/<handle>`). Sync reads recent threads; the deal link writes a structured brief straight to the desk.
2. **Read.** Each thread is read into brand, campaign, offer, deliverables, deadline, usage, exclusivity, payment, and a category (betting, crypto, alcohol, and so on). OpenAI reads when a key is set; the rules reader (`lib/read-deal.mjs`) is the fallback. Blank terms stay blank.
3. **Plan.** `planDeal` in `lib/agent.mjs` picks one next step per deal:
   - Decline a blocked category
   - Ask for the budget when no fee is stated
   - Ask for missing terms
   - Counter when the offer is under target (usage uplift, exclusivity uplift, minimum fee, usage and exclusivity caps)
   - "Your decision" when the offer meets the target
   - Follow up after 48 hours of silence, at most twice
4. **Send.** The creator approves with a two-step confirm, or autopilot sends it. `canAutoSend` enforces the rules autopilot can't override:
   - "Your decision" messages are never auto-sent, and any draft containing acceptance language is blocked
   - Each action type must be switched on individually; counters are off by default
   - Counters are never below the minimum
   - Instagram replies only inside the 24-hour window
   - The same action isn't repeated within 20 hours
   Every send, skip, and failure is logged in `agent_actions` and shown on the thread.
5. **Contract.** The rules scanner (`lib/contract.mjs`) flags 16 clause types with the exact sentence and what to ask instead. An optional AI review must quote the contract verbatim. The agreement builder is a fixed 12-section template.
6. **Close.** Mark won with the agreed fee. The uplift over the first offer and the 5% share are recorded.
7. **Invoice and chase.** GST invoices (`lib/invoice.mjs`) with sequence numbers, amount in words, advance, UPI link, and print/PDF. Sent from the creator's Gmail. Reminders at 3 days before, on the due date, then 7 and 14 days late.
8. **Get paid.** Each invoice email and reminder carries a Razorpay payment link. The webhook (`app/api/razorpay/webhook`) marks it paid and transfers the creator's share through Route, minus Razorpay's fee and Counter's 5% (`lib/commercial.mjs`). Invoices marked paid by hand make the fee due, payable from Money in one link. The agency plan is a Razorpay subscription.

## Pages

| Page | What it does |
| --- | --- |
| `/` | Marketing home |
| `/deals` | The desk: filters, threads, agent panel (Next step, Terms, Contract, Close) |
| `/money` | Won, negotiated uplift, outstanding, collected; invoice list and actions |
| `/invoice/[id]` | Printable invoice |
| `/contracts` | Contract checker and agreement builder |
| `/settings` | Guardrails, blocked categories, autopilot, deal link, invoice details |
| `/c/[handle]` | Public deal link |
| `/connect` | Gmail and Instagram |
| `/pricing` | 5% of closed deals, or ₹24,000 a month for agencies |

## Checks

```bash
npm test          # reader, benchmarks, agent guardrails, contract scanner, invoices
npm run typecheck
```

The Samsung brief stays the reference: ₹80,000 offer, 90-day usage, ₹25,000 uplift, ₹1,05,000 counter.

## Files

- `lib/agent.mjs`: planner and autopilot guardrails
- `lib/contract.mjs`: agreement template and clause scanner
- `lib/invoice.mjs`: GST maths, amount in words, reminder schedule
- `lib/read-deal.mjs`, `lib/read-with-model.ts`: reading
- `lib/autopilot.ts`, `lib/sync.ts`, `lib/channels.ts`: server-side agent run, sync, and sending
- `lib/razorpay.ts`, `lib/billing.ts`: Razorpay API, payment links, fees, plans
- `components/desk/`: the desk and deal panel
- `supabase/migrations/`: schema and row-level security
