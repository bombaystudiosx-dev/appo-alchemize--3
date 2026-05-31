const { spawnSync } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const checks = [
  ['node', ['scripts/route-manifest-check.js']],
  ['node', ['scripts/validate-handoff.js']],
  ['node', ['scripts/handoff-readiness-check.js']],
  ['node', ['scripts/production-preflight.js']],
  ['node', ['scripts/recovery-integrity-check.js']],
];

let failed = false;

for (const [command, args] of checks) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    failed = true;
    console.error(`Validation failed: ${command} ${args.join(' ')}`);
  }
}

if (failed) {
  process.exit(1);
}

console.log('✓ Final validation passed');
