const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);

const MAX_ROUTE_LINES = 1200;
const MAX_SERVICE_LINES = 800;

const riskyPatterns = [
  { name: 'TODO/FIXME marker', pattern: /\b(TODO|FIXME)\b/g },
  { name: 'console.log usage', pattern: /console\.log\(/g },
  { name: 'unsafe any usage', pattern: /:\s*any\b/g },
  { name: 'direct AsyncStorage use', pattern: /AsyncStorage\./g },
  { name: 'direct route invalidation', pattern: /invalidateQueries\(/g },
  { name: 'manual barcode source regression', pattern: /sourceType:\s*['"]manual['"]/g },
];

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.expo' || entry.name === '.git') continue;

    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(full, files);
    } else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(full);
    }
  }

  return files;
}

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/');
}

function checkOversizedFiles(files) {
  const findings = [];

  for (const file of files) {
    const relative = rel(file);
    const lines = fs.readFileSync(file, 'utf8').split('\n').length;

    if (relative.startsWith('app/') && lines > MAX_ROUTE_LINES) {
      findings.push(`${relative} has ${lines} lines; route files should stay under ${MAX_ROUTE_LINES}.`);
    }

    if (relative.startsWith('services/') && lines > MAX_SERVICE_LINES) {
      findings.push(`${relative} has ${lines} lines; services should stay under ${MAX_SERVICE_LINES}.`);
    }
  }

  return findings;
}

function checkRiskyPatterns(files) {
  const findings = [];

  for (const file of files) {
    const relative = rel(file);
    const content = fs.readFileSync(file, 'utf8');

    for (const { name, pattern } of riskyPatterns) {
      const matches = [...content.matchAll(pattern)];

      if (matches.length > 0) {
        findings.push(`${relative}: ${name} (${matches.length})`);
      }
    }
  }

  return findings;
}

function checkRequiredGovernanceFiles() {
  const required = [
    'services/queryKeys.ts',
    'services/queryInvalidationService.ts',
    'services/notificationLifecycleService.ts',
    'services/foodLogService.ts',
    'scripts/validate-handoff.js',
  ];

  return required
    .filter((file) => !fs.existsSync(path.join(ROOT, file)))
    .map((file) => `Missing governance file: ${file}`);
}

const files = walk(ROOT);
const findings = [
  ...checkRequiredGovernanceFiles(),
  ...checkOversizedFiles(files),
  ...checkRiskyPatterns(files),
];

if (findings.length) {
  console.warn('Repository health findings:');
  findings.forEach((finding) => console.warn(` - ${finding}`));
} else {
  console.log('✓ Repository health check passed with no findings');
}

console.log(`Scanned ${files.length} source files.`);
