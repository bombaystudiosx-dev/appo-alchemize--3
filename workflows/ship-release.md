# Workflow: Ship Release

## Trigger

A set of features is complete, tested, and ready to go live.

## Steps

```
1. Orchestrator classifies request as "deployment"
2. System-deployment-check skill runs
   - All PRs merged to main
   - CI green on main
   - No secrets in codebase
   - Required env vars confirmed in target environment
   - Migration scripts reviewed if schema changed
3. Deployment agent activates
   - Deploys to staging first
   - Verifies staging responds correctly
   - Runs smoke tests if available
4. Human approves production deploy (or auto-approved if configured)
5. Deployment agent deploys to production
   - Verifies production responds correctly
   - Rolls back immediately if verification fails
6. Outcome logged to /memory/decisions.md
7. Memory updated: /memory/architecture.md if any structural change shipped
```

## Skills Used

- `system-deployment-check`
- `agentic-engineering-workflow` (security guardrails section)

## Exit Condition

Production verified live. Outcome logged. No open rollback needed.

## Pitfalls

- Never deploy directly to production without staging verification
- Never skip the pre-deploy checklist
- If staging fails, stop — do not escalate to production
- Ship earlier than feels comfortable — waiting for perfect is how competitors ship first
