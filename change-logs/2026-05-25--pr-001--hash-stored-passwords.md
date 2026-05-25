## PR-001: Hash passwords in AsyncStorage
Date: 2026-05-25
Branch: claude/clever-ritchie-ctTKD
Commit: (see git log)
Agent: debugger-agent
Workflow: fix-bug

### What changed
- `StoredUser` interface: `password` field renamed to `passwordHash`
- New `hashPassword(password, userId)` helper — SHA-256 via expo-crypto, userId used as domain separator
- `signup`: stores `passwordHash` instead of plaintext `password`
- `login`: hashes input before comparing to stored hash
- `loginWithApple`, `loginWithGoogle`: updated field name (empty string, no behavior change)
- `loadAuthState`: migration block converts legacy plaintext `password` entries on first load

### Why
AsyncStorage is unencrypted on Android. Plaintext credential storage is a critical vulnerability.

### Files modified
- `expo/contexts/auth-context.tsx`

### Before / After
Before: `user.password !== password` (plaintext comparison against plaintext store)  
After: `user.passwordHash !== await hashPassword(password, user.id)` (hash vs hash)

### Verified by
- Manual code review of all StoredUser write sites
- Migration path logic traced end-to-end
