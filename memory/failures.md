# Failures

_Log confirmed bugs, root causes, and fixes here. Future agents should check this file before investigating similar issues._

## Format

```
## YYYY-MM-DD — <short title>
**Symptom:** <what broke / what the error said>
**Root cause:** <actual cause, not the symptom>
**Fix:** <what was changed to resolve it>
**Verified by:** <test name / check that went green>
**Lesson:** <what to watch for in future work>
```

---

## 2026-05-25 — JWT secret predictable fallback in production

**Symptom:** No runtime error — silent failure. The backend would start in production with a guessable JWT signing secret derived from a public project ID, allowing token forgery.

**Root cause:** `getJwtSecret()` in `expo/backend/lib/auth.ts` fell back to `'alchemize-dev-secret-' + EXPO_PUBLIC_PROJECT_ID` with no guard against production environments. The fallback incorporated a value that ships in the public JS bundle.

**Fix:** Added `if (process.env.NODE_ENV === 'production') throw new Error(...)` before the fallback is used. Simplified fallback to a static dev-only constant with no project metadata.

**Verified by:** Manual code review — throw guard confirmed scoped to production; dev behavior unchanged.

**Lesson:** Any `JWT_SECRET` or signing key fallback must hard-throw in production. Never derive a fallback from `EXPO_PUBLIC_` variables — they are embedded in the public JS bundle.

---

## 2026-05-25 — Plaintext passwords stored in AsyncStorage (PR-001)

**Symptom:** No runtime error — silent data exposure. Passwords stored as plain strings in `@alchemize_users` AsyncStorage key, readable by any process with file access on Android.

**Root cause:** `StoredUser.password` field written directly from user input with no hashing. `login()` compared raw input string against stored raw string.

**Fix:** Added `hashPassword(password, userId)` using `expo-crypto` SHA-256. All StoredUser write sites updated to store `passwordHash`. Login compares hashes. Migration block in `loadAuthState` converts legacy plaintext entries in-place on first app load after upgrade.

**Verified by:** Manual static analysis — no `password` field assignments remain on StoredUser objects; migration logic traced end-to-end.

**Lesson:** Never store user credentials in AsyncStorage without hashing. AsyncStorage is unencrypted on Android. Use the hash on write, compare hashes on verify — plaintext never persists.
