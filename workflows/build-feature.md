# Workflow: Build Feature

## Trigger

A new feature, screen, API route, integration, or user-facing capability needs to be added.

## Steps

```
1. Orchestrator classifies request as "feature"
2. Orchestrator defines exit condition
3. Builder agent activates
   - Searches existing code first
   - References source/docs if using external packages
   - Builds minimal working version
   - Runs typechecks/tests
4. Code-structure-cleanup agent runs
   - Finds duplicated mechanics introduced by the feature
   - Extracts to service layer if repeated across 2+ callers
5. Reviewer agent inspects the diff
   - Returns numbered findings (MUST FIX / SHOULD FIX / OPTIONAL)
6. Grep-loop-review-workflow runs
   - Builder fixes MUST FIX items
   - Re-tests after each fix
   - Loops until review is clean
7. Orchestrator confirms exit condition met
8. Deployment agent runs (if auto-deploy is configured)
```

## Skills Used

- `agentic-engineering-workflow`
- `source-code-context`
- `code-structure-cleanup`
- `grep-loop-review-workflow`

## Exit Condition

Feature works, tests pass, review is clean, PR is merge-ready.

## Pitfalls

- Do not start cleanup or review until the feature works locally
- Do not merge a PR with open MUST FIX items
- If the feature grows too large, stop and split into smaller PRs
