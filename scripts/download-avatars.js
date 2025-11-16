#!/usr/bin/env node

/**
 * Avatar Downloader Script
 * 
 * Downloads avatar images for all employees to ensure no missing avatars.
 * Uses UI Avatars API to generate diverse, gender-appropriate avatars.
 * 
 * Usage:
 *   node scripts/download-avatars.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const facesDir = path.join(rootDir, 'assets/faces');

// Ensure faces directory exists
if (!fs.existsSync(facesDir)) {
  fs.mkdirSync(facesDir, { recursive: true });
}

// UI Avatars API - generates diverse avatars
const UI_AVATARS_BASE = 'https://ui-avatars.com/api/';

// Download a single avatar image
function downloadAvatar(name, gender, outputPath) {
  return new Promise((resolve, reject) => {
    // Generate initials
    const nameParts = name.split(' ');
    const initials = nameParts.length >= 2 
      ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
      : name.substring(0, 2).toUpperCase();
    
    // Determine background color based on gender and name hash
    const colors = {
      male: ['3B82F6', '10B981', 'F59E0B', 'EF4444', '8B5CF6', 'EC4899', '06B6D4'],
      female: ['EC4899', 'F472B6', 'A855F7', '8B5CF6', '6366F1', '3B82F6', '06B6D4'],
      neutral: ['6B7280', '9CA3AF', 'D1D5DB', '4B5563', '374151']
    };
    
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const colorArray = colors[gender] || colors.neutral;
    const bgColor = colorArray[Math.abs(hash) % colorArray.length];
    const textColor = 'FFFFFF';
    
    // Build URL
    const params = new URLSearchParams({
      name: initials,
      background: bgColor,
      color: textColor,
      size: '256',
      bold: 'true',
      format: 'png'
    });
    
    const url = `${UI_AVATARS_BASE}?${params.toString()}`;
    
    const file = fs.createWriteStream(outputPath);
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(outputPath);
        });
      } else {
        file.close();
        fs.unlinkSync(outputPath);
        reject(new Error(`Failed to download: ${response.statusCode}`));
      }
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
      reject(err);
    });
  });
}

// Download avatars for all employees
async function downloadAvatarsForEmployees() {
  const contextPath = path.join(rootDir, 'company-context.json');
  
  if (!fs.existsSync(contextPath)) {
    console.log('⚠️  company-context.json not found. Run setup wizard first.');
    process.exit(1);
  }
  
  const context = JSON.parse(fs.readFileSync(contextPath, 'utf-8'));
  const employees = context.employees || [];
  
  console.log(`\n📥 Downloading avatars for ${employees.length} employees...\n`);
  
  let downloaded = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const emp of employees) {
    const name = emp.name;
    const gender = emp.gender || 'neutral';
    
    // Generate filename from name (UI Avatars generates PNG)
    const filename = `${name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}.png`;
    const outputPath = path.join(facesDir, filename);
    
    // Skip if already exists
    if (fs.existsSync(outputPath)) {
      console.log(`  ⏭️  Skipped ${name} (already exists)`);
      skipped++;
      continue;
    }
    
    try {
      await downloadAvatar(name, gender, outputPath);
      console.log(`  ✓ Downloaded avatar for ${name}`);
      downloaded++;
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`  ✗ Failed to download avatar for ${name}: ${error.message}`);
      errors++;
    }
  }
  
  console.log(`\n✅ Avatar download complete!`);
  console.log(`   Downloaded: ${downloaded}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Errors: ${errors}`);
  console.log(`\n📁 Avatars saved to: ${facesDir}`);
}

// Also download additional generic avatars for fallback
async function downloadGenericAvatars() {
  console.log(`\n📥 Downloading additional generic avatars for fallback...\n`);
  
  const genericNames = [
    { name: 'Alex Johnson', gender: 'male' },
    { name: 'Sarah Williams', gender: 'female' },
    { name: 'Chris Martinez', gender: 'male' },
    { name: 'Emma Wilson', gender: 'female' },
    { name: 'Jordan Lee', gender: 'neutral' },
    { name: 'Taylor Brown', gender: 'neutral' },
    { name: 'Casey Smith', gender: 'neutral' },
    { name: 'Morgan Davis', gender: 'neutral' },
    { name: 'Riley Johnson', gender: 'neutral' },
    { name: 'Avery Taylor', gender: 'neutral' }
  ];
  
  let downloaded = 0;
  
  for (const person of genericNames) {
    const filename = `${person.name.toLowerCase().replace(/\s+/g, '-')}.png`;
    const outputPath = path.join(facesDir, filename);
    
    if (fs.existsSync(outputPath)) {
      continue;
    }
    
    try {
      await downloadAvatar(person.name, person.gender, outputPath);
      console.log(`  ✓ Downloaded ${person.name}`);
      downloaded++;
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`  ✗ Failed: ${error.message}`);
    }
  }
  
  console.log(`\n✅ Downloaded ${downloaded} generic avatars`);
}

// Main execution
async function main() {
  try {
    await downloadAvatarsForEmployees();
    await downloadGenericAvatars();
    console.log('\n🎉 All avatars downloaded successfully!');
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main();

