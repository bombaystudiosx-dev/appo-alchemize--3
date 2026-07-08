---
name: system-planning
description: Use before any significant feature or change. Breaks a large request into small, reviewable, PR-sized units. Prevents agents from taking on too much at once and producing unreviable diffs.
---

# System Planning

## Overview

Planning is not a document. It is a decomposition step. The goal is to turn a large request into the smallest possible sequential or parallel units that each produce a reviewable PR.

## When to Use

- A request touches more than 2-3 files or involves more than one logical concern
- A feature needs a schema change, service change, AND UI change
- You are unsure where to start
- A previous attempt produced a diff that was too large to review reliably

## Planning Prompt

```md
Break this request into small, reviewable, PR-sized units.

Request: <describe the full request>

For each unit:
1. Name it clearly (e.g. "Add email service", "Wire email service to signup route")
2. State which files will change
3. State which skill applies
4. State the exit condition for that unit
5. State dependencies (which units must ship first)

Constraints:
- Each unit should be reviewable in one sitting
- Each unit should have a clear pass/fail test
- Do not combine schema changes with UI changes in one unit
- Flag any unit that still feels too large — split it further
```

## Output Format

```
Unit 1: <name>
- Files: <list>
- Skill: <skill name>
- Exit condition: <what done looks like>
- Depends on: <none | Unit N>

Unit 2: ...
```

## Rules

- Planning produces a unit list, not a document
- Never plan and build in the same step
- If a unit has no clear exit condition, split it further
- Keep the plan in the conversation — do not write a planning file unless the human asks
