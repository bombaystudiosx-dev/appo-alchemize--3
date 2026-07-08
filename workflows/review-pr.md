# Workflow: Review PR

## Trigger

A PR is open and needs review before merge.

## Steps

```
1. Orchestrator classifies request as "review"
2. Reviewer agent activates
   - Reads full diff first
   - Identifies bugs, security gaps, missing tests, duplicated mechanics
   - Produces numbered findings: MUST FIX / SHOULD FIX / OPTIONAL
3. Orchestrator routes findings
   - MUST FIX → builder-agent or debugger-agent via grep-loop-review-workflow
   - SHOULD FIX → builder-agent if time allows
   - OPTIONAL → logged, not blocking
4. Grep-loop-review-workflow runs for MUST FIX items
   - Agent fixes, re-tests, pushes
   - Reviewer re-checks
   - Loops until clean
5. Orchestrator confirms PR is merge-ready
```

## Skills Used

- `grep-loop-review-workflow`
- `code-structure-cleanup` (if duplication is flagged)

## Exit Condition

No open MUST FIX items. Tests pass. PR is merge-ready.

## Pitfalls

- Do not blindly accept every review comment — some are wrong or irrelevant
- Do not review a PR that is thousands of lines — request a split first
- Do not merge while MUST FIX items are open
