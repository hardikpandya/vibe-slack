#!/usr/bin/env node

/**
 * Download Default Atlassian Avatars
 * 
 * Downloads gender-aware avatars for all default Atlassian people
 * Uses UI Avatars API for consistent, diverse avatars
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

// Default Atlassian people with their genders
const defaultPeople = [
  { name: "James McGill", gender: "male" },
  { name: "Alice Carlysle", gender: "female" },
  { name: "Bob Jenkins", gender: "male" },
  { name: "Carol Diaz", gender: "female" },
  { name: "David Chen", gender: "male" },
  { name: "Eve Park", gender: "female" },
  { name: "James Bryant", gender: "male" },
  { name: "Priya Shah", gender: "female" },
  { name: "Sarah Kim", gender: "female" },
  { name: "Mike Rodriguez", gender: "male" },
  { name: "Emma Wilson", gender: "female" },
  { name: "Alex Thompson", gender: "male" },
  { name: "Lisa Anderson", gender: "female" },
  { name: "Chris Martinez", gender: "male" },
  { name: "Jordan Lee", gender: "male" }
];

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
    
    // Build URL - use a more realistic avatar service
    // Using DiceBear API for more realistic avatars
    const avatarStyle = gender === 'female' ? 'avataaars' : 'avataaars';
    const seed = name.toLowerCase().replace(/\s+/g, '-');
    
    // Try DiceBear first (more realistic), fallback to UI Avatars
    const dicebearUrl = `https://api.dicebear.com/7.x/${avatarStyle}/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
    
    const file = fs.createWriteStream(outputPath);
    const protocol = dicebearUrl.startsWith('https') ? https : http;
    
    protocol.get(dicebearUrl, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(outputPath);
        });
      } else {
        // Fallback to UI Avatars
        file.close();
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }
        
        const params = new URLSearchParams({
          name: initials,
          background: bgColor,
          color: textColor,
          size: '256',
          bold: 'true',
          format: 'png'
        });
        
        const uiAvatarsUrl = `${UI_AVATARS_BASE}?${params.toString()}`;
        const file2 = fs.createWriteStream(outputPath);
        const protocol2 = uiAvatarsUrl.startsWith('https') ? https : http;
        
        protocol2.get(uiAvatarsUrl, (response2) => {
          if (response2.statusCode === 200) {
            response2.pipe(file2);
            file2.on('finish', () => {
              file2.close();
              resolve(outputPath);
            });
          } else {
            file2.close();
            if (fs.existsSync(outputPath)) {
              fs.unlinkSync(outputPath);
            }
            reject(new Error(`Failed to download: ${response2.statusCode}`));
          }
        }).on('error', (err) => {
          file2.close();
          if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
          }
          reject(err);
        });
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

// Download avatars for all default people
async function downloadDefaultAvatars() {
  console.log(`\n📥 Downloading avatars for ${defaultPeople.length} default Atlassian people...\n`);
  
  let downloaded = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const person of defaultPeople) {
    const name = person.name;
    const gender = person.gender;
    
    // Generate filename from name - DiceBear returns SVG, UI Avatars returns PNG
    const filename = `${name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}.svg`;
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
      await new Promise(resolve => setTimeout(resolve, 200));
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

// Main execution
async function main() {
  try {
    await downloadDefaultAvatars();
    console.log('\n🎉 All default avatars downloaded successfully!');
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main();

