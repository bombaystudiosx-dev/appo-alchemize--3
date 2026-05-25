# Decisions

_Log significant architectural, product, and deployment decisions here. Each entry should answer: what was decided, why, and what the alternative was._

## Format

```
## YYYY-MM-DD — <short title>
**Decision:** <what was decided>
**Reason:** <why this option over alternatives>
**Alternative considered:** <what else was on the table>
**Impact:** <what this affects going forward>
```

---

## 2026-05-25 — system-repo-audit: top 5 structural risks identified

**Decision:** Logged audit findings; prioritized JWT secret fallback fix as first targeted bug fix; deferred plaintext password fix and userId isolation to separate scoped PRs.

**Reason:** Fixes must stay small and reviewable. The JWT fallback is one line; the password and userId issues require schema migrations and auth redesign — too large to bundle together.

**Alternative considered:** Fix all 5 risks in one PR.

**Impact:** Audit findings now live in `memory/architecture.md`. Each remaining risk needs its own scoped workflow run before production.

---

## 2026-05-25 — Established AI Engineering OS structure

**Decision:** Adopted a four-layer system: skills (engine rules), agents (workers), workflows (playbooks), memory (brain).

**Reason:** Replaces random prompting with a repeatable, scalable machine. Each layer has a defined role so agents can operate without ambiguity.

**Alternative considered:** Single CLAUDE.md with all instructions inline.

**Impact:** All future work should route through the orchestrator → workflow → skill → agent chain.
