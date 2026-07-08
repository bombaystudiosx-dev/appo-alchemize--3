const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const requiredRoutes = [
  'app/index.tsx',
  'app/auth.tsx',
  'app/settings.tsx',
  'app/quick-add.tsx',
  'app/goals/index.tsx',
  'app/goals/add.tsx',
  'app/goals/[id].tsx',
  'app/gratitude/index.tsx',
  'app/gratitude/add.tsx',
  'app/todos/index.tsx',
  'app/todos/add.tsx',
  'app/calorie/index.tsx',
  'app/calorie/scan.tsx',
  'app/calorie/profile.tsx',
  'app/fitness/index.tsx',
  'app/financial/index.tsx',
  'app/affirmations/index.tsx',
  'app/affirmations/add.tsx',
  'app/affirmations/[id].tsx'
];

const missing = requiredRoutes.filter((route) => !fs.existsSync(path.join(ROOT, route)));

if (missing.length) {
  console.error('Route manifest check failed:');
  missing.forEach((route) => console.error(` - ${route}`));
  process.exit(1);
}

console.log('✓ Route manifest check passed');
