# Change Logs

One file per significant change. Named `YYYY-MM-DD--<slug>.md`.

Each log answers: what changed, why, which files, and what the before/after state was.
Agents write a change log entry after every commit that modifies runtime behavior.

## Format

```
## <title>
Date: YYYY-MM-DD
Branch: <branch>
Commit: <SHA>
Agent: <which agent made the change>
Workflow: <which workflow was active>

### What changed
- <bullet>

### Why
<one sentence>

### Files modified
- <path>

### Before / After (if applicable)
Before: <old behavior>
After: <new behavior>

### Verified by
<test name / check / manual step>
```
