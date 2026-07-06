# Deploying the Smart Inbox AI Demo

This document covers **one specific deployment path**: putting the public,
no-login `/demo` experience on Vercel for a portfolio. It is not a guide to
deploying the full real-mode app (Gmail/Outlook-connected inboxes, billing,
background jobs) — that path needs the original project's full env var set
and is out of scope here.

## What `/demo` actually needs at runtime

- **No Gmail OAuth.** Nothing under `app/demo`, `app/api/demo`, or
  `utils/demo` calls Google's OAuth or Gmail API.
- **No Outlook OAuth.** Same - no Microsoft Graph/OAuth calls anywhere in the
  demo code path.
- **No database writes.** The demo seeds its own in-memory sample inbox and
  keeps all "applied rule" state in the browser (sessionStorage). Prisma is
  never touched by a request to `/demo/*`.

So at **request time**, `/demo` is fully self-contained. The catch is the
**build**, which still belongs to the original repo:

- The root `env.ts` validates a fixed set of environment variables at build
  time using Zod, and several of them (`DATABASE_URL`,
  `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, `EMAIL_ENCRYPT_SECRET`/`SALT`,
  `DEFAULT_LLMS`, `NEXT_PUBLIC_BASE_URL`) are required, not optional. This
  validation isn't demo-aware - it runs the same way regardless of which
  routes you actually intend to use.
- The `build` script in `apps/web/package.json` runs
  `prisma migrate deploy` before `next build`. That means the build needs a
  **real, reachable** Postgres connection string, even though `/demo` itself
  never queries it.
- `google-client-id`/`secret` are required-but-unused by the demo: they only
  satisfy `env.ts`'s validation so the build doesn't crash. No real Google
  OAuth flow is exercised unless someone deliberately visits the
  authenticated part of the app with those (fake) credentials, which won't
  work - and that's fine, because this deployment path isn't offering that.

## Why the crons and queues were removed for this deployment

`apps/web/vercel.json` originally shipped:

- 8 `crons` entries (several running every minute or every 15 minutes) -
  background jobs for the real app (scheduled actions, watch renewal,
  digests, meeting briefs, follow-up reminders, automation jobs, retention
  cleanup).
- A `functions` block wiring 5 routes to `queue/v2beta` experimental
  triggers - Vercel's queue primitive, also real-app-only background work.

None of this exists to serve `/demo` - the demo has no scheduled jobs and no
queues. On Vercel's Hobby plan, cron count/frequency is limited and can
outright fail the deploy; the queue triggers also depend on account-level
Vercel Queues access. Both were removed from `vercel.json` for this
demo-only deployment branch. If you later want the full real-mode app
running background jobs, restore them from git history rather than
recreating them by hand.

## Setup

1. Copy `apps/web/.env.example.demo` to your Vercel project's environment
   variables (or a local `apps/web/.env` for a preflight build). It documents
   every var below with the same rationale as this file.
2. Provision a free Postgres database (Neon or Supabase both work) and put
   its connection string in `DATABASE_URL`.
3. Generate secrets:
   ```bash
   openssl rand -hex 32   # EMAIL_ENCRYPT_SECRET
   openssl rand -hex 16   # EMAIL_ENCRYPT_SALT
   ```
4. Set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` to any non-empty
   placeholder (e.g. `demo-unused`) - they only need to pass validation.
5. Set `DEFAULT_LLMS="anthropic:claude-haiku-4-5-20251001"`.
6. (Optional but recommended) Set `ANTHROPIC_API_KEY` so the demo runs live
   AI instead of its deterministic fallback path.
7. (Optional) Set `UPSTASH_REDIS_URL` / `UPSTASH_REDIS_TOKEN` for
   cross-instance rate limiting and AI budget tracking. Without them, both
   fall back to an in-memory implementation scoped to a single serverless
   instance - correct and safe for a demo, just not distributed.
8. (Optional) Set `NEXT_PUBLIC_BRAND_NAME="Smart Inbox AI"` to white-label
   the rest of the app's UI copy away from the original "Inbox Zero" name.

## Minimal required env vars (7)

| Var | Purpose |
|---|---|
| `DATABASE_URL` | Build-time `prisma migrate deploy`; never queried by `/demo` at runtime |
| `NEXT_PUBLIC_BASE_URL` | Required client env var |
| `EMAIL_ENCRYPT_SECRET` | Required; also backs the demo rate-limit key hash |
| `EMAIL_ENCRYPT_SALT` | Required |
| `GOOGLE_CLIENT_ID` | Required by validation only - placeholder value, unused by `/demo` |
| `GOOGLE_CLIENT_SECRET` | Required by validation only - placeholder value, unused by `/demo` |
| `DEFAULT_LLMS` | Required; only takes effect if `ANTHROPIC_API_KEY` is also set |

## Deployment checklist

- [ ] Create a free Neon or Supabase Postgres database
- [ ] Copy its connection string into `DATABASE_URL`
- [ ] Generate `EMAIL_ENCRYPT_SECRET`: `openssl rand -hex 32`
- [ ] Generate `EMAIL_ENCRYPT_SALT`: `openssl rand -hex 16`
- [ ] Set all 7 required env vars in the Vercel project (Production + Preview)
- [ ] Optionally set `ANTHROPIC_API_KEY` for live AI
- [ ] Set the Vercel project's Root Directory to `apps/web`
- [ ] Deploy
- [ ] Visit `/demo`, `/demo/[emailId]`, and `/demo/rules` and confirm they load
- [ ] If you skipped `ANTHROPIC_API_KEY`, confirm the fallback messaging
      shows up instead of an error (e.g. "Demo AI isn't configured on this
      deployment")

## Local preflight before pushing to Vercel

```bash
# 1. A reachable Postgres, mirroring what the Vercel build needs
docker compose -f docker-compose.dev.yml up -d

# 2. Put the 7 required vars (see apps/web/.env.example.demo) into apps/web/.env,
#    pointing DATABASE_URL at the docker database

# 3. Run the same migration step the build performs
cd apps/web && pnpm prisma migrate deploy

# 4. Run the CI-aligned build (typecheck + next build, no migration step)
cd ../.. && pnpm --filter inbox-zero-ai build:ci

# 5. Serve it and check the demo
cd apps/web && pnpm start
# open http://localhost:3000/demo
```

If `build:ci` passes locally against a reachable database, the Vercel build
will pass too.

## Testing on a Vercel preview

`scripts/vercel-ignore-build.sh` skips preview builds on any branch other
than `main` or `staging` - on a feature branch or fork you'll otherwise see
"nothing deployed" with no clear error. Set
`FORCE_VERCEL_PREVIEW_BUILD="true"` in the Vercel project's env vars to
force the build to run anyway.

## Limitations of this deployment path

- This covers `/demo` only. The real, Gmail/Outlook-connected app is not
  configured by this guide and needs the full env var set from
  `apps/web/.env.example`.
- Background jobs (crons, queues) are intentionally not deployed here - see
  above.
- Without Redis, rate limiting and the AI budget guard are per-instance
  (in-memory), which is expected to reset on cold starts/redeploys. That's a
  fine tradeoff for a portfolio demo, not for production traffic.
