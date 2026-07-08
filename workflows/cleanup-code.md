# Workflow: Cleanup Code

## Trigger

A feature is working but the code has duplicated mechanics, repeated API calls, or messy structure that will slow down future agents.

## Steps

```
1. Orchestrator classifies request as "cleanup"
2. Orchestrator confirms the feature is working before cleanup starts
3. Builder agent runs code-structure-cleanup skill
   - Inspects files touched by the recent feature
   - Identifies repeated mechanics across 2+ callers
   - Extracts repeated mechanics to service layer
   - Keeps domain policy in calling actions/routes
   - Does not change user-facing behavior
   - Runs typechecks/tests to confirm nothing broke
4. Reviewer agent checks the cleanup diff
   - Confirms behavior did not change
   - Confirms calling code got simpler
   - Confirms no domain logic leaked into service layer
5. Orchestrator confirms exit condition met
```

## Skills Used

- `code-structure-cleanup`
- `code-structure`
- `grep-loop-review-workflow` (if reviewer finds issues)

## Exit Condition

Repeated mechanics are in one place. Calling code is simpler. Tests pass. Behavior unchanged.

## Pitfalls

- Never run cleanup before the feature works
- Never mix cleanup with a new feature in the same PR
- Do not rename everything — naming churn makes PRs hard to review
- Do not extract logic used by only one caller (over-abstraction)
