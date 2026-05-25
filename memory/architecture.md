# Architecture

_Update this file whenever a structural decision ships to production._

## Stack

<!-- Document the core tech stack here as it evolves -->
- Platform: <!-- e.g. React Native / Expo -->
- Backend: <!-- e.g. Supabase / Node / Edge Functions -->
- Deployment: <!-- e.g. Vercel / EAS / App Store -->

## Directory Structure

```
/agents       → agent role definitions
/workflows    → step-by-step playbooks per task type
/skills       → reusable engine rules for agents
/memory       → persistent context: architecture, decisions, rules, failures
```

## Service Layer

<!-- Document what lives in the service layer vs actions/routes -->
- Services handle: reusable operational mechanics (API calls, data transforms, external integrations)
- Actions handle: domain rules, business logic, auth checks, state transitions

## Key Integrations

<!-- List external services and where they are integrated -->
| Service | Purpose | Location |
|---|---|---|
| | | |

## Known Constraints

<!-- Document architectural constraints agents must respect -->
- Keep PRs small and reviewable
- No packages less than 14 days old without human approval
- Service layer must not mutate domain state directly
