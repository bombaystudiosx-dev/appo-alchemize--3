# Local CI Workaround

GitHub Actions is currently blocked before runner startup by the repository owner's GitHub billing state:

```text
The job was not started because your account is locked due to a billing issue.
```

Until GitHub billing is fixed, use the local CI command as the release gate:

```bash
cd expo
npm install --legacy-peer-deps
npm run ci:local
```

`ci:local` runs:

- `npm run validate:final`
- `npx expo-doctor`
- `npm run lint`

Current local result on 2026-05-31:

- `npm run validate:final`: passed
- `npx expo-doctor`: passed, 18/18 checks
- `npm run lint`: passed with warnings only

Security audit is intentionally separate:

```bash
npm run ci:audit
```

As of 2026-05-31, audit still reports low/moderate transitive advisories through Expo/Rork/AI SDK packages. Npm's suggested fixes require breaking package upgrades, so do not force-apply them without a dedicated dependency-upgrade pass and device validation.

This local CI workaround does not replace required Android/iOS device QA before release.
