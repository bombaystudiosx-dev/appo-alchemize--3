---
name: system-repo-audit
description: Use when onboarding to an existing codebase, before a large refactor, or when a security issue trends and you need to check this project's exposure. Produces a structured snapshot of the repo's current state.
---

# System Repo Audit

## Overview

Before agents can work reliably on an unfamiliar or evolving codebase, they need a structured snapshot: what exists, what is duplicated, what is exposed, and what is unclear. This skill produces that snapshot.

## When to Use

- First time working in a repo or after a long gap
- Before a large refactor or service extraction
- When a package security issue is announced
- When the codebase feels inconsistent and you are unsure why

## Audit Prompt

```md
Run a repo audit. Produce a structured snapshot.

Sections:
1. Stack — languages, frameworks, major packages, versions
2. Directory structure — what lives where, what the naming convention is
3. Entry points — routes, actions, API handlers (list the main ones)
4. Service layer — what is already extracted vs what is inline
5. Duplication — repeated patterns across files that should be in a service
6. Dependencies — any packages less than 30 days old, deprecated, or flagged in recent CVEs
7. Secrets exposure — any hardcoded keys, tokens, or credentials (flag immediately)
8. Test coverage — which areas have tests, which do not
9. Gaps — things that are unclear, undocumented, or inconsistent

Format: bullet points per section. No prose paragraphs.
```

## Output Use

- Feed sections 4-5 into `code-structure-cleanup` if cleanup is needed
- Feed section 6 into security review
- Feed section 7 to the human immediately if secrets are found
- Feed section 9 to `/memory/architecture.md`

## Rules

- Do not modify any files during an audit — read only
- If secrets are found, stop and escalate to human before continuing
- Audit results should update `/memory/architecture.md` after review
