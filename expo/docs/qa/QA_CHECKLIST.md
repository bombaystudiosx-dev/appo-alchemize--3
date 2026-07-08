# QA Checklist

## Setup

```bash
cd expo
npm install --legacy-peer-deps
npm run validate:final
npm run lint
npx expo start
```

## Route Smoke Test

Verify each route opens without crash:

- Home
- Auth
- Settings
- Quick Add
- Goals
- Add Goal
- Goal Detail
- Gratitude
- Add Gratitude
- Todos
- Add Todo
- Calorie
- Calorie Scan
- Calorie Profile
- Fitness
- Financial
- Affirmations
- Add Affirmation
- Affirmation Detail

## Persistence QA

Confirm create, reload, edit, and delete behavior for gratitude, goals, tasks, food logs, finance records, appointments, and affirmations.

## Barcode QA

Confirm barcode entries save with `sourceType: 'barcode'`, manual entries remain manual, old logs still load, and calendar metadata remains intact.

## Reminder QA

Confirm creating, editing, deleting, foregrounding, and backgrounding do not duplicate reminders.
