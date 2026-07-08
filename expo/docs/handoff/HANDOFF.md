# Alchemize Final Engineering Handoff

## Application Root

The active Expo application root is:

```text
/expo
```

## Current Stabilization Status

The repository has received staged stabilization across runtime stability, database governance, screen decomposition boundaries, query/state ownership, notification lifecycle ownership, repository hardening, production-scaling primitives, CI scaffolding, and final handoff readiness.

## What Is Ready

- Required route manifest exists.
- Service ownership boundaries exist.
- Query key and invalidation ownership exists.
- Reminder/notification lifecycle service boundaries exist.
- Observability and health snapshot primitives exist.
- Recovery queue primitive exists.
- Feature flag boundary exists.
- Validation scripts exist.
- CI stability workflow exists.
- Handoff, QA, deployment, and architecture docs exist.

## Local Verification Commands

```bash
cd expo
npm install --legacy-peer-deps
npm run validate:final
npm run lint
npx expo start
```

## Known Remaining High-Risk Files

- `app/index.tsx` — 1204 lines
- `app/settings.tsx` — 2314 lines
- `app/appointments/index.tsx` — 1040 lines
- `app/calorie/scan.tsx` — 2118 lines
- `app/financial/index.tsx` — 1439 lines
- `lib/database.ts` — 1965 lines

## Required Final Human QA

See:

```text
docs/qa/QA_CHECKLIST.md
```
