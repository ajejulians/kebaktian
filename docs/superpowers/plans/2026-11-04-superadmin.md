# Superadmin Implementation Plan

**Goal:** Implement approved registration, role-based access, announcements, and superadmin dashboard.

**Architecture:** Extend the existing Express/Supabase profile and role checks; apply a transactional SQL migration; expose announcements to active users and management endpoints to superadmins. Extend the existing Next.js screens and dashboard.

**Tech Stack:** TypeScript, Express, Supabase/PostgreSQL, Next.js.

## Tasks

1. Add a database migration for profile fields, role conversion, target account, and announcements with RLS. Preserve old profiles and roles' effective access.
2. Add registration validation and server-side authorization for `superadmin`; add announcement CRUD and published-only listing. Verify access and validation at the API boundary where a safe test database is available.
3. Extend registration, user details, role selection and navigation. Add dashboard summary and announcement management; show published announcements to active users.
4. Run TypeScript builds and targeted behavior tests. Apply migration to the configured database only if an authorized database connection is available; otherwise provide exact migration instructions and do not claim deployment.
