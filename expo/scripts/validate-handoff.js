const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const ROUTES = [
  'app/index.tsx',
  'app/auth.tsx',
  'app/settings.tsx',
  'app/calorie/scan.tsx',
  'app/todos/index.tsx',
  'app/gratitude/add.tsx',
  'app/goals/index.tsx'
];

const DB_FACADES = [
  'lib/db/core.ts',
  'lib/db/goals.ts',
  'lib/db/tasks.ts',
  'lib/db/gratitude.ts',
  'lib/db/food.ts',
  'lib/db/fitness.ts',
  'lib/db/finance.ts',
  'lib/db/appointments.ts'
];

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath));
}

function requireFiles(label, files) {
  const missing = files.filter((file) => !exists(file));

  if (missing.length) {
    console.error(`${label} missing:`, missing);
    process.exitCode = 1;
    return false;
  }

  console.log(`✓ ${label} present`);
  return true;
}

function validateReflectionWiring() {
  const database = read('lib/database.ts');
  const types = read('types/index.ts');
  const gratitudeAdd = read('app/gratitude/add.tsx');

  const checks = [
    ['type contract', types.includes('reflection?: string | null')],
    ['schema column', database.includes('reflection TEXT')],
    ['migration column', database.includes('ADD COLUMN reflection TEXT')],
    ['insert persistence', database.includes('gratitude3, reflection, createdAt')],
    ['update persistence', database.includes('reflection = ?')],
    ['UI prompt', gratitudeAdd.includes('What could I have done better today?')]
  ];

  const failed = checks.filter(([, passed]) => !passed).map(([name]) => name);

  if (failed.length) {
    console.error('Reflection wiring failed:', failed);
    process.exitCode = 1;
    return;
  }

  console.log('✓ Gratitude reflection wiring passed');
}

function validateDirectDatabaseImports() {
  const allowedDirect = new Set([
    'lib/db/core.ts',
    'lib/db/goals.ts',
    'lib/db/tasks.ts',
    'lib/db/gratitude.ts',
    'lib/db/food.ts',
    'lib/db/fitness.ts',
    'lib/db/finance.ts',
    'lib/db/appointments.ts',
    'lib/db/manifestations.ts',
    'lib/db/affirmations.ts',
    'lib/db/index.ts'
  ]);

  const offenders = [];

  function walk(dir) {
    for (const item of fs.readdirSync(dir)) {
      const full = path.join(dir, item);
      const stat = fs.statSync(full);

      if (stat.isDirectory()) {
        if (['node_modules', '.expo'].includes(item)) continue;
        walk(full);
        continue;
      }

      if (!/\.(ts|tsx)$/.test(item)) continue;

      const relative = path.relative(ROOT, full).replace(/\\/g, '/');
      const body = fs.readFileSync(full, 'utf8');

      if (body.includes('@/lib/database') && !allowedDirect.has(relative)) {
        offenders.push(relative);
      }
    }
  }

  walk(ROOT);

  if (offenders.length) {
    console.warn('⚠ Remaining direct database imports:', offenders.length);
    offenders.slice(0, 10).forEach((file) => console.warn(` - ${file}`));
    return;
  }

  console.log('✓ No direct database imports outside facades');
}

requireFiles('Routes', ROUTES);
requireFiles('DB facades', DB_FACADES);
validateReflectionWiring();
validateDirectDatabaseImports();

console.log('Validation completed.');


function validatePhase3Services() {
  const required = [
    'services/calorieAnalysisService.ts',
    'services/taskReminderService.ts',
    'hooks/useTaskReminders.ts'
  ];

  const missing = required.filter((file) => !exists(file));

  if (missing.length) {
    console.error('Missing Phase 3 service files:', missing);
    process.exitCode = 1;
    return;
  }

  console.log('✓ Phase 3 service boundary validation passed');
}

validatePhase3Services();

function validateQueryGovernance() {
  const required = [
    'services/queryKeys.ts',
    'services/queryInvalidationService.ts',
    'services/asyncStateService.ts'
  ];

  const missing = required.filter((file) => !fs.existsSync(path.join(ROOT, file)));

  if (missing.length) {
    console.error('Missing query/state governance files:', missing);
    process.exitCode = 1;
    return;
  }

  console.log('✓ Query/state governance files present');
}

validateQueryGovernance();


function validateNotificationLifecycleGovernance() {
  const required = [
    'services/taskReminderService.ts',
    'services/notificationLifecycleService.ts'
  ];

  const missing = required.filter((file) => !fs.existsSync(path.join(ROOT, file)));

  if (missing.length) {
    console.error('Missing notification lifecycle governance files:', missing);
    process.exitCode = 1;
    return;
  }

  console.log('✓ Notification lifecycle governance files present');
}

validateNotificationLifecycleGovernance();

function validateHardeningTools() {
  const required = [
    'scripts/repo-health-check.js',
    'hooks/useMountedRef.ts',
    'services/renderGuardService.ts'
  ];

  const missing = required.filter((file) => !fs.existsSync(path.join(ROOT, file)));

  if (missing.length) {
    console.error('Missing hardening files:', missing);
    process.exitCode = 1;
    return;
  }

  console.log('✓ Hardening tools present');
}

validateHardeningTools();

function validateProductionScalingBoundaries() {
  const required = [
    'config/featureFlags.ts',
    'services/observabilityService.ts',
    'services/appHealthService.ts',
    'services/recoveryQueueService.ts',
    'scripts/production-preflight.js'
  ];

  const missing = required.filter((file) => !fs.existsSync(path.join(ROOT, file)));

  if (missing.length) {
    console.error('Missing production scaling boundaries:', missing);
    process.exitCode = 1;
    return;
  }

  console.log('✓ Production scaling boundaries present');
}

validateProductionScalingBoundaries();

function validateCiAndRecovery() {
  const required = [
    '.github/workflows/stability-check.yml',
    'scripts/recovery-integrity-check.js',
    'scripts/crash-report-template.json'
  ];

  const missing = required.filter((file) => !fs.existsSync(path.join(ROOT, file)));

  if (missing.length) {
    console.error('Missing CI/recovery files:', missing);
    process.exitCode = 1;
    return;
  }

  console.log('✓ CI and recovery files present');
}

validateCiAndRecovery();
