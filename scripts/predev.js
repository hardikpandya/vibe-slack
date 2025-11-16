#!/usr/bin/env node

/**
 * Pre-dev script
 * Ensures company-context.json exists (defaults to Atlassian) and generates config files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const contextPath = path.join(rootDir, 'company-context.json');

// If company-context.json doesn't exist, it means user deleted it
// In that case, they need to run setup or we use the default that should be in repo
if (!fs.existsSync(contextPath)) {
  console.log('\n📝 No company-context.json found.');
  console.log('   The app will use default Atlassian configuration.');
  console.log('   To customize, run: npm run setup\n');
}

// Always run generate script if context exists (or if we want to ensure defaults are synced)
if (fs.existsSync(contextPath)) {
  try {
    execSync('node scripts/generate-from-context.js', { cwd: rootDir, stdio: 'pipe' });
  } catch (error) {
    // Silently fail - generation errors will show when dev server starts
  }
}



