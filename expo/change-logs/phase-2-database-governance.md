# Phase 2 Database Governance

## Changed
- Added `lib/db/*` domain facades.
- Migrated route and library imports away from direct `@/lib/database` access.
- Added `reflection` support to `GratitudeEntry`.
- Added `reflection` column support to gratitude schema creation.
- Added backward-compatible reflection column migration.
- Updated gratitude create/update persistence to save reflection.
- Added reflection input and reload behavior to gratitude add/edit screen.
- Expanded `scripts/validate-handoff.js` to verify DB facades and reflection wiring.

## Why
This reduces future database blast radius without splitting migrations prematurely.

## Compatibility
`lib/database.ts` remains the migration owner and the underlying persistence implementation. Domain facades re-export existing DB modules, so runtime behavior is preserved while import ownership becomes safer.
