const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const required = [
  'services/recoveryQueueService.ts',
  'services/observabilityService.ts',
  'services/appHealthService.ts',
];

const missing = required.filter((file) => !fs.existsSync(path.join(ROOT, file)));

if (missing.length) {
  console.error('Recovery integrity validation failed');
  missing.forEach((item) => console.error(` - ${item}`));
  process.exit(1);
}

console.log('✓ Recovery integrity validation passed');
