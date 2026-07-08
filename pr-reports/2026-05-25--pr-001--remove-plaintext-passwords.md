## PR-001 — Remove plaintext password storage
Date: 2026-05-25
Branch: claude/clever-ritchie-ctTKD
Agent: debugger-agent
Workflow: fix-bug → grep-loop-review-workflow
Skill: agentic-engineering-workflow (security guardrails)

### What changed
- `StoredUser.password: string` → `StoredUser.passwordHash: string`
- Added `hashPassword(password, userId)` helper using existing `expo-crypto` (SHA-256 with userId as domain separator)
- `signup`: passwords hashed before writing to AsyncStorage
- `login`: input password hashed before comparison — never compares plaintext to stored value
- `loginWithApple` / `loginWithGoogle`: `password: ''` → `passwordHash: ''` (OAuth users, no change in behavior)
- `loadAuthState`: migration block — on app load, detects legacy users with `password` field, hashes in-place, writes back, removes plaintext field. Existing accounts survive without re-registration.

### Why
Passwords were stored as plain strings in AsyncStorage, which is unencrypted on Android. Any process with READ_EXTERNAL_STORAGE or root access could extract all credentials.

### Files modified
- `expo/contexts/auth-context.tsx` only

### Before / After
Before: `{ id, email, name, password: 'mysecretpassword' }` written to USERS_STORAGE_KEY  
After: `{ id, email, name, passwordHash: 'sha256-hex...' }` — plaintext never touches storage

### Verified by
- Full file review: no `password` field assignments remain on StoredUser objects
- Migration path: `needsMigration` check correctly detects old format; converts and writes back
- Login path: `inputHash` compared to `user.passwordHash` — no plaintext comparison
- No other files modified (confirmed via diff)
- No new dependencies added (expo-crypto already in project)

### Scope held
- No UI changes
- No auth flow redesign
- No other security risks addressed (OAuth secret, userId isolation, token mismatch remain as PR-002, PR-003, PR-004)
