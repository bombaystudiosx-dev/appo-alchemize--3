# Phase 3 Screen Decomposition

## Changed
- Extracted calorie analysis pure helpers from `app/calorie/scan.tsx` into `services/calorieAnalysisService.ts`.
- Extracted task reminder scheduling calculations from `app/todos/index.tsx` into `services/taskReminderService.ts`.
- Removed an unsafe unused relative reminder import from todos.
- Reused pure helper functions for reminder reconciliation and priority cycling.
- Expanded handoff validation for Phase 3 service boundaries.

## Preserved
- Existing route structure.
- Existing UI layout and visual behavior.
- Existing notification permission prompts.
- Existing barcode manual-entry save flow.
