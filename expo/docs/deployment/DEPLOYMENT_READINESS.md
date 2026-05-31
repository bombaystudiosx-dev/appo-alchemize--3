# Deployment Readiness

## Required Before Release

```bash
cd expo
npm install --legacy-peer-deps
npm run validate:final
npm run lint
```

## Required Device Coverage

- iOS simulator or physical iPhone
- Android emulator or physical Android device

## Release Blockers

Do not release if any are true:

- route crash on launch
- database migration failure
- reminder duplication
- barcode entries save as manual
- persistent blank screen
- Expo build failure
- unresolved permission crash
