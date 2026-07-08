## Repo Audit — system-repo-audit skill run
Date: 2026-05-25
Branch: claude/clever-ritchie-ctTKD
Agent: reviewer-agent
Triggered by: orchestrator-routing → system-repo-audit (Test 1)

### Commands run
- Full read-only scan: all source files in /expo, /android, /assets, package.json, rork.json
- No modifications made

### Results
| Check | Status | Notes |
|---|---|---|
| Stack identified | PASS | RN 0.81.5 + Expo 54 + Hono + tRPC + SurrealDB |
| Directory structure mapped | PASS | 30+ screens, 10 feature modules |
| Entry points listed | PASS | _layout.tsx, index.tsx, hono.ts, 5 tRPC route files |
| Service layer assessed | PASS | Extracted: lib/, backend/lib/. Inline: screen data-fetching |
| Duplication found | PASS | 5 major patterns identified |
| Dead dependencies found | PASS | firebase, zustand, react-native-worklets |
| Secrets exposure | FAIL | 2 critical, 1 high, 1 medium found (see architecture.md) |
| Test coverage | FAIL | Zero test files anywhere in repo |
| Gaps documented | PASS | 8 gaps identified |

### Top 5 Risks Found
1. CRITICAL — Plaintext passwords in AsyncStorage (`auth-context.tsx`)
2. HIGH — OAuth client secret bundled via EXPO_PUBLIC_ prefix (`oauth-config.ts`)
3. HIGH — 14+ tables missing userId isolation (`database.ts` lines 1333–1952)
4. HIGH — Dual auth token mismatch (frontend fake tokens vs backend JWT)
5. MEDIUM-HIGH — 1953-line God File database.ts with zero tests

### Resolution
- Memory updated: `memory/architecture.md` filled with real stack and all 5 risks
- Decision logged: `memory/decisions.md`
- Immediate bug fix scoped and executed: JWT secret fallback (see change-logs/2026-05-25--fix-jwt-secret-fallback.md)
- Remaining 4 risks require separate scoped PRs — not addressed in this run
