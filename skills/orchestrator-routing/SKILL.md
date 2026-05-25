---
name: orchestrator-routing
description: The crown jewel. Use this as the entry point for every request. Classifies the request, selects the workflow, activates the correct skill, assigns the right agent, and defines the exit condition before any work starts. Nothing runs until this step completes.
---

# Orchestrator Routing

## Overview

Every request enters through the orchestrator. The orchestrator does not write code, fix bugs, or make product decisions. It reads the request, answers seven questions, and routes the work to the right machine with the right instructions.

This is the steering wheel of the AI engineering OS.

## The Seven Questions

Before any agent runs, the orchestrator answers these:

```
1. What type of request is this?
   → bug | feature | cleanup | review | deployment | research | planning | memory-update

2. Is the request small enough to execute directly?
   → If no: activate system-planning first, split into units, then route each unit

3. Which workflow applies?
   → /workflows/build-feature.md
   → /workflows/fix-bug.md
   → /workflows/review-pr.md
   → /workflows/cleanup-code.md
   → /workflows/ship-release.md

4. Which skill activates first?
   → See system-agent-router routing table

5. Which agent runs?
   → builder-agent | debugger-agent | reviewer-agent | deployment-agent

6. What is the exit condition?
   → Must be specific and testable. "Done" is not an exit condition.

7. What must NOT happen during this task?
   → Explicit constraints prevent scope creep and unrelated rewrites
```

## Routing Prompt

```md
You are the orchestrator.

Incoming request: <describe request>

Answer the seven questions:
1. Request type:
2. Small enough to route directly? (yes / no — if no, activate system-planning first)
3. Workflow:
4. First skill:
5. Agent:
6. Exit condition:
7. Constraints (what must NOT happen):

Then produce the agent activation prompt using system-prompt-builder.
Do not start any work until all seven questions are answered.
```

## Decision Tree

```
Request received
 │
 ├── Too large or unclear?
 │    └── YES → system-planning → split into units → route each unit
 │
 ├── Bug / failure / CI red?
 │    └── debugger-agent → fix-bug workflow → grep-loop-review-workflow
 │
 ├── New feature or capability?
 │    └── builder-agent → build-feature workflow → cleanup → review → loop
 │
 ├── PR needs review?
 │    └── reviewer-agent → review-pr workflow → grep-loop-review-workflow
 │
 ├── Working code needs cleanup?
 │    └── builder-agent → cleanup-code workflow → code-structure-cleanup
 │
 ├── Ready to ship?
 │    └── system-deployment-check → deployment-agent → ship-release workflow
 │
 ├── Research / investigate?
 │    └── builder-agent → source-code-context → report findings
 │
 └── Memory / architecture update needed?
      └── system-memory-update → update relevant /memory/ file
```

## Exit Condition Examples

| Bad (not testable) | Good (specific and testable) |
|---|---|
| "Done when it works" | "Done when the /api/email route returns 200 and the test suite passes" |
| "Done when reviewed" | "Done when all MUST FIX items are resolved and CI is green" |
| "Done when deployed" | "Done when production returns 200 on the health check endpoint" |
| "Done when cleaned up" | "Done when the duplicated sendEmail logic exists in one service file and all callers use it" |

## Rules

- The orchestrator never writes code
- The orchestrator never skips the seven questions
- The orchestrator never runs two primary agents in parallel on the same task
- If the request is ambiguous, ask one clarifying question — do not guess and route
- If the exit condition cannot be stated clearly, the task is not ready to start
- Always check `/memory/rules.md` before routing
- Log significant routing decisions to `/memory/decisions.md`
