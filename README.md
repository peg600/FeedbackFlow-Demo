# FeedbackFlow Demo

A full-stack SaaS application built with Next.js.

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
Before public deployment, add shared rate limiting at the platform or WAF layer;
Better Auth's in-memory limiter is not shared across serverless instances.

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

`design/` and `docs/` contain local working material and are excluded from Git.

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
