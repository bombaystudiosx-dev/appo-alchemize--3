# Test Runs

One file per test run. Named `YYYY-MM-DD--<slug>.md`.

Agents write a test run record after every CI execution, typecheck, or manual test pass.
This creates an audit trail: what was tested, when, on which branch, and what passed or failed.

## Format

```
## <title>
Date: YYYY-MM-DD
Branch: <branch>
Commit: <SHA>
Agent: <which agent ran the tests>
Triggered by: <workflow / event>

### Commands run
- <command>

### Results
| Check | Status | Notes |
|---|---|---|
| typecheck | PASS / FAIL | |
| unit tests | PASS / FAIL | X passed, Y failed |
| lint | PASS / FAIL | |
| build | PASS / FAIL | |

### Failures (if any)
- <test name>: <error summary>

### Resolution
<what was done to fix failures, or "none — all passed">
```
