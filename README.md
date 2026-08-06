# Trabuom Stool Lands — Land Management System

Standalone Next.js 14 app for `tsl.getoneplot.com`. Fully independent codebase (no
imports from the parent `get-plot` repo) that shares get-plot's **Supabase project**
and **Clerk instance** — see `.env.local.example` for exactly which values to reuse
vs. which are new.

## First-time setup

1. **Copy env file**: `cp .env.local.example .env.local` and fill in values —
   most are copy-pasted from get-plot's own `.env.local` (see comments in the
   file for which ones), plus new R2 credentials.

2. **Run the SQL migrations** against the *same* Supabase project get-plot
   uses (Supabase dashboard → SQL editor, run in order):
   - `supabase/migrations/001_add_owner_to_trabuom.sql` — adds an `owner`
     column (`'tsl' | 'lhc'`) to the existing `trabuom` table. **You still
     need to backfill which plot numbers belong to which owner** — see the
     comment at the bottom of that file. Until backfilled, the dashboard
     will correctly show zero plots rather than guessing.
   - `supabase/migrations/002_create_tsl_tables.sql` — `tsl_allocations`,
     `tsl_transfers`, `tsl_audit_log`.
   - `supabase/migrations/003_create_tsl_staff.sql` — small mirror table
     used by the Staff & Roles page.

3. **Clerk satellite domain**: this app shares get-plot's Clerk instance
   (so a get-plot `sysadmin` account works here automatically). Required
   one-line change on the **get-plot side** (not made by this build, to
   keep this folder independent): add `allowedRedirectOrigins` to
   get-plot's `<ClerkProvider>` in `app/layout.jsx`, e.g.
   `allowedRedirectOrigins={["https://tsl.getoneplot.com"]}`.
   Also confirm in the Clerk dashboard that **phone number**, **email +
   password**, and **Google** are all enabled as sign-in methods — that's
   dashboard configuration, not app code.

4. **Cloudflare R2**: create a bucket (e.g. `trabuom-sl`), enable public
   access or a custom domain for it, and generate an API token scoped to
   that bucket for `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY`.

5. **Grant the first `sysadmin`/`tsl_admin`**: since role assignment itself
   happens through the app's own Staff & Roles page (which requires an
   admin to already exist), bootstrap the first account manually — sign in
   once via `/sign-in`, then set that user's `publicMetadata.role` to
   `sysadmin` directly in the Clerk dashboard. After that, all further
   role assignment can happen through `/dashboard/users`.

6. `npm install && npm run dev`

## What this app assumes (v1, easy to change)

- **Plot layout**: reuses the existing `trabuom` (Sector 1) table, filtered
  to `owner = 'tsl'`. Per the brief, this is a placeholder layout — swap it
  out later by changing `PLOT_TABLE` in `lib/plots.js`.
- **Roles**: `sysadmin`, `tsl_admin`, `tsl_secretary`, `tsl_queen`,
  `tsl_chief`, stored in the same Clerk `publicMetadata.role` field
  get-plot uses. Permission matrix lives in one place: `lib/roles.js`.
  Current v1 assumption: secretary + admin (+ sysadmin) can allocate and
  transfer plots; queen + chief have oversight/read access (map, audit
  trail) but don't perform allocations themselves — adjust the
  `PERMISSIONS` object there if that's wrong.
- **Allocation document**: `lib/pdf.js` generates a generic placeholder
  layout. Swap in Trabuom Stool Lands' real template by editing that one
  function — every caller passes the same data shape.
- **Transfer payment**: recorded only (amount, method, reference,
  recorded-by, timestamp) — no live payment gateway in v1, per your answer.
- **Notifications**: queen/chief/surveyor are plain email/phone entries in
  `NOTIFY_EMAILS` / `NOTIFY_PHONES` env vars (no contacts table yet, since
  the data model is expected to grow).
