# Counter: the AI deal desk for creators

**Your deals, negotiated. Only you say yes.**

---

## One line

Counter is an AI talent manager for creators. It reads every brand email and Instagram DM, works out what the deal is really worth, negotiates inside the creator's own rules, checks the contract, sends the invoice, and chases the payment. It takes 5% only when a deal closes.

## The problem

India has millions of creators earning from brand deals and almost none of them have a manager. Every deal is negotiated alone, in DMs, by someone who would rather be making content.

What that costs them:

- **They underprice.** A brand offers ₹80,000 for two Reels and asks for 90 days of usage rights. Most creators say yes. A manager would have charged for the extra 60 days and countered at ₹1,05,000. That gap is on every deal.
- **They lose deals to silence.** Brand DMs get buried. Briefs arrive without a budget. Nobody follows up. Deals die in the inbox.
- **They sign bad contracts.** Perpetual usage, "pay when the client pays us", penalty clauses, unlimited revisions. Nobody reads the fine print.
- **They don't get paid on time.** Net 60 becomes net 120. Chasing a brand for money feels awkward, so creators don't.

Talent managers fix this, but they take 15–30%, only sign creators who are already big, and can't scale past a few dozen clients each. The middle of the market, creators with 10k to 1M followers, has no one.

## What we built

An agent that runs the deal end to end, with the creator in control.

1. **Every deal in one place.** Gmail and Instagram DMs through official APIs, plus a **deal link** for the bio: brands fill a two-minute brief with budget, deliverables, usage, exclusivity, deadline, and payment terms. No platform can take that channel away.
2. **Read and priced.** Each message is read into terms. Usage rights and exclusivity are priced from the creator's own rate rules, with the working shown. Betting apps, crypto, fairness creams, and other categories the creator blocks are caught automatically.
3. **Negotiated inside guardrails.** The agent picks the next step on every deal: ask for the budget, ask for missing terms, counter, follow up, or decline. The creator sets a minimum fee, caps on usage and exclusivity, and blocked categories. The agent never goes outside them.
4. **An autonomy ladder.** Everything starts as a draft for one-tap approval. The creator switches on autopilot one action at a time: follow-ups first, then budget questions, then payment reminders, and only then counters. **Accepting a deal is never automatic.** That rule is enforced in code on the send path, not offered as a setting.
5. **Contracts checked.** Paste the brand's contract. Sixteen kinds of risky clause are flagged with the exact line and what to ask for instead, and one tap drafts the reply. The agreement Counter generates is a fixed template, not AI-written legal text.
6. **Invoiced and chased.** Mark the deal won and a GST invoice is ready, with amount in words and a UPI link, sent from the creator's own Gmail. Counter reminds the brand 3 days before the due date, on the day, and at 7 and 14 days late, until it's marked paid.

## Why we're better

| | Talent manager | Creator CRMs and media kits | Generic AI assistants | **Counter** |
| --- | --- | --- | --- | --- |
| Cost | 15–30% | Monthly subscription | Monthly subscription | **5%, only on closed deals** |
| Who it serves | Top creators | Anyone, but it's just a tracker | Anyone, no domain knowledge | **Any creator with brand inbound** |
| Negotiates | Yes | No | Writes text if you ask | **Yes, inside your rules** |
| Prices usage and exclusivity | Sometimes | No | No | **Every deal, maths shown** |
| Reads contracts | Sometimes | No | Unreliable | **Rules plus guarded AI** |
| Chases payment | Sometimes | Reminders to you | No | **Reminders to the brand** |
| Works at 2am on deal #40 | No | n/a | n/a | **Yes** |

**Why creators will trust it:**

- **Only you can say yes.** The agent can't accept a deal or go below your minimum. Every action is logged on the thread.
- **No invented numbers.** AI reading drops any fee or brand that isn't in the message. AI rewrites that change a fee are thrown away. Contract flags must quote the contract.
- **Official APIs only.** Gmail and the Instagram messaging API. No scraping, no passwords. Replies go out from the creator's own accounts.
- **Aligned incentives.** We earn when the creator earns, so we want the higher fee too.

## How we make money

