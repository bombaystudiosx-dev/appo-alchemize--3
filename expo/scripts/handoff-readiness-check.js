const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const requiredFiles = [
  'docs/handoff/HANDOFF.md',
  'docs/qa/QA_CHECKLIST.md',
  'docs/deployment/DEPLOYMENT_READINESS.md',
  'docs/architecture/ARCHITECTURE_BASELINE.md',
  'scripts/validate-handoff.js',
  'scripts/repo-health-check.js',
  'scripts/production-preflight.js',
  'scripts/recovery-integrity-check.js',
  'config/featureFlags.ts',
  'services/queryKeys.ts',
  'services/queryInvalidationService.ts',
  'services/observabilityService.ts',
  'services/appHealthService.ts',
  'services/recoveryQueueService.ts'
];

const missing = requiredFiles.filter((file) => !fs.existsSync(path.join(ROOT, file)));

if (missing.length > 0) {
  console.error('Handoff readiness failed. Missing files:');
  missing.forEach((file) => console.error(` - ${file}`));
  process.exit(1);
}

console.log('✓ Handoff readiness files present');
