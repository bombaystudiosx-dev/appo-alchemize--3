# Architecture

_Updated 2026-05-25 from system-repo-audit run._

## Stack

- **Language:** TypeScript (strict mode)
- **Framework:** React Native 0.81.5 + Expo ~54.0.33, Expo Router ~6.0.23 (file-based routing)
- **Backend:** Hono ^4.11.1 serving tRPC ^11.8.1 routes, running on-device via Rork tunnel
- **Database (client-side):** expo-sqlite ~16.0.10 with SQLCipher on iOS; custom hand-rolled JS SQL adapter for web (~250 lines, no tests)
- **Database (server-side):** SurrealDB via surrealdb.js ^1.0.0 — used only by backend tRPC routes
- **Auth:** Dual system (see Known Constraints): AsyncStorage plaintext store (frontend) + bcryptjs/jsonwebtoken (backend, partially wired)
- **State:** React Context (auth, theme) + TanStack React Query ^5.90.12 for tRPC only; local SQLite uses raw useEffect/useState
- **Build:** Bun + Rork CLI; new architecture enabled (`newArchEnabled: true`)

## Directory Structure

```
/agents       → agent role definitions
/workflows    → step-by-step playbooks per task type
/skills       → 12 reusable engine rules for agents
/memory       → persistent context: architecture, decisions, rules, failures
/change-logs  → one file per significant runtime change
/test-runs    → one file per CI / test execution
/pr-reports   → one file per PR review pass
/expo         → all application source code
  /app        → Expo Router screens (30+ screens, 10 feature modules)
  /backend    → Hono server, tRPC router, SurrealDB lib, auth lib
  /components → 7 shared UI components
  /contexts   → auth-context.tsx, theme-context.tsx
  /lib        → database.ts (1953 lines), trpc.ts, calendar.ts, date-utils.ts, fitness.ts, healthkit.ts, notifications.ts, oauth-config.ts
  /types      → index.ts (all domain types in one file)
```

## Service Layer

- **Extracted:** `lib/database.ts` (monolithic, 20+ entity namespaces), `lib/trpc.ts`, `lib/notifications.ts`, `lib/calendar.ts`, `lib/date-utils.ts`, `lib/fitness.ts`, `lib/healthkit.ts`, `backend/lib/auth.ts`, `backend/lib/surrealdb.ts`
- **Inline (not extracted):** Feature-specific data-fetching via `useEffect` + `useState` in each screen; AsyncStorage reads scattered across auth-context, trpc.ts, and multiple screens
- **Service layer rule:** Services handle mechanics (how). Actions/screens handle domain rules (why/when).

## Key Integrations

| Service | Purpose | Location |
|---|---|---|
| SurrealDB | Server-side user/goals/tasks/gratitude/manifestations store | `expo/backend/lib/surrealdb.ts`, `expo/backend/trpc/routes/` |
| expo-sqlite + SQLCipher | Client-side local data store for all features | `expo/lib/database.ts` |
| Hono + tRPC | Backend API layer | `expo/backend/hono.ts`, `expo/backend/trpc/` |
| Expo Notifications | Push notifications | `expo/lib/notifications.ts` |
| HealthKit | iOS fitness data | `expo/lib/healthkit.ts` |

## Known Constraints

### Critical / Active Issues (from 2026-05-25 audit)
1. ~~**Plaintext passwords in AsyncStorage**~~ — **FIXED PR-001 (2026-05-25).** Passwords now stored as SHA-256 hashes with userId as domain separator. Legacy entries migrated on first load.
2. **EXPO_PUBLIC_GOOGLE_CLIENT_SECRET bundled** — `expo/lib/oauth-config.ts` uses `EXPO_PUBLIC_` prefix, embedding the secret in the JS bundle. Must be moved server-side.
3. **14+ tables missing userId isolation** — meals, workouts, body_metrics, water_logs, saved_foods, planned_meals, fitness_goals, workout_templates, workout_sessions, normalized_metrics, fitness_plans, awards, habit_completions, nutrition_goals all lack `WHERE userId = ?` filters.
4. **Dual auth token mismatch** — Frontend generates fake tokens (`token_${userId}_${Date.now()}`); backend expects real JWTs. tRPC `protectedProcedure` endpoints are effectively unreachable.
5. **database.ts God File** — 1953 lines, hand-rolled SQL interpreter for web, zero test coverage.

### Structural Rules
- Keep PRs small and reviewable
- No packages less than 14 days old without human approval
- Service layer must not mutate domain state directly
- `EXPO_PUBLIC_` prefix must never be used for secrets or tokens

## Dead Dependencies (remove when cleaning)

- `firebase ^12.9.0` — in package.json, zero source imports
- `zustand ^5.0.2` — in package.json, zero source imports
- `react-native-worklets 0.5.1` — in package.json, zero source imports
