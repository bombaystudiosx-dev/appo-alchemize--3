# Phase 4 Query + State Governance

## Added
- `services/queryKeys.ts`
- `services/queryInvalidationService.ts`
- `services/asyncStateService.ts`

## Patched Files
- `app/quick-add.tsx`
- `app/affirmations/[id].tsx`
- `app/affirmations/add.tsx`
- `app/affirmations/index.tsx`
- `app/calorie/add.tsx`
- `app/calorie/scan.tsx`
- `app/goals/add.tsx`
- `app/goals/index.tsx`
- `app/todos/add.tsx`
- `app/todos/index.tsx`

## Remaining Direct Invalidation Calls
- `app/quick-add.tsx`
- `app/appointments/add.tsx`
- `app/calorie/add.tsx`
- `app/calorie/index.tsx`
- `app/calorie/meal-prep.tsx`
- `app/calorie/profile.tsx`
- `app/calorie/scan.tsx`
- `app/financial/index.tsx`
- `app/financial/notes.tsx`
- `app/fitness/add.tsx`
- `app/fitness/workout.tsx`
- `app/goals/[id].tsx`
- `app/gratitude/add.tsx`
- `app/habits/add.tsx`
- `app/habits/index.tsx`
- `app/manifestation-board/[id].tsx`
- `app/manifestation-board/add.tsx`
- `app/manifestation-board/index.tsx`

## Notes
This phase establishes centralized query key ownership and safe invalidation helpers without changing UI behavior.
