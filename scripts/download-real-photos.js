#!/usr/bin/env node

/**
 * Download Real Photo Avatars
 * 
 * Downloads actual photo avatars from randomuser.me API for all people in people.json
 * These are REAL photos, not generated avatars with initials
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const facesDir = path.join(rootDir, 'assets/faces');
const peopleJsonPath = path.join(rootDir, 'src/people.json');

// Ensure faces directory exists
if (!fs.existsSync(facesDir)) {
  fs.mkdirSync(facesDir, { recursive: true });
}

// Read people.json
const people = JSON.parse(fs.readFileSync(peopleJsonPath, 'utf-8'));

// Download a single photo from randomuser.me
function downloadPhoto(gender, outputPath, index) {
  return new Promise((resolve, reject) => {
    // Use randomuser.me API - provides real photos
    // gender can be 'male' or 'female'
    const url = `https://randomuser.me/api/?gender=${gender}&noinfo&seed=${index}`;
    
    https.get(url, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        try {
          const json = JSON.parse(data);
          // Try to get the largest available size
          const picture = json.results[0].picture;
          const photoUrl = picture.large || picture.medium || picture.thumbnail; // Use large size for better quality
          
          // Download the actual photo
          https.get(photoUrl, (photoResponse) => {
            if (photoResponse.statusCode === 200) {
              const file = fs.createWriteStream(outputPath);
              photoResponse.pipe(file);
              file.on('finish', () => {
                file.close();
                resolve(outputPath);
              });
            } else {
              reject(new Error(`Failed to download photo: ${photoResponse.statusCode}`));
            }
          }).on('error', reject);
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

// Download photos for all people
async function downloadAllPhotos() {
  console.log('📥 Downloading REAL photos for all people...\n');
  
  let maleIndex = 0;
  let femaleIndex = 0;
  
  for (const person of people) {
    // Skip bots/system accounts
    if (person.role === 'AI Assistant' || person.role === 'HR System') {
      console.log(`⏭️  Skipping ${person.name} (${person.role})`);
      continue;
    }
    
    const avatarPath = person.avatar.replace('/assets/faces/', '');
    const outputPath = path.join(facesDir, avatarPath);
    
    // Determine gender
    const gender = person.gender === 'male' ? 'male' : 'female';
    const index = gender === 'male' ? maleIndex++ : femaleIndex++;
    
    try {
      console.log(`⬇️  Downloading photo for ${person.name} (${gender})...`);
      await downloadPhoto(gender, outputPath, index);
      console.log(`✅ Downloaded: ${avatarPath}\n`);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`❌ Failed to download photo for ${person.name}:`, error.message);
    }
  }
  
  console.log('\n✅ Photo download complete!');
  console.log('🔄 Run: npm run predev (to copy to public/assets)');
}

downloadAllPhotos().catch(console.error);

