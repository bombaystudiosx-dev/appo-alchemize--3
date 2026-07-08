---
name: system-deployment-check
description: Use before every deploy. Runs a pre-flight checklist to confirm the codebase, environment, and infrastructure are in a safe state before anything goes live.
---

# System Deployment Check

## Overview

A deployment that skips pre-flight checks is a gamble. This skill enforces a structured checklist that every deployment agent must complete before executing a deploy.

## When to Use

- Before any staging or production deploy
- Before merging a release branch
- After a hotfix before emergency deploy

## Pre-Flight Checklist

```md
Run deployment pre-flight check for: <target environment>

Check each item. Report PASS / FAIL / UNKNOWN for each.

[ ] CI is green on the deploy branch
[ ] No open MUST FIX review comments on the PR
[ ] No secrets or API keys committed to the branch (run git log --all -S "sk-" or similar)
[ ] Required environment variables are present in the target environment
[ ] Database migration scripts reviewed (if schema changed)
[ ] No packages added in the last 14 days without approval
[ ] Staging has been verified (before production deploy)
[ ] Rollback plan is known (what to run if production verification fails)

Result: SAFE TO DEPLOY / BLOCKED — list blocking items
```

## Blocking Conditions

Any single FAIL blocks the deploy. Do not proceed until it is resolved.

| Condition | Action |
|---|---|
| CI red | Fix the failure first |
| Secrets found | Escalate to human immediately — do not deploy |
| Missing env vars | Add vars to target environment before deploying |
| Staging not verified | Deploy to staging first |
| No rollback plan | Define rollback before proceeding |

## Rules

- Never skip this checklist — not even for hotfixes
- UNKNOWN is treated as FAIL until confirmed
- Log the checklist result to `/memory/decisions.md` with the deploy entry
