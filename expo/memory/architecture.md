# Architecture Memory

## Production Scaling Boundaries
- Feature gates live in `config/featureFlags.ts`.
- Local observability events live in `services/observabilityService.ts`.
- App health snapshots live in `services/appHealthService.ts`.
- Future retry/offline recovery ownership begins in `services/recoveryQueueService.ts`.
