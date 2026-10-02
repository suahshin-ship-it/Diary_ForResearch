# Repository development guidance

## Start here

Read README.md and DEVELOPMENT.md before changing this application. Keep changes focused on the requested behavior. App UI is Korean; retain clear labels and accessibility support. Dates currently use Asia/Seoul.

## Project map

- app/diary-app.tsx: daily editor, explicit save, notes and time-block state
- app/day-clock.tsx and app/time-range-picker.tsx: 24-hour visualization and range editing
- lib/diary-data.ts: shared types, blank defaults, validation, stable IDs
- app/api/diary/route.ts: authenticated full-day reads/writes
- app/mcp/route.ts: authenticated reads and plan-only updates
- db/schema.ts and drizzle/: D1 schema and ordered migration history
- tests/test-diary.mjs: synthetic fixtures with an isolated temporary SQLite database

## Data and security invariants

- New dates must remain blank. Never add real schedules, activity history, identities or production data as examples.
- Preserve user-scoped reads/writes using the authenticated stable user ID and date.
- Preserve origin, input validation, size limits and revision-based concurrency checks.
- Never bypass production authentication to make a preview work. The development-only mock must remain loopback-only.
- Changing a plan must not change actual activity, status, notes or reflections.
- Preserve legacy IDs and notes. Hiding/deleting an item is recoverable and must not erase its text.
- A staged browser activity is an unsaved edit. Do not silently add automatic saving.
- Keep credentials, environment files, database files, runtime state and deployment identifiers out of Git.

## Workflow

Use the lockfile and npm run install:ci for dependencies. Do not run overlapping installers. Clean checkouts use the portable profile; generated local profile and tool state are ignored.

Run npm test, npm run typecheck, npm run lint and npm run build after relevant changes. Report each result separately, including existing lint failures. For UI changes, test the changed interaction plus cancellation, keyboard navigation, repeated actions, date changes and save/reopen flows with synthetic data. If browser QA was unavailable, state that explicitly.

When the schema changes, generate and review a new migration. Do not edit an already applied migration or run remote migrations without explicit approval. Preserve third-party license notices and build support files.

GitHub source changes do not deploy or migrate an existing Site. Treat deployment, production database changes and access-policy changes as separate reviewed operations. Do not add an automatic deployment workflow as an incidental code change.
