# Workflow: Fix Bug

## Trigger

A test is failing, a runtime error is reported, CI is red, or a regression is confirmed.

## Steps

```
1. Orchestrator classifies request as "bug"
2. Orchestrator defines exit condition (which check must go green)
3. Debugger agent activates
   - Reads full error output / stack trace
   - Reproduces failure before editing any file
   - Identifies root cause
   - Fixes only root cause
   - Re-runs failing check
4. Reviewer agent does a targeted review of the fix diff
   - Confirms fix addresses root cause
   - Checks for regressions in adjacent code
5. Grep-loop-review-workflow runs if review has MUST FIX items
6. Orchestrator confirms exit condition met
7. Failure logged to /memory/failures.md
```

## Skills Used

- `grep-loop-review-workflow`
- `code-structure` (if the bug was caused by duplicated logic)

## Exit Condition

Failing check passes. Root cause documented. No new failures introduced.

## Pitfalls

- Do not fix symptoms — find root cause first
- Do not refactor surrounding code during a bug fix
- Do not use `--no-verify` or force-push to make CI pass
- If root cause is unclear after investigation, escalate to human
