# Workspace Pribadi Implementation Plan

**Goal:** Isolate user workspaces and permit superadmin activity monitoring without exposing workspace contents.

**Architecture:** Owner UUID is derived from the verified token for all workspace records and enforced on every server-side query. Migration backfills only unambiguous ownership, quarantines uncertain records with null owner, and enforces attendance ownership. Private storage must validate owner paths and use authenticated access.

**Tech Stack:** PostgreSQL, Supabase, Express, TypeScript, Next.js.

## Tasks

1. Verify migration using an isolated PostgreSQL database with legacy records and two owners. Add ownership columns, safe backfill, composite attendance foreign key, indexes, and isolation reporting; preserve unmatched records.
2. Scope every workspace API query and mutation to the authenticated owner, including duplicates, imports, attendance relationships and recap. Allow each user to manage their own umat. Return 404 for cross-owner IDs. Keep announcements and reference scripture shared.
3. Limit administrator audit responses to metadata. Remove frontend rendering of audit snapshots; make the umat page available to all active workspace owners.
4. Replace public background storage with owner-scoped private storage and signed access. Prevent references to paths belonging to another account, and plan safe migration of existing public images before disabling public access.
5. Exercise two authenticated accounts against an isolated test Supabase deployment for authorization and image paths; run SQL migration tests and builds. Do not apply to production or claim isolation if dependencies and migration are not available.
