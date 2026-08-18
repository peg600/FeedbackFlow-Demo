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
`VERCEL_URL`, so each commit keeps the correct Better Auth origin. Local and
Production environments still require an explicit `BETTER_AUTH_URL`.
The Vercel project must expose System Environment Variables. Better Auth then
allows only the exact `BETTER_AUTH_URL`, `VERCEL_URL`, and `VERCEL_BRANCH_URL`
hosts for that deployment. Do not add an all-Preview `BETTER_AUTH_URL`; it would
add the same fixed host to every Preview deployment's trusted origins and weaken
branch isolation.

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
