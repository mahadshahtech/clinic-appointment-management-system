# Database foundation

The application uses Supabase PostgreSQL, Drizzle ORM, Postgres.js, and versioned SQL migrations. All actual appointments use `timestamptz`; recurring working hours remain clinic-local integer minutes interpreted in `Asia/Karachi`.

## Schema and relationships

- `profiles` — application identities mapped one-to-one to `auth.users.id`; the database role is authoritative.
- `doctors` — one professional record per doctor profile.
- `doctor_working_hours` — recurring weekday ranges using `day_of_week`, `start_minute`, and `end_minute`.
- `doctor_leave` — one full-date leave record per doctor/date.
- `appointments` — patient/doctor visits with a six-state status enum.
- `appointment_events` — immutable appointment audit records. Application code must only insert; update/delete permissions will not be exposed.
- `visit_notes` — one note per appointment. A composite foreign key guarantees the stored doctor and patient match the appointment parties.
- `automation_events` — transactional outbox with a unique idempotency key.

Foreign keys use restrictive deletion for clinical history. The one exception is a deleted event actor reference, which becomes null while the audit event remains.

Visit-note content is intentionally absent from the clinic/admin appointment projection in `src/db/repositories/admin-appointment-fields.ts`. Future admin repositories must use explicit projections and must never join or return `visit_notes.content`.

## Critical database guarantees

- Weekdays are limited to `0–6`.
- Working-hour boundaries are within one day, ordered, and divisible by 30.
- A GiST exclusion constraint using `int4range` and `btree_gist` prevents overlapping working hours during concurrent writes.
- Doctor leave is unique per doctor/date.
- Appointment end time must be exactly 30 minutes after start time.
- Partial unique indexes reserve a doctor slot and a patient time only while status is `PENDING` or `CONFIRMED`.
- `COMPLETED`, `NO_SHOW`, `CANCELLED`, and `REJECTED` rows remain as history without holding the slot.
- Automation idempotency keys are globally unique.
- `updated_at` triggers maintain modification timestamps for mutable records.
- A trigger rejects updates and deletes against appointment audit events.
- Row Level Security is enabled on every application table with no browser policies. Supabase Data API access to application tables is denied; the Express backend is the only application data gateway.

Collision protection belongs in PostgreSQL because an application-only availability check can race: two requests can both observe an empty slot before either inserts. PostgreSQL unique/exclusion constraints serialize the conflicting writes and allow only one to commit.

## Environment variables

Copy `.env.example` to `.env`.

- `DATABASE_URL` — server-only application connection. A Supabase transaction pooler is appropriate for serverless deployment; a session/direct connection is appropriate for a persistent API.
- `DATABASE_MIGRATION_URL` — server-only direct or session connection used by Drizzle migration tooling. It falls back to `DATABASE_URL` when omitted.
- `TEST_DATABASE_URL` — server-only URL for a separate disposable test database.
- `RUN_DATABASE_TESTS=true` — explicit safety switch required before destructive database integration-test setup runs.

None of these values are safe for frontend use. Never add `VITE_` to a database URL, database password, or service-role credential.

The Postgres.js client disables prepared statements for transaction-pooler compatibility and requires TLS for non-local hosts.

## Migration commands

```bash
npm run db:generate   # Generate a migration after schema changes
npm run db:migrate    # Apply committed migrations
npm run db:studio     # Inspect development data with Drizzle Studio
```

Generated SQL must be reviewed before it is committed. PostgreSQL-native additions such as exclusion constraints and trigger functions may need explicit SQL because they are not fully represented by Drizzle's TypeScript schema DSL.

The initial migration is `apps/api/src/db/migrations/0000_unknown_shen.sql` and enables the standard Supabase-compatible `btree_gist` extension.

## Development seed

```bash
npm run db:seed
```

The seed is deterministic and idempotent. It adds an admin profile, two doctors, two patients, and representative working hours. It refuses to run when `NODE_ENV=production`.

Seed profiles are deterministic database-only demo records and are not automatically login accounts. Real identities are provisioned through Supabase Auth so application profile IDs equal `auth.users.id`. Do not use seed UUIDs as credentials or production identities.

## Database integration tests

The database suite deliberately does not fall back to the normal `DATABASE_URL` because it truncates application tables between cases. Use a separate disposable database:

```bash
RUN_DATABASE_TESTS=true TEST_DATABASE_URL=postgresql://... npm run test:db
```

On PowerShell:

```powershell
$env:RUN_DATABASE_TESTS='true'
$env:TEST_DATABASE_URL='postgresql://...'
npm run test:db
```

The suite migrates the test database and verifies checks, exclusion constraints, partial unique indexes, outbox idempotency, terminal-status slot release, and simultaneous collision behavior.

## Reset and rebuild

For a disposable local/test database, recreate the database and run:

```bash
npm run db:migrate
npm run db:seed
```

If the Supabase CLI is adopted later, `supabase db reset` can rebuild the linked local development database from migrations. Do not reset a hosted production project. For hosted development, prefer a fresh project/database when a destructive rebuild is required, then apply committed migrations.

## Supabase Auth mapping

Supabase stores identities in the protected `auth.users` schema. The application stores role and profile data in `public.profiles`; its primary key receives the authenticated user's UUID. Patient provisioning is performed by the committed Auth trigger and always assigns `PATIENT`; trusted Admin Doctor invitations provision `DOCTOR`. Browser-provided role values are never authoritative.
