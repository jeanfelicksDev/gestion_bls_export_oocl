#!/usr/bin/env node
/**
 * Quick Setup & Verification Script for Windows
 * Run: node quick-setup.js
 */

const fs = require('fs');
const path = require('path');

const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';

console.log(`\n${BLUE}=== GESTION BLS - Setup Verification ===${RESET}\n`);

const checks = [
  {
    name: '.env.local exists',
    test: () => fs.existsSync('.env.local'),
    fix: () => {
      if (!fs.existsSync('.env.local') && fs.existsSync('.env.example')) {
        fs.copyFileSync('.env.example', '.env.local');
        console.log(`  ${YELLOW}→ .env.local created from .env.example${RESET}`);
        console.log(`  ${YELLOW}→ Edit .env.local and add DATABASE_URL${RESET}`);
      }
    }
  },
  {
    name: 'node_modules exists',
    test: () => fs.existsSync('node_modules'),
    fix: () => console.log(`  ${YELLOW}→ Run: npm install${RESET}`)
  },
  {
    name: 'DATABASE_URL configured',
    test: () => {
      const content = fs.readFileSync('.env.local', 'utf8');
      return content.includes('DATABASE_URL=');
    },
    fix: () => console.log(`  ${YELLOW}→ Add DATABASE_URL to .env.local${RESET}`),
    skip: () => !fs.existsSync('.env.local')
  },
  {
    name: 'prisma/schema.prisma exists',
    test: () => fs.existsSync('prisma/schema.prisma'),
    fix: () => console.log(`  ${YELLOW}→ Prisma schema missing${RESET}`)
  },
  {
    name: 'package.json valid',
    test: () => {
      const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      return pkg.name && pkg.version;
    },
    fix: () => console.log(`  ${YELLOW}→ Invalid package.json${RESET}`)
  }
];

let passCount = 0;
let failCount = 0;

console.log(`${BLUE}Running checks...${RESET}\n`);

for (const check of checks) {
  if (check.skip?.()) {
    console.log(`  ⊘ ${check.name} (skipped)`);
    continue;
  }

  try {
    if (check.test()) {
      console.log(`  ${GREEN}✓${RESET} ${check.name}`);
      passCount++;
    } else {
      console.log(`  ${RED}✗${RESET} ${check.name}`);
      check.fix?.();
      failCount++;
    }
  } catch (e) {
    console.log(`  ${RED}✗${RESET} ${check.name}: ${e.message}`);
    failCount++;
  }
}

console.log(`\n${BLUE}=== Summary ===${RESET}\n`);
console.log(`  Passed: ${GREEN}${passCount}${RESET}`);
console.log(`  Failed: ${RED}${failCount}${RESET}`);

console.log(`\n${BLUE}=== Next Steps ===${RESET}\n`);

if (failCount === 0) {
  console.log(`  ${GREEN}✓ All checks passed!${RESET}`);
  console.log(`\n  To start development:`);
  console.log(`    ${BLUE}npm run dev${RESET}`);
  console.log(`\n  Then open: ${BLUE}http://localhost:3000${RESET}`);
} else {
  console.log(`  ${YELLOW}Fix the issues above before running npm run dev${RESET}`);
}

console.log(`\n  For full setup instructions: ${BLUE}DEPLOYMENT_GUIDE.md${RESET}`);
console.log(`  For verification checklist: ${BLUE}CHECKLIST.md${RESET}`);
console.log(`\n`);
