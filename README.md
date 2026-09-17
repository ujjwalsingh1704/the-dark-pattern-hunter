# Dark Pattern Hunter

An agent that walks a real website's signup flow, then its cancellation
flow, through [Solari](https://getsolari.com)'s stealth browser — and
catches manipulative UX as it happens, with screenshots and a session
recording as proof. Built as a Solari use-case submission.

## Why this and not another scraper

Most agent demos are "do this task for a user." This one is different: it's
an **auditor**, not a doer. It judges how a site treats the people going
through it, and backs every claim with evidence instead of an opinion.

It also exercises the parts of Solari that matter most for this kind of
task — **stealth** (so the site behaves as it would for a real visitor, not
a known bot), **captcha solving** (cancellation flows love to gate the exit
behind one), and **session recording** (so the report isn't "trust me," it's
a replay).

## What it actually checks

- Confirm-shaming copy on decline buttons ("No, I don't want to save money")
- Pre-checked opt-in checkboxes
- False urgency / scarcity language
- Disproportionate sizing between the primary CTA and the decline option
- Cancellation flows that force a phone call or support chat instead of a
  self-serve action
- Flow asymmetry — how many more steps it takes to leave than to join

Every finding is tied to a screenshot of the exact step it was caught at.

## Stack

- Next.js 14 (App Router) + TypeScript — one deployable unit, frontend and
  backend together
- `@solarisdk/browser` + `playwright-core` — drives the actual flow through
  Solari's stealth Chrome
- Tailwind — report UI
- A JSON file as the store (`data/audits.json`) — zero setup to run this
  locally; swap for Postgres if you want it production-grade

## Running it

```bash
npm install
cp .env.example .env.local   # add your SOLARI_API_KEY
npm run dev
```

Open `http://localhost:3000`, paste a URL, and watch it work.

## Honest limitations (read before you demo this)

- `guessNextStep` in `lib/solari-agent.ts` uses generic selectors to find
  "the next button" on any site. That works for a first pass on simple
  flows, but real cancellation flows are often bespoke and multi-page. For
  a specific target site, walk the flow manually once and replace the
  guessed selectors with real ones — the check engine underneath doesn't
  change.
- The visual-imbalance and urgency checks are heuristics, not certainty —
  they're written to flag "worth a human look," not to make a final legal
  or ethical judgment on their own.
- Only audit sites you have the right to test against, and don't use this
  against accounts or checkout flows that would spend real money —
  demo it against your own test accounts or well-known public examples.
