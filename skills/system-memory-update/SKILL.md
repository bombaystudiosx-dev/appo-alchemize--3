---
name: system-memory-update
description: Use after any significant decision, architectural change, confirmed bug fix, or completed deploy. Keeps the memory files current so future agents start with accurate context instead of stale information.
---

# System Memory Update

## Overview

Memory files go stale fast. An agent working from outdated architecture notes will make the wrong decisions. This skill defines when and how to update each memory file.

## Memory Files

| File | Update when |
|---|---|
| `/memory/architecture.md` | A structural decision ships — new service, new integration, new pattern adopted |
| `/memory/decisions.md` | Any significant decision is made — tech choice, architectural trade-off, deploy |
| `/memory/rules.md` | A new rule is established or an existing rule is proven wrong in practice |
| `/memory/failures.md` | A bug is confirmed and fixed — root cause and lesson documented |

## Update Prompt

```md
Update the relevant memory file(s).

Event: <what happened — decision made / bug fixed / architecture changed / deploy completed>

For each relevant file:
1. Open the file
2. Add the new entry in the correct format
3. Do not delete or rewrite existing entries
4. Keep entries factual — no opinions, no speculation
```

## Entry Formats

### decisions.md
```
## YYYY-MM-DD — <short title>
**Decision:** <what was decided>
**Reason:** <why>
**Alternative considered:** <what else was on the table>
**Impact:** <what this affects going forward>
```

### failures.md
```
## YYYY-MM-DD — <short title>
**Symptom:** <what broke>
**Root cause:** <actual cause>
**Fix:** <what changed>
**Verified by:** <test / check>
**Lesson:** <what to watch for>
```

### architecture.md
Update the relevant section inline. Do not add new headers unless a genuinely new structural area is introduced.

### rules.md
Add new rules at the bottom of the relevant section. Never remove existing rules — mark them as revised if the behavior changes.

## Rules

- Update memory immediately after the event — do not batch updates
- Facts only — no opinions, no "we should probably"
- Never delete entries from decisions.md or failures.md
- If a rule in rules.md is proven wrong, add a note below it explaining the revision rather than deleting it
