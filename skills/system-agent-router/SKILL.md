---
name: system-agent-router
description: Use when the orchestrator needs to decide which agent handles the current task. Maps request type to the correct agent and workflow combination.
---

# System Agent Router

## Overview

Not every request goes to the same agent. This skill gives the orchestrator a decision table for routing any request to the right worker without ambiguity.

## Routing Table

| Request Type | Primary Agent | Workflow | Skills Activated |
|---|---|---|---|
| New feature | builder-agent | build-feature.md | agentic-engineering-workflow, source-code-context |
| Bug / failure | debugger-agent | fix-bug.md | grep-loop-review-workflow |
| PR review | reviewer-agent | review-pr.md | grep-loop-review-workflow |
| Code cleanup | builder-agent | cleanup-code.md | code-structure-cleanup, code-structure |
| Deployment | deployment-agent | ship-release.md | system-deployment-check |
| Research task | builder-agent | — | source-code-context |
| Planning / scoping | orchestrator | — | system-planning |
| Memory update | orchestrator | — | system-memory-update |

## Classification Prompt

```md
Classify this request and route it to the correct agent.

Request: <describe request>

Answer:
- Request type: <bug | feature | cleanup | review | deployment | research | planning>
- Primary agent: <agent name>
- Workflow: <workflow file>
- Skills to activate: <list>
- Exit condition: <what done looks like>
```

## Ambiguous Cases

- "Make this better" → Ask one clarifying question: is this a bug, a feature, or a cleanup?
- "Fix the PR" → Route to reviewer-agent first, then grep-loop-review-workflow
- "Refactor everything" → Reject. Ask for a specific, scoped unit.
- "Deploy the app" → Confirm staging first. Route to system-deployment-check before deployment-agent.

## Rules

- Never route to more than one primary agent at a time
- If the request is ambiguous, ask one clarifying question — do not guess
- Reject requests that are too large without a planning step first
