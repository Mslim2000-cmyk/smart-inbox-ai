# Smart Inbox AI

**A portfolio project: an AI-powered email productivity demo that classifies, summarizes, drafts replies, and previews automation rules safely — without ever connecting to a real inbox.**

> **Honesty note:** Smart Inbox AI is **not** the original Inbox Zero product and is **not affiliated with it**. It's a portfolio project built on top of the open-source [Inbox Zero](https://github.com/elie222/inbox-zero) codebase, inspired by AI email productivity tools generally. The base repository provides the real Gmail/Outlook-integrated application (auth, Prisma schema, provider clients, the existing rules engine, etc.) — everything described below under **"What I personally added"** is new, portfolio-specific work layered on top of it under a route-isolated `/demo` surface. Where something is demo-only vs. something that's designed to extend to a real provider later, that's called out explicitly.

🔗 **Live demo:** _[add your deployed URL here]_
📦 **Source:** _[add your GitHub repo URL here]_

---

## What is this?

Smart Inbox AI is a public, no-login demo of an AI email assistant. Visit `/demo`, and you get a seeded sample inbox with realistic emails across categories (urgent, reply-needed, newsletters, cold/spam, notifications, FYI). From there you can:

- See emails **classified live by an LLM** with a visible confidence score
- **Summarize** any email into main point / requested action / deadline / importance
- **Generate a reply draft** in a chosen tone (professional, friendly, short, detailed)
- Type a rule in plain English (e.g. _"archive newsletters older than 7 days"_) and get a **preview of exactly which emails it would affect** before anything happens
- Apply that rule and see the effect reflected in the sample inbox — entirely in your browser

No Gmail or Outlook sign-in. No database writes. Nothing you do on `/demo` touches a real inbox.

## Screenshots

_Placeholder — capture and add these before publishing:_

| | |
|---|---|
| `docs/screenshots/dashboard.png` | Dashboard with AI-classified inbox + stats row |
| `docs/screenshots/email-detail.png` | Email detail page with Summarize/Reply actions |
| `docs/screenshots/rule-builder.png` | Rule builder with a parsed rule + preview + warning |
| `docs/screenshots/landing.png` | Landing page hero |

## Features

- **AI Inbox Classification** — every sample email classified into urgent / reply-needed / newsletter / cold-spam / notification / FYI, with confidence and reasoning.
- **Email Summaries** — structured extraction (main point, requested action, deadline, importance), not a paraphrase.
- **AI Reply Drafts** — four tones, copy-to-clipboard, grounded only in the email's actual content.
- **Natural-Language Rule Builder** — plain-English instructions parsed into structured conditions/actions.
- **Preview-Before-Apply Safety** — every rule shows matched emails and warns before any destructive action (archive, unsubscribe) is applied.
- **Client-side demo state** — applying a rule updates a sessionStorage overlay only; nothing is ever written to a database.
- **Deterministic fallback everywhere** — if the AI is unavailable (no API key, daily budget reached, or a model error), every feature still works via a safe, clearly-labeled fallback instead of breaking.

## Tech stack

