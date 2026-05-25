---
name: system-prompt-builder
description: Use when constructing a prompt to hand to a worker agent. Ensures every agent prompt includes the right context, constraints, exit condition, and skill reference — nothing more, nothing less.
---

# System Prompt Builder

## Overview

A good agent prompt is not a paragraph of instructions. It is a structured brief: task, context, constraints, exit condition. This skill produces that structure every time.

## When to Use

- Activating any worker agent (builder, debugger, reviewer, deployment)
- Constructing a prompt for a subagent
- Repeating a task that failed because the previous prompt was too vague

## Prompt Template

```md
You are the <agent-name>.

Task: <one sentence — what needs to happen>

Context:
- Branch: <branch-name>
- Relevant files: <list specific files or folders>
- Skill to follow: <skill name from /skills/>
- Reference source (if applicable): <path to local source or docs>

Constraints:
- <constraint 1 from /memory/rules.md>
- <constraint 2>
- Keep the diff small

Exit condition: <specific, testable — what does done look like?>

Do not: <list what the agent must NOT do in this task>
```

## Rules

- Always include the exit condition — a prompt without one is incomplete
- Always reference the correct skill — agents drift without a skill anchor
- Never include constraints that do not apply to this specific task
- Keep the "Context" section to what the agent actually needs — more context is not always better
- Never write a prompt longer than 20 lines — if it needs more, split the task
