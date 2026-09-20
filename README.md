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

## Current product scope

Landing includes Features, Pricing, and links to the public demo `/p/demo`.
`/profile` is a static maker profile, not an editable account page. Public
roadmaps show up to four requests per status plus the total; View all opens the
existing filtered, paginated feedback board. Settings saves refresh the project
navigation and old/new public URLs, including feedback details.

Billing, Checkout, Portal, and Stripe webhooks remain placeholders. Pricing is
a preview, not an offer to charge a card. Password recovery and feedback
hide/restore controls are outside this implementation.

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
are used. Build requires the existing Google-hosted Inter font to be reachable
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

The five application mutations (project creation/settings, feedback creation,
voting, and owner status updates) use `next-safe-action`. They accept validated
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
not rendered directly. The Stripe webhook remains an unimplemented HTTP 501
endpoint, not a Server Action. Read-only Server Components continue to use
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
