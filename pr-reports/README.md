# PR Reports

One file per PR. Named `YYYY-MM-DD--pr-<number>--<slug>.md`.

Written by the reviewer-agent after every review pass. Captures what was reviewed,
what was found, what was fixed, and the final merge state.

## Format

```
## PR <number> — <title>
Date: YYYY-MM-DD
Branch: <branch>
PR URL: <url>
Reviewer: reviewer-agent
Workflow: review-pr

### Summary
<one sentence — what this PR does>

### Review findings
| # | Severity | Finding | File | Status |
|---|---|---|---|---|
| 1 | MUST FIX | <description> | <file:line> | FIXED / OPEN |
| 2 | SHOULD FIX | | | |
| 3 | OPTIONAL | | | |

### Grep-loop iterations
- Iteration 1: fixed items #1, #2 — re-tested, passed
- Iteration 2: (if needed)

### Final state
- [ ] All MUST FIX resolved
- [ ] Tests passing
- [ ] No unrelated rewrites
- [ ] Merged / ready to merge

### Notes
<anything future agents should know about this PR>
```
