# Architecture Baseline

## Ownership Rules

- UI routes own presentation and user input.
- Services own technical execution.
- Hooks own reusable React lifecycle behavior.
- Database facades own domain persistence access.
- Query invalidation must use `services/queryInvalidationService.ts`.
- Feature gates must use `config/featureFlags.ts`.
- Observability events must use `services/observabilityService.ts`.
- Recovery/retry work must use `services/recoveryQueueService.ts`.

## Rule for Future Work

Do not add new persistence, reminder, barcode, query, or observability behavior directly to route files unless there is no safer service boundary available.
