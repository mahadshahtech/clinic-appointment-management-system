# Nowshera Family Clinic

A unified, responsive clinic appointment and patient-management system for Patients, Doctors, and Administrators. The monorepo contains one React SPA, one Express REST API, shared TypeScript contracts, Supabase PostgreSQL/Auth, and a durable appointment-email worker with optional n8n delivery.

## Architecture

- `apps/web` — React, Vite, TypeScript, React Router, TanStack Query, React Hook Form, Tailwind CSS, and Framer Motion.
- `apps/api` — Express, TypeScript, Drizzle ORM, Supabase JWT verification, role/ownership authorization, and the automation worker.
- `packages/contracts` — shared Zod request/response contracts and domain types.
- `apps/api/src/db/migrations` — committed schema, constraints, triggers, profile provisioning, RLS, and audit tables.
- `docs/n8n` — importable n8n appointment-email workflow template.

All roles use the same website and authentication system. Express verifies the Supabase token and loads the authoritative role from `public.profiles`; frontend route guards are UX only.

## Prerequisites and installation

- Node.js 22 or newer
- npm 10 or newer
- A Supabase project with PostgreSQL and email/password Auth

```powershell
npm install
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env.local
```

Replace placeholders only in ignored local env files. Never put server secrets in a `VITE_*` variable.

## Environment variables

Browser-safe variables in `apps/web/.env.local`:

- `VITE_API_BASE_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Server-only variables in `apps/api/.env`:

- `NODE_ENV`, `PORT`, `WEB_ORIGIN`, `LOG_LEVEL`
- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`
- `DATABASE_URL`, `DATABASE_MIGRATION_URL`
- `EMAIL_DELIVERY_MODE` (`console` or `n8n`)
- `N8N_EMAIL_WEBHOOK_URL`, `N8N_WEBHOOK_SECRET`
- `AUTOMATION_POLL_INTERVAL_MS`, `AUTOMATION_BATCH_SIZE`, `AUTOMATION_RUN_ONCE`

`TEST_DATABASE_URL` and `RUN_DATABASE_TESTS` are only for a separate disposable test database. Never point destructive integration tests at a development or production Supabase database.

## Run locally

```powershell
# Web and API together
npm run dev

# Or separately
npm run dev:web
npm run dev:api

# Automation worker in another terminal
npm run automation:worker
```

- Web: `http://localhost:5173`
- API health: `http://localhost:4000/api/v1/health`

Build the API before starting the production-style worker after source changes:

```powershell
npm run build --workspace @nfc/api
npm run automation:worker
```

## Database

```powershell
npm run db:migrate
npm run db:seed       # deterministic development/demo data; refuses production
npm run db:studio
```

The database enforces 30-minute appointments, non-overlapping working hours, Doctor and Patient live-slot uniqueness, immutable appointment audit events, visit-note relationships, and outbox idempotency. RLS is enabled on application tables with no browser policies; Express is the application data gateway.

## Roles

- Patient — self-signup, Doctor directory/availability, booking, cancellation/rescheduling, own history, and own visit notes.
- Doctor — own appointments, recurring schedule, leave, treated-patient history, status transitions, and notes for completed visits.
- Admin — clinic dashboard, appointment oversight, Doctor invitation, and activation management. Admin APIs never select visit-note content.

## n8n appointment email delivery

Set `EMAIL_DELIVERY_MODE=n8n` in the server env and configure the published production webhook URL and a rotated shared secret. Run the worker as a separate long-running process. It sends `x-nfc-webhook-secret` and `idempotency-key`; n8n owns SMTP/provider credentials. Do not put n8n or SMTP secrets in the browser environment.

The transactional outbox supports confirmation, rejection, patient/leave cancellation, day-before reminders, pending expiry, retry/backoff, stale-reminder protection, and duplicate prevention. See [docs/automation.md](docs/automation.md).

## Verification

```powershell
npm run typecheck
npm test
npm run build
```

The normal suite is non-destructive. Guarded database integration tests are documented in [docs/database.md](docs/database.md) and require an explicitly configured disposable database.

Further documentation:

- [Authentication and roles](docs/authentication.md)
- [Database and constraints](docs/database.md)
- [Scheduling and availability](docs/scheduling.md)
- [Automation and n8n](docs/automation.md)

## Deployment requirements

Deploy the SPA with history fallback to `index.html`, deploy the API with server-only environment variables and the trusted web origin, apply migrations before serving traffic, and run one or more safe concurrent worker processes. Database claims and idempotency prevent duplicate processing. Keep Supabase redirect URLs synchronized with the deployed `/auth/set-password` route.