- [Next.js](https://nextjs.org/) (App Router) + TypeScript
- [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- [Vercel AI SDK](https://sdk.vercel.ai/) + Anthropic Claude for classification, summarization, reply drafting, and rule parsing
- [Zod](https://zod.dev/) for every request/response contract
- [Upstash Redis](https://upstash.com/) (optional) for cross-instance rate limiting and the daily AI budget guard, with an in-memory fallback when unset
- [Vitest](https://vitest.dev/) for unit tests
- Inherited from the base repo: [Prisma](https://www.prisma.io/) + Postgres, Turborepo — used by the real, authenticated part of the app; **not** used by anything under `/demo`

## Architecture

The core design decision: **route isolation with one shared AI core.**

```
                 ┌──────────────────────────────┐
                 │   Provider-agnostic AI core    │  ← classify · summarize · reply · parse-rule
                 │   operates on NormalizedEmail  │     (shared, testable, no I/O in the matcher)
                 └───────────────┬────────────────┘
                                 │
              ┌──────────────────┴───────────────────┐
      ┌───────┴────────┐                     ┌────────┴────────┐
      │   Demo mode     │                     │  Real Gmail/    │
      │   /demo/*       │                     │  Outlook mode   │
      │   /api/demo/*   │                     │  (inherited)    │
      │   seed data,    │                     │  auth required, │
      │   no auth, no   │                     │  full Prisma    │
      │   DB writes     │                     │  schema         │
      └─────────────────┘                     └─────────────────┘
```

- **Demo mode is route-isolated.** Everything under `/demo/*` (pages) and `/api/demo/*` (endpoints) is public and stateless. It shares no code path with authenticated routes.
- **Real provider logic is untouched.** Gmail/Outlook integration, the real rules engine, and the Prisma schema are exactly as they exist in the base project.
- **Both modes are meant to share one AI core.** Classification, summarization, reply drafting, and rule parsing are written against a canonical `NormalizedEmail` shape, not against Gmail or seed-data specifics. The seed data already maps into that shape; a real provider mapping into the same shape is the natural next step (not yet done — see Limitations).
- **Preview-before-apply is a first-class contract**, not a UI convention: the rule matcher (`evaluateRule`) is a pure function with no I/O, unit-tested independently of any AI mocking, and it's the same function that produces both the preview and the data used to apply a rule.

## What I personally added

The base repository is the real, open-source Inbox Zero app (Gmail/Outlook integration, auth, Prisma schema, billing, the works). On top of that, this project adds an entire public-demo layer:

- Route-isolated public demo (`/demo/*`, `/api/demo/*`) — zero auth, zero DB writes
- The `NormalizedEmail` contract and seed inbox data
- A provider-agnostic AI core: classification, summarization, and reply-draft generation
- The natural-language rule parser and its pure, dependency-free rule matcher
- Preview-before-apply UX, including human-readable explanations and destructive-action warnings generated deterministically from the parsed rule
- The sessionStorage demo-state overlay (apply/reset), with no server persistence
- A shared AI guard (config check), a shared daily AI-call budget (Redis-backed with an in-memory fallback), and per-feature IP rate limiting on every public AI endpoint
- Deterministic fallback behavior for every AI feature — including four fallback rule templates — so the demo keeps working if the model is unavailable
- The rebranded landing page and this README
- Unit tests for classification, rule matching, fallback parsing, and the parse/guard/budget orchestration

## Demo mode explained

`/demo` exists specifically so it can be shared publicly (e.g., in this README, on LinkedIn, in an interview) without any setup on the visitor's end and without risk to a real account:

- **No Gmail/Outlook OAuth** — the demo never asks for or uses real email credentials.
- **No database writes** — every demo API route is stateless; nothing persists server-side.
- **Seed emails only** — every email in the demo is fictional sample data (see `apps/web/utils/demo/inbox-data.ts`).
- **Client-side state** — applying a rule writes to `sessionStorage` in your browser only; refreshing in a new tab starts clean.
- **Rate-limited** — each AI feature (classify/summarize/reply/rules) has its own IP-based rate limit, Redis-backed with an in-memory fallback so it still works with zero Redis configured.
- **Budget-guarded** — a shared daily cap on live AI calls protects against runaway cost on a public URL; once reached, requests degrade to the deterministic fallback rather than failing.

## Local setup

> **Honest caveat:** this fork hasn't yet decoupled the Next.js app's boot requirements from the base project's — `next dev` still expects the same Postgres/auth environment as the full app, even though nothing under `/demo` uses the database. Fully deploying `/demo` with zero non-AI config is listed under **Limitations** below.

```bash
git clone <your-fork-url>
cd inbox-zero-main
docker compose -f docker-compose.dev.yml up -d   # Postgres + Redis (inherited requirement)
pnpm install
npm run setup                                     # interactive env setup (base project)
cd apps/web && pnpm prisma migrate dev && cd ../..
pnpm dev
```

Then add the demo-specific variables below to `apps/web/.env.local`, and open `http://localhost:3000/demo`.

## Environment variables

Everything below is **specific to the demo layer**; see the base project's setup docs for the full authenticated-app variable list (Google/Microsoft OAuth, `DATABASE_URL`, `AUTH_SECRET`, etc.).

| Variable | Required | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | Optional | Enables live AI for classify/summarize/reply/rules. Without it, every feature still works via the deterministic fallback. |
| `DEMO_AI_MODEL` | Optional | Model id for the demo's AI core. Defaults to a fast/cheap Claude model. |
| `DEMO_AI_DAILY_CALL_LIMIT` | Optional | Global daily cap on live AI calls across all demo features. Defaults to 300. |
| `UPSTASH_REDIS_URL` / `UPSTASH_REDIS_TOKEN` | Optional | Makes rate limiting and the daily budget guard cross-instance. Without them, both fall back to a safe in-memory implementation (per-instance only). |
| `NEXT_PUBLIC_BRAND_NAME` | Optional | White-labels the rest of the authenticated app (page titles, PWA manifest) to "Smart Inbox AI". The `/demo` landing page's copy is hardcoded and works regardless. |

## Testing

```bash
pnpm install
pnpm --filter inbox-zero-ai test utils/demo   # unit tests: classification, rule matching, fallback parsing, orchestration
pnpm --filter inbox-zero-ai test              # full unit test suite
```

AI calls are mocked in all of the above — no `ANTHROPIC_API_KEY` needed to run tests.

## Deployment notes

- `/demo` and `/api/demo/*` need **only** the "Environment variables" above to function — no Google/Microsoft OAuth config.
- The rest of the app (everything outside `/demo`) still requires the base project's full environment (Postgres, auth, etc.) to build and boot — see **Limitations**.
- Set a real `DEMO_AI_DAILY_CALL_LIMIT` and configure Upstash before sharing the URL widely, so rate limiting and the budget guard survive across serverless instances instead of relying on the per-instance in-memory fallback.
- Replace the placeholder GitHub URL in `app/(landing)/home/SmartInboxChrome.tsx` (`GITHUB_REPO_URL`) with your actual repository link before deploying.
- Suggested GitHub repo name: `smart-inbox-ai`
- Suggested Vercel project name: `smart-inbox-ai`

## Relationship to the original project

Smart Inbox AI is a **portfolio adaptation** built on top of the open-source [Inbox Zero](https://github.com/elie222/inbox-zero) codebase (AGPL-3.0 licensed). It is not the original product, not affiliated with it, and does not claim to be.

**What comes from the base project:**

- Gmail and Outlook integration (OAuth, provider clients, the real rules engine)
- The Prisma database schema and migrations
- Authentication (Better Auth), billing, background jobs
- The existing landing pages, email templates, and original feature set
- All internal infrastructure (Docker, Helm charts, CLI, API packages)

**What I personally added (the portfolio demo layer):**

- The route-isolated public demo (`/demo/*`, `/api/demo/*`) — zero auth, zero DB writes
- The `NormalizedEmail` contract and seed inbox data
- A provider-agnostic AI core: classification, summarization, and reply-draft generation
- The natural-language rule parser and its pure, dependency-free rule matcher
- Preview-before-apply UX, including human-readable explanations and destructive-action warnings
- The sessionStorage demo-state overlay (apply/reset), with no server persistence
- A shared AI guard (config check), a shared daily AI-call budget (Redis-backed with in-memory fallback), and per-feature IP rate limiting on every public AI endpoint
- Deterministic fallback behavior for every AI feature so the demo works without a model
- The rebranded landing page, deployment docs, and this README
- Unit tests for classification, rule matching, fallback parsing, and orchestration

**Attribution:**

The original project's AGPL-3.0 license and all attribution are preserved in the `LICENSE` file. The `CLA.md` and `SECURITY.md` files remain from the upstream project.

## Limitations / future improvements

- **The app still needs the full base-project environment to boot**, even to serve `/demo`. A genuinely zero-config deploy would require auditing `env.ts` to make the Postgres/auth variables truly optional when only the demo is being served.
- **Real-provider mapping isn't implemented.** `NormalizedEmail` is designed so a real Gmail/Outlook provider could map into the same shape and reuse the AI core unchanged, but that integration work hasn't been done — today only the seed data maps into it.
- **Reply drafting is non-streaming.** The base app has a streaming pattern (`chatCompletionStream`) used elsewhere, but no existing client-side stream consumer to mirror, so the demo's reply endpoint uses structured (non-streaming) output for now.
- **Applied rules are session-only by design** — refreshing in a new tab resets the demo. This is intentional for a public demo, not a bug.
- **The fallback rule templates cover 4 common phrasings** (newsletter age, urgent, cold/spam, receipts/finance); anything else requires a live model.
