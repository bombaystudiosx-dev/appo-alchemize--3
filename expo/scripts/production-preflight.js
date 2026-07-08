const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const requiredFiles = [
  'config/featureFlags.ts',
  'services/observabilityService.ts',
  'services/appHealthService.ts',
  'services/recoveryQueueService.ts',
  'scripts/repo-health-check.js',
  'scripts/validate-handoff.js',
];

const missing = requiredFiles.filter((file) => !fs.existsSync(path.join(ROOT, file)));

if (missing.length) {
  console.error('Production preflight failed. Missing files:');
  missing.forEach((file) => console.error(` - ${file}`));
  process.exit(1);
}

console.log('✓ Production preflight passed');
