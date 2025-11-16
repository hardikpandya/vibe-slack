#!/usr/bin/env node

/**
 * Organize Avatars by Gender and Map Names One-to-One
 * 
 * 1. Creates separate male/female folders
 * 2. Categorizes all avatars by gender
 * 3. Creates separate name lists with gender identifiers
 * 4. Maps 1 male name to 1 male image, 1 female name to 1 female image
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const facesDir = path.join(rootDir, 'assets/faces');
const maleDir = path.join(facesDir, 'male');
const femaleDir = path.join(facesDir, 'female');
const peopleJsonPath = path.join(rootDir, 'src/people.json');

// Ensure directories exist
if (!fs.existsSync(maleDir)) fs.mkdirSync(maleDir, { recursive: true });
if (!fs.existsSync(femaleDir)) fs.mkdirSync(femaleDir, { recursive: true });

// Read current people.json
const peopleData = JSON.parse(fs.readFileSync(peopleJsonPath, 'utf-8'));

// Get all avatar files (excluding subdirectories)
const allFiles = fs.readdirSync(facesDir).filter(f => {
  const fullPath = path.join(facesDir, f);
  return fs.statSync(fullPath).isFile() && /\.(jpg|jpeg|png)$/i.test(f);
});

// Categorize avatars by gender
const maleAvatars = [];
const femaleAvatars = [];

allFiles.forEach(file => {
  const lower = file.toLowerCase();
  
  // Female indicators (check first to avoid false positives)
  if (lower.includes('female') || 
      /face-[2457]\.(jpg|jpeg|png)$/i.test(file) ||
      lower.includes('alice') || lower.includes('carol') || lower.includes('eve') ||
      lower.includes('priya') || lower.includes('sarah') || lower.includes('emma') ||
      lower.includes('lisa') || lower.includes('hannah') || lower.includes('mia') ||
      lower.includes('ananya') || lower.includes('deepika') || lower.includes('amanda') ||
      lower.includes('ashley') || lower.includes('casey')) {
    femaleAvatars.push(file);
  }
  // Male indicators
  else if (lower.includes('male') || 
      /face-[136]\.(jpg|jpeg|png)$/i.test(file) ||
      lower.includes('james') || lower.includes('bob') || lower.includes('david') ||
      lower.includes('chris') || (lower.includes('alex') && !lower.includes('alexandra')) ||
      lower.includes('jordan') || lower.includes('felix') || lower.includes('alexander') ||
      lower.includes('paul') || lower.includes('mike') || lower.includes('arjun') ||
      lower.includes('amit') || (lower.includes('avery') && !lower.includes('ashley'))) {
    maleAvatars.push(file);
  }
});

console.log(`📁 Found ${maleAvatars.length} male avatars and ${femaleAvatars.length} female avatars`);

// Separate people by gender (excluding neutral/bots)
const maleNames = peopleData.filter(p => p.gender === 'male').map(p => p.name);
const femaleNames = peopleData.filter(p => p.gender === 'female').map(p => p.name);

console.log(`👥 Found ${maleNames.length} male names and ${femaleNames.length} female names`);

// Check if we have enough avatars
if (maleAvatars.length < maleNames.length) {
  console.warn(`⚠️  Warning: Only ${maleAvatars.length} male avatars for ${maleNames.length} male names`);
}
if (femaleAvatars.length < femaleNames.length) {
  console.warn(`⚠️  Warning: Only ${femaleAvatars.length} female avatars for ${femaleNames.length} female names`);
}

// Copy avatars to gender-specific folders
console.log('\n📋 Copying avatars to gender-specific folders...');
maleAvatars.forEach(file => {
  const src = path.join(facesDir, file);
  const dest = path.join(maleDir, file);
  if (!fs.existsSync(dest)) {
    fs.copyFileSync(src, dest);
  }
});

femaleAvatars.forEach(file => {
  const src = path.join(facesDir, file);
  const dest = path.join(femaleDir, file);
  if (!fs.existsSync(dest)) {
    fs.copyFileSync(src, dest);
  }
});

// Create one-to-one mapping
const maleMapping = {};
const femaleMapping = {};

maleNames.forEach((name, index) => {
  if (index < maleAvatars.length) {
    maleMapping[name] = maleAvatars[index];
  }
});

femaleNames.forEach((name, index) => {
  if (index < femaleAvatars.length) {
    femaleMapping[name] = femaleAvatars[index];
  }
});

// Update people.json with new paths
console.log('\n🔄 Updating people.json with one-to-one mappings...');
const updatedPeople = peopleData.map(person => {
  if (person.gender === 'male' && maleMapping[person.name]) {
    return {
      ...person,
      avatar: `/assets/faces/male/${maleMapping[person.name]}`
    };
  } else if (person.gender === 'female' && femaleMapping[person.name]) {
    return {
      ...person,
      avatar: `/assets/faces/female/${femaleMapping[person.name]}`
    };
  }
  return person; // Keep bots/neutral unchanged
});

// Write updated people.json
fs.writeFileSync(peopleJsonPath, JSON.stringify(updatedPeople, null, 2));

// Create mapping report
const mappingReport = {
  maleNames: maleNames,
  femaleNames: femaleNames,
  maleAvatars: maleAvatars,
  femaleAvatars: femaleAvatars,
  maleMapping: maleMapping,
  femaleMapping: femaleMapping
};

fs.writeFileSync(
  path.join(rootDir, 'scripts/avatar-mapping-report.json'),
  JSON.stringify(mappingReport, null, 2)
);

console.log('\n✅ Organization complete!');
console.log(`\n📊 Mapping Summary:`);
console.log(`   Male: ${Object.keys(maleMapping).length} names mapped to ${maleAvatars.length} avatars`);
console.log(`   Female: ${Object.keys(femaleMapping).length} names mapped to ${femaleAvatars.length} avatars`);
console.log(`\n📄 Mapping report saved to: scripts/avatar-mapping-report.json`);

