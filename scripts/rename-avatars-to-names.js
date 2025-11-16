#!/usr/bin/env node

/**
 * Rename Avatar Files to Match Person Names
 * 
 * Renames avatar files from male-01.jpg/female-01.jpg format to person-name.jpg format
 * and updates people.json and restore-defaults.js accordingly
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const facesDir = path.join(rootDir, 'assets/faces');
const peopleJsonPath = path.join(rootDir, 'src/people.json');
const restoreDefaultsPath = path.join(rootDir, 'scripts/restore-defaults.js');

// Read people.json
const peopleData = JSON.parse(fs.readFileSync(peopleJsonPath, 'utf-8'));

// Mapping: person name -> current avatar filename -> new avatar filename
const renames = [];

peopleData.forEach((person, index) => {
  if (person.role === 'AI Assistant') {
    // Skip Rovo - uses SVG icon
    return;
  }
  
  const currentAvatar = person.avatar.replace('/assets/faces/', '');
  const nameSlug = person.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const newAvatar = `${nameSlug}.jpg`;
  
  if (currentAvatar !== newAvatar) {
    renames.push({
      person: person.name,
      gender: person.gender,
      currentFile: currentAvatar,
      newFile: newAvatar,
      currentPath: path.join(facesDir, currentAvatar),
      newPath: path.join(facesDir, newAvatar)
    });
  }
});

console.log('🔄 Renaming avatar files to match person names...\n');

// Rename files
let renamed = 0;
let errors = 0;

renames.forEach(({ person, gender, currentFile, newFile, currentPath, newPath }) => {
  try {
    if (fs.existsSync(currentPath)) {
      // Check if new file already exists
      if (fs.existsSync(newPath)) {
        console.log(`  ⚠️  ${person}: ${newFile} already exists, skipping`);
        return;
      }
      
      fs.renameSync(currentPath, newPath);
      console.log(`  ✓ ${person} (${gender}): ${currentFile} → ${newFile}`);
      renamed++;
    } else {
      console.log(`  ✗ ${person}: ${currentFile} not found`);
      errors++;
    }
  } catch (error) {
    console.error(`  ✗ ${person}: Error renaming - ${error.message}`);
    errors++;
  }
});

console.log(`\n✅ Renamed ${renamed} files`);
if (errors > 0) {
  console.log(`   Errors: ${errors}`);
}

// Update people.json
console.log('\n📝 Updating people.json...');
peopleData.forEach(person => {
  if (person.role === 'AI Assistant') {
    return; // Keep Rovo's SVG icon
  }
  
  const nameSlug = person.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  person.avatar = `/assets/faces/${nameSlug}.jpg`;
});

fs.writeFileSync(peopleJsonPath, JSON.stringify(peopleData, null, 2));
console.log('✅ Updated people.json');

// Update restore-defaults.js
console.log('\n📝 Updating restore-defaults.js...');
let restoreContent = fs.readFileSync(restoreDefaultsPath, 'utf-8');

// Update each person's avatar path
peopleData.forEach(person => {
  if (person.role === 'AI Assistant') {
    return; // Keep Rovo's SVG icon
  }
  
  const nameSlug = person.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const oldPattern = new RegExp(`(avatar:\\s*")([^"]*${person.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^"]*)"`, 'g');
  const newAvatar = `/assets/faces/${nameSlug}.jpg`;
  
  // Find and replace avatar paths for this person
  restoreContent = restoreContent.replace(
    new RegExp(`(name:\\s*"${person.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^}]*avatar:\\s*")[^"]*"`, 'g'),
    `$1${newAvatar}"`
  );
});

fs.writeFileSync(restoreDefaultsPath, restoreContent);
console.log('✅ Updated restore-defaults.js');

console.log('\n🎉 Avatar renaming complete!');
console.log('\n📋 Summary:');
console.log(`   People: ${peopleData.length}`);
console.log(`   Avatars renamed: ${renamed}`);
console.log(`   Files updated: people.json, restore-defaults.js`);

