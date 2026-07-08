## Fix: JWT secret predictable fallback blocked in production
Date: 2026-05-25
Branch: claude/clever-ritchie-ctTKD
Agent: debugger-agent (Test 2 — scoped bug fix)
Workflow: fix-bug → grep-loop-review-workflow

### What changed
- `expo/backend/lib/auth.ts` line 7-11: added a hard throw when `JWT_SECRET` is unset in `NODE_ENV=production`
- Fallback string simplified from `'alchemize-dev-secret-' + projectId` (predictable, EXPO_PUBLIC_ derived) to `'alchemize-dev-secret-local'` (still dev-only, no longer leaks project ID)

### Why
The original fallback incorporated `EXPO_PUBLIC_PROJECT_ID`, making it guessable by anyone who decompiles the app or reads public metadata. In production, this would allow token forgery with zero effort.

### Files modified
- `expo/backend/lib/auth.ts`

### Before / After
Before: silent fallback to predictable secret in all environments; no production guard
After: hard throw in production; simplified constant fallback for dev only

### Verified by
- Manual read of modified file confirms throw guard is scoped to `NODE_ENV === 'production'`
- Dev behavior unchanged (fallback still works when JWT_SECRET is not set locally)
- No other files modified
