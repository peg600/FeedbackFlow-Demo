# FeedbackFlow Demo

A full-stack SaaS application built with Next.js.

## Architecture decision records

The [ADR index](docs/adr/README.md) records the context, alternatives, choices,
tradeoffs, and consequences behind technical decisions. Read the relevant records
before changing an established approach. Each new or revised technical decision
directly affecting project code must be documented alongside the change using the
[ADR template](docs/adr/template.md), with the index kept up to date.

Accepted decisions remain part of the history. Replace them with a new, linked
record when the approach changes instead of overwriting the original rationale.
See [AGENTS.md](AGENTS.md#21-技术决策记录adr) for the required workflow.
These records cover application architecture, data, security, interfaces, and
test architecture; personal development tools and documentation administration
are outside their scope.

## Code organization

Business code is grouped by feature under `src/features/`: components, actions,
schemas, and feature-owned `server/` modules live together. Feedback owns votes
and roadmap queries; Billing owns Paddle configuration, SDK access, checkout,
and subscription synchronization. Dashboard owns its reporting queries and URL
filters. Projects owns project creation, settings, access checks, and public
project cache invalidation.

Actions validate input, read the session, apply existing rate limits, invoke
business functions, and handle cache invalidation or redirects. Database queries
and transactions belong in the feature's server modules. Authenticated user IDs
passed to those modules come from server sessions, never from action input.

`src/server/` contains shared infrastructure: database/schema, authentication,
error translation, rate limiting, server environment validation, and the safe
action client. `src/components/` contains shared UI; `src/lib/` contains shared
support code. Server module names are an organizational convention, not an
automatic security boundary. Client code must not import them at runtime.
See [ADR 0013](docs/adr/0013-feature-owned-server-modules.md).

## Current product scope

Landing includes Features, Pricing, and links to the public demo `/p/demo`.
`/profile` is a static maker profile, not an editable account page. Public
roadmaps show up to four requests per status plus the total; View all opens the
existing filtered, paginated feedback board. Settings saves refresh the project
navigation and old/new public URLs, including feedback details.

Billing uses Paddle **Sandbox only**: authenticated transaction checkout,
customer portal, verified webhooks, local subscription entitlements, and recovery
through status refresh and a daily reconciliation job. Pro is USD 19/month with
no trial; final taxes are shown at checkout. No real money is charged, including
when this demo is hosted on Vercel Production. Password recovery and feedback
hide/restore controls are outside this implementation. Cloud setup and actual
sandbox checkout verification are separate from passing local tests.

## Local setup and verification

Use Node.js 24 and the pnpm version pinned in `package.json`.

```bash
pnpm install
pnpm db:migrate
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Migration commands change the explicitly configured database: inspect the target
first. Do not migrate Production without approval. The new shared limiter needs
`drizzle/0001_unknown_winter_soldier.sql` before login/signup or feedback writes
are used. Paddle billing additionally requires `drizzle/0002_paddle_billing.sql`
before enabling its environment variables. Build requires the existing Google-hosted Inter font to be reachable
and valid server environment variables; a successful build alone does not prove
that a deployment has been migrated.

## Isolated Neon integration and browser tests

Use a dedicated **test branch**, separate from develop, preview, and production.
Creating a branch/compute consumes Neon quota and requires project-owner approval.
Never run tests on a production snapshot branch unless it is the explicitly
approved, isolated test target; tests preserve copied records and clean only
their own uniquely identified fixtures.

Put these server-only values in ignored `.env.test.local`:

```dotenv
TEST_DATABASE_URL=
TEST_DATABASE_URL_UNPOOLED=
TEST_DATABASE_EXPECTED_HOST=
TEST_DATABASE_GUARD_TOKEN=
TEST_BETTER_AUTH_SECRET=
```

Verify the test branch and its endpoint in Neon first. `TEST_DATABASE_EXPECTED_HOST`
is the exact direct endpoint hostname, not a connection string or branch name.
Pooled/direct URLs must select the same database. The guard rejects known local
application endpoints from development/production env files; it never loads those
files as a fallback test connection.

Before the first test migration, an operator must initialize the following marker
**only on the confirmed test branch**, using a cryptographically random token of
at least 32 characters. Store the token in `TEST_DATABASE_GUARD_TOKEN`, and store
only its SHA-256 hex digest in the table below. Do not commit or print the token.
Do not run this SQL on any application branch. This extra marker is intentionally
not part of application migrations: a copied production URL must not become an
approved test target merely by running a migration.

```sql
CREATE TABLE public.__feedbackflow_test_guard (
  id integer PRIMARY KEY CHECK (id = 1),
  token_hash text NOT NULL CHECK (token_hash ~ '^[a-f0-9]{64}$')
);
INSERT INTO public.__feedbackflow_test_guard (id, token_hash)
VALUES (1, '<SHA-256 hex digest of the test-only token>');
```

```bash
pnpm db:test:migrate
pnpm test:integration
pnpm exec playwright install chromium
pnpm test:e2e
```

All three commands require the endpoint allowlist and matching database marker
before test writes/migrations. They fail instead of falling back when configuration
is missing. Playwright uses port 3100, one worker, its own server, and an independent
auth secret of at least 32 characters; it never reuses your running dev server.
The suites cover uniqueness, concurrent quota/votes, shared rate limits, repeated
seed execution, the core browser flow, a replayed unauthorized Server Action,
and responsive navigation/layout. Unit tests require no database.

## Idempotent public demo seed

First apply the reviewed migrations to the intended environment. Prepare a
separate ignored `.env.seed.local` containing `DATABASE_URL_UNPOOLED`,
`BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `DEMO_USER_EMAIL`, `DEMO_USER_PASSWORD`,
and `DEMO_SEED_CONFIRM=true`. Use a direct connection, a strong unique password,
and explicitly verify the target before running:

```bash
node --env-file=.env.seed.local scripts/run-seed-demo.mjs
```

Alternatively, export these values securely and run `pnpm seed:demo`. The seed
does not implicitly load development or production env files. It creates a
Better Auth credential account and a fixed `/p/demo` project, with feedback in
all four statuses. Existing credentials must match; conflicting Slug/IDs fail
safely. Repeat execution only fills missing records, preserves edits, and respects
the 50-item quota under the same transaction lock as regular feedback submission.
If the seeded project was renamed or made private, resolve that deliberately;
the script does not reset user changes. No secret is printed. Public browsing
requires no demo password; do not publish the owner's credential.

Creating accounts, seeding Production, or deploying to Production requires
separate confirmation. The migration and seed are not automatically run by
application requests or build commands.

## Shared abuse limits

Feedback creation allows 5 attempts/minute per authenticated user, and voting
30 attempts/minute per user. Both use a database-time fixed window with an atomic
UPSERT, outside the business transaction. Rejected business attempts still consume
capacity. Authentication uses Better Auth's native HTTP 429 response with shared
Postgres storage: email sign-in 10/minute, signup 5/minute, and built-in sensitive
endpoint rules are retained. Random catch-all paths share bounded key classes.

Only HMAC-derived keys are stored, and expired rows are cleaned in bounded batches.
On Vercel, the limiter uses the platform's `x-vercel-forwarded-for` header; see
[Vercel request headers](https://vercel.com/docs/headers/request-headers#x-vercel-forwarded-for).
Outside Vercel, forwarded headers are not trusted and authentication uses a shared
fallback bucket; configure a verified proxy policy before self-hosting publicly.
These application controls complement, not replace, platform DDoS protection.

## Authentication setup

FeedbackFlow uses Better Auth email/password authentication with database-backed
sessions. Copy `.env.example` to `.env.local`, then provide a pooled Neon
`DATABASE_URL`, a direct `DATABASE_URL_UNPOOLED`, and these server-only values:

```dotenv
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=
```

Generate a secret with a cryptographically secure secret generator. It must be
at least 32 characters. Never commit the secret or expose it through a
`NEXT_PUBLIC_` variable. Use different secrets for local, Preview, and
Production, and keep the Production secret stable after launch.

Vercel Preview deployments use a branch-scoped `BETTER_AUTH_URL` when one is
configured. Other Preview branches fall back to the current deployment's
`VERCEL_URL`, so each commit keeps the correct Better Auth origin. Production
must set `BETTER_AUTH_URL` to its canonical public origin, while local
development uses its explicit localhost URL.

The Vercel project must expose System Environment Variables. On both Preview
and Production deployments, Better Auth uses Dynamic Base URL and allows only
the exact `BETTER_AUTH_URL`, `VERCEL_URL`, and `VERCEL_BRANCH_URL` hosts for that
deployment. This supports canonical, branch, and generated deployment URLs
without trusting every `*.vercel.app` host. Do not add an all-Preview
`BETTER_AUTH_URL`; it would add the same fixed host to every Preview deployment's
trusted origins and weaken branch isolation.

Generate and apply auth schema changes through the existing Drizzle workflow:

```bash
pnpm auth:generate
pnpm db:generate
pnpm db:migrate
```

Review generated SQL before running `db:migrate`, and use the direct Neon URL
only for migrations. Application requests use the pooled URL.

The application uses Better Auth's database-backed session model and a
transaction-capable Neon connection for atomic user, credential, and session
writes. Production
deployments must use an HTTPS `BETTER_AUTH_URL`. Email ownership is not verified
in the core demo, so `emailVerified` must not be treated as proof of identity.
Authentication and feedback writes use PostgreSQL-backed shared rate limiting.
Apply all Drizzle migrations before running this version; an unavailable rate-limit
store does not silently permit writes. Platform/WAF protection is still useful
against volumetric abuse; application limits are not DDoS protection.

## Action results and errors

Application mutations (project creation/settings, feedback creation,
voting, owner status updates, and billing actions) use `next-safe-action`. They accept validated
objects and return the library's native result branches:

- `data`: successful business data. Creation actions navigate after success.
- `validationErrors`: Zod failures in the flattened
  `{ formErrors, fieldErrors }` format.
- `serverError`: a safe `{ code, message, requestId, field? }` payload for
  expected business failures or unexpected server failures.

The business error catalog is in `src/lib/errors.ts`. Services raise business
errors without depending on Next.js; `src/server/safe-action.ts` handles the
public result and sanitized diagnostic logging. Client code branches on `code`,
never on message text. Field-specific business errors such as
`PROJECT_SLUG_TAKEN` are presented beside the matching input.

`src/server/errors/database.ts` uses `pg-error-enum` to identify PostgreSQL
SQLSTATE codes, including errors wrapped by Drizzle. Rules match the operation
and exact constraint as well as the SQLSTATE. An unknown database error is not
automatically treated as invalid user input. Logs must never contain raw SQL,
query parameters, credentials, session cookies, or submitted form data.

To add a business error, add its stable code and safe message to the catalog,
then raise it at the service boundary. If a database constraint can produce the
same failure, add an operation-scoped mapping and a regression test. Keep
database exception handling outside transactions so failures still roll back.
Project creation and voting retain their existing `onConflictDoNothing`
behavior for repeated/concurrent submissions.

Better Auth retains its own HTTP protocol. Its client error codes are mapped to
owned messages in `src/features/auth/auth-error.ts`; upstream error messages are
not rendered directly. The Paddle webhook is a Route Handler with raw-body
signature verification and atomic event deduplication, not a Server Action. Read-only Server Components continue to use
Next.js error and not-found boundaries.

`design/` and most of `docs/` contain local working material excluded from Git.
Markdown records under `docs/adr/` are included in version control.

Client forms share `getActionFieldError` and `getActionErrorMessage` from
`src/lib/action-errors.ts`; transport failures use `ACTION_NETWORK_ERROR`.
Components still render their own inline messages. There is no global automatic
toast handler or shared hook that wires every form's errors into the UI.
Next.js navigation signals remain navigation, rather than being converted into
`serverError` responses.

The maintained repository rules are in [AGENTS.md](AGENTS.md#71-统一错误处理约定).
For local study, the ignored `docs/backend-handbook/14-error-handling.md` explains
the complete request flow, the Slug conflict example, and how to add new errors.
This local handbook is not included in a fresh clone.

## Paddle Sandbox setup

This implementation replaces the former Stripe placeholder. See
[ADR 0010](docs/adr/0010-paddle-sandbox-billing.md),
[local entitlements and reconciliation](docs/adr/0011-local-entitlements-and-reconciliation.md),
and [customer ownership and checkout recovery](docs/adr/0012-paddle-customer-and-checkout-ownership.md).
Paddle Node SDK handles server API calls and signature verification; Paddle.js
opens a checkout for a transaction created by the authenticated server action.
Installing or authenticating an MCP server does not configure the app's runtime
credentials, catalog, database, or notification destination.

1. Apply reviewed migrations through `pnpm db:migrate` to the intended development
   database. Apply them separately to the guarded test branch with
   `pnpm db:test:migrate`. Review and approve any Production migration separately.
2. In the **Paddle Sandbox** dashboard, create an active Pro product and recurring
   price: **USD 19.00, every one month, no trial**, quantity one. Set its appropriate
   product tax category. The server verifies amount, currency, cadence, and trial
   settings before checkout; changing the plan requires a coordinated code change.
3. Create a sandbox API key with `customer.read`, `customer.write`, `price.read`,
   `transaction.read`, `transaction.write`, `subscription.read`, and
   `customer_portal_session.write`. Use a separate key for catalog administration.
   Create a sandbox client-side token. Configure the default payment link under
   Checkout settings as `https://<your-app-origin>/dashboard/billing`; for local
   development use the permitted local URL or a secure tunnel. See
   [Paddle checkout setup](https://developer.paddle.com/build/checkout/build-overlay-checkout/)
   and [API permissions](https://developer.paddle.com/api-reference/about/permissions/).
4. Create an active Notification Destination for
   `https://<your-app-origin>/api/paddle/webhook` (a public HTTPS tunnel for local
   development). Select `subscription.created`, `subscription.updated`,
   `subscription.activated`, `subscription.canceled`, `subscription.paused`,
   `subscription.resumed`, `subscription.past_due`, `subscription.trialing`, and
   `transaction.completed`. Use the secret belonging to **that destination**.
   Delivery must reach the handler without a login or Vercel deployment-protection
   challenge; configure the endpoint deliberately, not a blanket public bypass.
5. Store the following values only in ignored local env files or the deployment's
   environment settings, then restart/redeploy. Never paste secrets into source,
   issues, logs, or chat:

| Variable | Value and visibility |
| --- | --- |
| `PADDLE_API_KEY` | Server-only sandbox key, prefix `pdl_sdbx_apikey_` |
| `PADDLE_NOTIFICATION_WEBHOOK_SECRET` | Server-only destination signing secret |
| `PADDLE_PRICE_ID_PRO` | Sandbox monthly Pro price ID, prefix `pri_` |
| `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` | Public sandbox token, prefix `test_`; this is not an API key |
| `CRON_SECRET` | Server-only random secret, at least 32 characters |

Use isolated databases and Paddle sandbox accounts/catalogs or appropriately
separated customers/destinations across local, Preview, and Production. Never
reuse real customer records for tests. Every deployed environment remains in
**Sandbox**, even Vercel Production. Live credentials are rejected. With missing
or invalid Paddle settings, public browsing and Free remain available; Checkout
is disabled and the webhook returns 503. Existing Pro access also fails closed,
so avoid changing these variables independently on a configured deployment.

## Checkout, permissions, and recovery

`Upgrade to Pro` authenticates the user, checks project ownership and rate limits,
binds a Paddle Customer, persists a checkout intent, and creates/reuses its
transaction. Only that server-returned transaction is passed to Paddle.js.
The default-payment-link `_ptxn` parameter is removed before SDK initialization;
the user resumes their own saved checkout using the Billing button. Arbitrary
transaction links cannot select another user's checkout.
Paddle-generated payment-update links are not automatically opened by this page;
use the authenticated Customer Portal to resolve an existing subscription's
payment method. Supporting emailed transaction links would require an additional
server-side ownership-checked entry point.

Payment returns to `/dashboard/billing?checkout=return`; a refresh during payment
can also recover from the persisted intent. Neither this parameter nor the
browser completion event grants Pro. The page polls the local status every three
seconds for up to 20 attempts, with provider reconciliation at the beginning/end.
Once confirmed, it refreshes Billing and the dashboard plan label. After timeout,
it explains the delay and offers `Refresh status`; do not start a second purchase
after paying. Requests are serial, so slow responses extend the elapsed time.

Verified webhook processing records the event and subscription change atomically.
Duplicate events have no additional effect; older snapshots cannot overwrite newer
ones. Server-side API reconciliation uses the same subscription writer. The
ordinary feature authorization path reads the local database, never Paddle per
request. Pro requires the configured price, active status, an unexpired billing
period, and no effective cancellation/pause. This demo deliberately grants no
trial or past-due grace period. A scheduled end-of-period cancellation preserves
Pro until its effective time. Free permits 50 feedback items; Pro removes that
limit. Expiry preserves existing feedback but blocks new items above the Free cap.

`Manage billing` creates a fresh authenticated Paddle Customer Portal session for
the current user's bound customer. Use it for invoices/history, payment-method
changes, and cancellation. Returning/focusing Billing or pressing `Refresh status`
reconciles the result. Existing active, trialing, paused, or past-due subscriptions
must be managed there rather than bought again. Because email ownership is not
verified in this demo, a same-email customer without the server's provisioning
marker is a conflict requiring operator review; email matching never grants
portal access.

For an unknown Customer/Transaction POST result, recovery searches the provider
before any retry. A complete search with no match can release the intent after
five minutes during reconciliation; a subsequent explicit Upgrade creates a new
one. Delayed results from an abandoned attempt cannot be opened. Do not manually
delete customer bindings, mark payments successful, or grant Pro to clear a wait.

## Scheduled reconciliation and troubleshooting

`vercel.json` schedules authenticated `GET /api/cron/billing-reconcile` daily at
03:00 UTC. Vercel owns the schedule: no in-process timers or restart hooks are
needed. Cron runs on **Production deployments only**; Preview/local require an
explicit authenticated request. Vercel supplies `Authorization: Bearer <CRON_SECRET>`.
Hobby timing is approximate and failed invocations are not automatically retried;
see [Cron limitations](https://vercel.com/docs/cron-jobs/usage-and-pricing) and
[management](https://vercel.com/docs/cron-jobs/manage-cron-jobs).

A run handles up to 50 least-recently-attempted customers, stops starting work
after four minutes, and has a five-minute function limit. One customer's failure
does not prevent later customers being attempted. Responses contain only counts
and `hasMore`; a partial failure returns 503. This is a bounded demo safety net,
not a promise to refresh every customer daily at larger scale. Monitor failures
and backlog, then introduce pagination/more frequent scheduling if needed.

| Symptom | Checks and recovery |
| --- | --- |
| Checkout disabled | Confirm all sandbox variables, price format, and migration 0002; redeploy after env changes. |
| Checkout cannot start | Check API-key permissions, active monthly USD 19 price, default payment link, and Paddle.js network access. |
| Paid but still Free | Use Refresh status; inspect notification delivery and local subscription period/status. Check destination secret, server clock, correct environment, and database connectivity. Replay failed notifications from Paddle after fixing the cause. |
| Webhook 503 | Check configuration, original request body/signature, clock skew, migration and DB availability; retries must reach the handler. Logs contain only safe correlation/event fields. |
| Customer conflict | Check the server provisioning marker and account ownership manually; never bind an existing customer merely by matching email. |
| Cron 401/503 or backlog | Check `CRON_SECRET`, Production deployment, Paddle access, provider rate limits and Vercel duration; rerun with secure authorization after resolving failure. |

## Billing verification

Unit/component tests cover signature verification, invalid/future/stale signatures,
configuration, entitlements, Session ownership, polling/timeout behavior, and cron
authorization. `tests/integration/billing.test.ts` exercises real guarded Postgres
transactions with a mocked provider: concurrent checkout, unknown-result recovery,
event rollback/deduplication/order, historical subscriptions, and Free/Pro quota.
These tests do not substitute for a real Paddle Sandbox checkout.

For manual sandbox acceptance, use the official
[Paddle test cards](https://developer.paddle.com/sdks/sandbox/):
`4242 4242 4242 4242`, future expiry, security code `100`; the decline card is
`4000 0000 0000 0002`. Verify successful payment, decline/retry, refresh during
payment, delayed/replayed notifications, two simultaneous Upgrade clicks,
Portal cancellation, expired access, and the 51st feedback submission. Verify
another account cannot manage the first account's customer or subscription.
Use sandbox notification replay/simulation for lifecycle changes, never live cards.

Implementation verification on 2026-09-21: lint, TypeScript, and 191 unit/component
tests across 49 files passed. Production build passed with the existing
`.env.local` values explicitly loaded into the build process and font network
access enabled. Plain `pnpm build` was blocked by the pre-existing empty
`BETTER_AUTH_SECRET` in `.env.production.local`; no environment file was modified.
The database suite was attempted but its guard stopped execution
because `.env.test.local` / `TEST_DATABASE_URL` is absent. Migration 0002 had not
yet been applied to Neon. At that time, Paddle MCP tools and runtime credentials
were unavailable, so external setup and payment verification were not performed.

Sandbox setup verified on 2026-09-22: registered `paddle-sandbox` using a bearer
token environment variable and verified the remote MCP handshake and API calls.
Created and read back **FeedbackFlow Pro**, tax category `saas`, with an active
**USD 19/month** price, no trial, quantity fixed to one, tax calculated separately.
Created an active sandbox client-side token. The price ID, client token, local
sandbox API key, and a random Cron secret are stored in the ignored, untracked
`.env.local`; no credentials are stored in this document or MCP configuration.
The catalog administration key is used only for local sandbox setup/testing;
use the separate least-privilege runtime key described above for deployments.
Native MCP tool discovery may require restarting Codex; these setup calls were
verified directly against the registered remote MCP endpoint.

The callback environment still needs to be selected before configuring a
Notification Destination and its signing secret. Runtime API permission checks,
default payment link, test-card checkout, Portal,
remote webhook delivery, Cron deployment, and browser E2E remain unverified.
Local configuration alone does not mean that the payment flow is ready.

Development migration verified on 2026-09-23: applied `0002_paddle_billing`
through Drizzle Kit using the direct Neon connection configured in `.env.local`,
after confirming it differs from the Production endpoint. The preflight verified
the 0000/0001 ledger entries and absence of the four Billing tables. Post-migration
checks confirmed the 0002 ledger hash, all four new tables, four primary keys,
three foreign keys, six explicit indexes, and the customer-ID unique constraint;
existing table columns were unchanged. Production and the dedicated test database
were not migrated. Lint, TypeScript, and all 201 unit/component tests across 50
files passed. No application code, schema definition, or build configuration
changed, so a production build was not rerun. Database integration tests and
Sandbox end-to-end payment verification remain pending.

## Function comments

Add a short Chinese purpose comment immediately above each substantial or
complex function, usually one or two sentences. Cover the business purpose and,
where useful, ownership checks, transaction/concurrency boundaries, error
translation, or side effects. This also applies to business components, action
declarations, and nontrivial internal callbacks.

Avoid comments that merely repeat the code. Simple wrappers, obvious one-line
helpers, static presentation, test case callbacks, and generated code do not
need mechanical annotations; complex test helpers still do. Keep comments in
sync with implementation and never include secrets. Existing accurate English
inline comments may remain; user-facing UI text and commit messages stay in
English. See [AGENTS.md](AGENTS.md#15-语言相关) for the project rule.