- **Creators:** 5% of the agreed fee on deals closed through Counter. Nothing on deals they decline. A creator closing ₹50,000 a month pays ₹2,500 and typically gains far more from priced usage alone.
- **Agencies and talent managers:** ₹24,000 a month for a roster, with no percentage on top. Counter becomes their back office.
- **Collected at source:** when brands pay through Counter's Razorpay link, our fee is deducted before the creator's payout, so there's no fee to chase.
- **Later:** escrow, fast payouts against approved invoices, and brand-side tools.

## Market

- India has one of the largest creator populations in the world, and Instagram is the main channel for paid collaborations. Influencer marketing spend in India is in the thousands of crores of rupees and has been growing at roughly 20–25% a year *(cite the latest EY–FICCI or industry report in the deck)*.
- Our wedge is creators with 10k to 1M followers who already get inbound brand offers but have no manager. Every one of them negotiates alone today.
- The same problem exists wherever there's a creator economy: Southeast Asia, the Middle East, Latin America, the US. Counter's core is an inbox, rules, contracts, and invoices, which carries across markets. The India-specific parts are GST, UPI, and rupee formatting.

## Why now

- **LLMs can finally read messy DMs reliably**, as long as they're kept on a leash. Our leash is guardrails, verbatim checks, and hard rules in code.
- **Official messaging APIs exist.** The Instagram messaging API and Gmail make a compliant agent possible.
- **Brand budgets are moving to mid-tier creators**, who have the reach and engagement but none of the infrastructure.

## Moat

1. **Deal data.** Every negotiation teaches us what brands actually pay for a Reel, for 90 days of usage, for category exclusivity, by niche and audience size. That becomes rate benchmarks no one else has, which make every counter smarter.
2. **The deal link.** Once brands get used to sending briefs through Counter, it becomes the standard way to book a creator. That's a two-sided network we own.
3. **Trust and workflow.** The creator's rules, history, invoices, and payment records live in Counter. Switching means giving up your back office.
4. **Payments.** Once money moves through Counter, it's a fintech business, not a tool.

## Risks, and how we handle them

| Risk | What we do |
| --- | --- |
| Platform API changes | Gmail plus Instagram plus a deal link we own. No single platform dependency. Official APIs only. |
| Creators won't trust an agent | Autonomy ladder: drafts first, autopilot one action at a time, acceptance never automatic, every action logged. |
| Legal liability on contracts | Fixed-template agreements, a rules-based scanner, AI flags that must quote the source, and a clear "not legal advice" line. |
| Brands don't pay | Every invoice and reminder carries a Razorpay link; money flows through Counter and settles to the creator automatically. Escrow before work starts is next. |
| Price sensitivity in India | Zero upfront cost. We charge only on money the creator actually received in a closed deal. |

## Where we are

Built and working end to end:

- Gmail and Instagram sync, plus the public deal link
- AI and rules-based deal reading, category detection, usage and exclusivity pricing
- Agent planner with guardrails, autopilot with per-action switches, a daily cron, and an action log
- Two-step approve-and-send from the creator's own Gmail or Instagram
- Contract scanner, guarded AI contract review, and agreement builder
- Deal close, GST invoices, printable invoice with UPI, invoice email, and automated payment reminders
- Razorpay: brands pay invoices online, the creator's share settles automatically through Route, and Counter's 5% is deducted at source. Agency plan billed as a Razorpay subscription
- Money dashboard: won, negotiated uplift, outstanding, collected

## Next 90 days

1. **50 creators** from 10k to 500k followers, onboarded by hand. Measure: deals closed, fee uplift over first offer, days to payment.
2. **5 talent agencies** on the roster plan.
3. **Escrow:** brand pays the advance into Counter before work starts, released on delivery.
4. **Rate benchmarks** from closed deals, shown on every counter.
5. Meta app review for Instagram messaging at scale, and Google verification for Gmail.

The number we'll report is **rupees negotiated above first offer**. That's the value of the product in one figure.

## The ask

We're raising a pre-seed round to get to 1,000 creators and prove that Counter pays for itself many times over on every closed deal. The money goes to engineering for payments, rate benchmarks, and agency tools, and to creator acquisition in India.

---

**Counter. The manager every creator deserves, at 5% instead of 25%.**
