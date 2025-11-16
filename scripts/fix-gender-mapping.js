#!/usr/bin/env node

/**
 * Fix Gender Mapping for Avatars
 * 
 * Downloads REAL photos with correct gender matching for each person
 * Ensures male names get male photos, female names get female photos
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

// Read people.json
const people = JSON.parse(fs.readFileSync(peopleJsonPath, 'utf-8'));

// Download a single photo from randomuser.me with specific gender
function downloadPhoto(gender, outputPath, seed, retries = 0) {
  return new Promise((resolve, reject) => {
    if (retries > 10) {
      reject(new Error(`Failed to get correct gender after 10 retries`));
      return;
    }
    
    // Use randomuser.me API with gender and seed for consistency
    // Add timestamp to seed to ensure different results on retry
    const actualSeed = `${seed}-${Date.now()}-${retries}`;
    const url = `https://randomuser.me/api/?gender=${gender}&noinfo&seed=${actualSeed}`;
    
    https.get(url, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        try {
          const json = JSON.parse(data);
          // Verify gender matches
          const resultGender = json.results[0].gender;
          if (resultGender !== gender) {
            console.warn(`  ⚠️  Gender mismatch! Requested ${gender}, got ${resultGender}. Retry ${retries + 1}/10...`);
            // Retry with different seed
            return downloadPhoto(gender, outputPath, seed, retries + 1).then(resolve).catch(reject);
          }
          
          const picture = json.results[0].picture;
          const photoUrl = picture.large || picture.medium || picture.thumbnail;
          
          // Download the actual photo
          https.get(photoUrl, (photoResponse) => {
            if (photoResponse.statusCode === 200) {
              const file = fs.createWriteStream(outputPath);
              photoResponse.pipe(file);
              file.on('finish', () => {
                file.close();
                console.log(`  ✅ Got correct ${gender} photo`);
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

// Fix gender mapping for all people
async function fixGenderMapping() {
  console.log('🔧 Fixing gender mapping for avatars...\n');
  
  // Separate by gender
  const males = people.filter(p => p.gender === 'male' && p.role !== 'AI Assistant' && p.role !== 'HR System');
  const females = people.filter(p => p.gender === 'female' && p.role !== 'AI Assistant' && p.role !== 'HR System');
  
  console.log(`Found ${males.length} males and ${females.length} females\n`);
  
  // Download male photos
  console.log('📥 Downloading MALE photos...');
  for (let i = 0; i < males.length; i++) {
    const person = males[i];
    const avatarPath = person.avatar.replace('/assets/faces/', '');
    const outputPath = path.join(facesDir, avatarPath);
    
    try {
      console.log(`  ${i + 1}. ${person.name} -> ${avatarPath}`);
      await downloadPhoto('male', outputPath, `male-${i}`);
      await new Promise(resolve => setTimeout(resolve, 500)); // Rate limit
    } catch (error) {
      console.error(`  ❌ Failed: ${error.message}`);
    }
  }
  
  console.log('\n📥 Downloading FEMALE photos...');
  for (let i = 0; i < females.length; i++) {
    const person = females[i];
    const avatarPath = person.avatar.replace('/assets/faces/', '');
    const outputPath = path.join(facesDir, avatarPath);
    
    try {
      console.log(`  ${i + 1}. ${person.name} -> ${avatarPath}`);
      await downloadPhoto('female', outputPath, `female-${i}`);
      await new Promise(resolve => setTimeout(resolve, 500)); // Rate limit
    } catch (error) {
      console.error(`  ❌ Failed: ${error.message}`);
    }
  }
  
  console.log('\n✅ Gender mapping fixed!');
  console.log('🔄 Run: npm run predev (to copy to public/assets)');
}

fixGenderMapping().catch(console.error);

