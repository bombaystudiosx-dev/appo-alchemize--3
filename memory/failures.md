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
