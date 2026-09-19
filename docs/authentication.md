# Authentication and roles

The clinic uses one Supabase Auth tenant and one React application for patients, doctors, and admins. Supabase authenticates passwords and issues sessions. Express verifies each bearer token, then loads `public.profiles`; that database profile is the sole authority for the application role.

## Environment

Browser-safe variables belong in `apps/web/.env.local`:

```dotenv
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
VITE_API_BASE_URL=http://localhost:4000/api/v1
```

Server variables belong in `apps/api/.env`:

```dotenv
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
```

The URL and publishable key are designed for browser use. The secret key, database URLs, and database password are server-only and must never use a `VITE_` prefix. `SUPABASE_SECRET_KEY` is not needed for normal API token verification; it is used only by the trusted Admin Doctor invitation service.

## Patient signup provisioning

Migration `0001_auth_profile_sync.sql` installs an `AFTER INSERT` trigger on `auth.users`. It creates `public.profiles` in the same database transaction and hardcodes `PATIENT`. The browser sends only `full_name` and `phone`; even malicious role metadata is ignored.

If profile creation violates a database rule, the Auth user transaction fails rather than leaving a silently privileged or partially provisioned account. If an older Auth identity has no profile, `/auth/me` fails closed with `PROFILE_UNAVAILABLE`; it never invents a role.

## Request authorization

1. The browser sends `Authorization: Bearer <access token>`.
2. Express uses Supabase `getClaims()` to validate signature and expiry.
3. Express retrieves the matching active profile by verified subject UUID.
4. `requireRole()` compares the database role.
5. Feature services apply Patient ownership, treating-Doctor ownership, active-Doctor, and visit-note privacy checks.

Frontend guards prevent navigation flashes and redirect users to their own portal, but they are not a security boundary.

## Supabase dashboard configuration

In the project dashboard:

1. Open **Connect** and copy the Project URL and publishable key.
2. In **Authentication → URL Configuration**, set the Site URL to the deployed frontend URL.
3. Add `http://localhost:5173/**`, `http://localhost:5173/auth/set-password`, and the equivalent deployed application URLs to allowed redirect URLs.
4. In **Authentication → Providers → Email**, keep email/password enabled and choose whether email confirmation is required.
5. Apply pending migrations with `npm run db:migrate`.

The signup screen supports both modes: immediate sessions route to `/patient`; confirmation-required projects show a check-email state.

## Doctor invitations

`POST /api/v1/admin/doctors` is Admin-only and invokes Supabase Auth's server-side `inviteUserByEmail`. Supabase is the sole sender of this invitation; the clinic automation outbox intentionally does not enqueue a second invitation. The link redirects to `/auth/set-password`, where the browser SDK validates the invite session and calls Supabase `updateUser` so the Doctor chooses a private password.

Before testing, apply migrations and ensure the local and deployed `/auth/set-password` URLs are in Supabase Authentication → URL Configuration. Customize the Supabase invite template if desired, but retain its generated confirmation URL. Deactivation disables both the Doctor record and authoritative profile without deleting clinical history.

## Visit-note boundary

Visit-note routes are available only to the owning Patient and treating Doctor. A Doctor may create a note only for their own completed appointment. Admin appointment repositories use explicit projections that exclude note content, and no Admin route mounts a visit-note service.
