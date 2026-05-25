# Rules

_Hard rules every agent must check before starting work._

## Code Rules

1. Search existing code before creating new abstractions.
2. Build minimal working version first — no premature abstraction.
3. Keep PRs small and reviewable. If the diff is too large, split it.
4. Never install a package less than 14 days old without explicit human approval.
5. Never commit secrets, API keys, or credentials to the repository.
6. Services handle mechanics (how). Actions handle domain rules (why/when).
7. Extract to service layer only when logic is repeated across 2+ callers.

## Review Rules

8. Read the full diff before commenting.
9. Fix only issues relevant to the current PR — no unrelated rewrites.
10. MUST FIX items block merge. SHOULD FIX and OPTIONAL do not.
11. Do not blindly accept automated review comments — verify they are real issues.

## Deployment Rules

12. Never deploy directly to production without staging verification first.
13. Run system-deployment-check before every deploy.
14. If production verification fails, rollback immediately — do not investigate live.
15. Log every deploy outcome to /memory/decisions.md.

## Agent Rules

16. Orchestrator defines exit condition before any work starts.
17. Orchestrator never writes code — it delegates.
18. Debugger reproduces failures before fixing them.
19. Reviewer never fixes code — it returns findings.
20. If root cause is unclear after investigation, escalate to human — never guess-fix.

## Security Rules

21. Use 2FA via authenticator app (not SMS).
22. Use a password manager for all credentials.
23. When a package breach trends, check this project for that package/version immediately.
24. Do not paste secrets into prompts, screenshots, or chat.
