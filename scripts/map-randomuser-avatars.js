#!/usr/bin/env node

/**
 * Map RandomUser Avatars to Person Names
 * 
 * Renames RandomUser.me avatars (male-01.jpg, female-01.jpg) to match person names
 * and ensures correct gender mapping
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const facesDir = path.join(rootDir, 'assets/faces');
const peopleJsonPath = path.join(rootDir, 'src/people.json');

// Read people.json
const peopleData = JSON.parse(fs.readFileSync(peopleJsonPath, 'utf-8'));

// Filter out AI Assistant
const people = peopleData.filter(p => p.role !== 'AI Assistant');

// Separate by gender
const males = people.filter(p => p.gender === 'male');
const females = people.filter(p => p.gender === 'female');

console.log('🔄 Mapping RandomUser avatars to person names...\n');
console.log(`   Males: ${males.length}`);
console.log(`   Females: ${females.length}\n`);

// Map male avatars
let maleMapped = 0;
males.forEach((person, index) => {
  const sourceFile = `male-${String(index + 1).padStart(2, '0')}.jpg`;
  const nameSlug = person.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const targetFile = `${nameSlug}.jpg`;
  const sourcePath = path.join(facesDir, sourceFile);
  const targetPath = path.join(facesDir, targetFile);
  
  if (fs.existsSync(sourcePath)) {
    // Remove old file if it exists (might be placeholder)
    if (fs.existsSync(targetPath) && targetPath !== sourcePath) {
      fs.unlinkSync(targetPath);
    }
    
    // Rename RandomUser avatar to person name
    if (sourcePath !== targetPath) {
      fs.renameSync(sourcePath, targetPath);
      console.log(`  ✓ ${person.name} (male): ${sourceFile} → ${targetFile}`);
      maleMapped++;
    }
  } else {
    console.log(`  ⚠️  ${person.name}: ${sourceFile} not found`);
  }
});

// Map female avatars
let femaleMapped = 0;
females.forEach((person, index) => {
  const sourceFile = `female-${String(index + 1).padStart(2, '0')}.jpg`;
  const nameSlug = person.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const targetFile = `${nameSlug}.jpg`;
  const sourcePath = path.join(facesDir, sourceFile);
  const targetPath = path.join(facesDir, targetFile);
  
  if (fs.existsSync(sourcePath)) {
    // Remove old file if it exists (might be placeholder)
    if (fs.existsSync(targetPath) && targetPath !== sourcePath) {
      fs.unlinkSync(targetPath);
    }
    
    // Rename RandomUser avatar to person name
    if (sourcePath !== targetPath) {
      fs.renameSync(sourcePath, targetPath);
      console.log(`  ✓ ${person.name} (female): ${sourceFile} → ${targetFile}`);
      femaleMapped++;
    }
  } else {
    console.log(`  ⚠️  ${person.name}: ${sourceFile} not found`);
  }
});

console.log(`\n✅ Mapping complete!`);
console.log(`   Male avatars mapped: ${maleMapped}`);
console.log(`   Female avatars mapped: ${femaleMapped}`);
console.log(`   Total: ${maleMapped + femaleMapped}`);

// Verify all people have correct avatar paths
console.log('\n📋 Verifying avatar paths in people.json...');
let allCorrect = true;
people.forEach(person => {
  const nameSlug = person.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const expectedPath = `/assets/faces/${nameSlug}.jpg`;
  const actualPath = person.avatar;
  
  if (actualPath !== expectedPath) {
    console.log(`  ⚠️  ${person.name}: Expected ${expectedPath}, got ${actualPath}`);
    allCorrect = false;
  }
});

if (allCorrect) {
  console.log('  ✅ All avatar paths are correct!');
} else {
  console.log('  ⚠️  Some avatar paths need updating');
}

