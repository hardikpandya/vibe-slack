#!/usr/bin/env node

/**
 * Download RandomUser.me Avatars
 * 
 * Downloads 20 unique realistic human face avatars (10 male, 10 female)
 * from RandomUser.me API for use as profile pictures.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const facesDir = path.join(rootDir, 'assets/faces');

// Ensure faces directory exists
if (!fs.existsSync(facesDir)) {
  fs.mkdirSync(facesDir, { recursive: true });
}

// RandomUser.me API endpoint
const RANDOMUSER_API = 'https://randomuser.me/api/';

// Download a single avatar from RandomUser.me
function downloadRandomUserAvatar(gender, index, outputPath) {
  return new Promise((resolve, reject) => {
    // Request a user with specific gender
    const url = `${RANDOMUSER_API}?gender=${gender}&noinfo&nat=us,gb,ca,au`;
    
    https.get(url, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        try {
          const json = JSON.parse(data);
          const user = json.results[0];
          const pictureUrl = user.picture.large; // Use large size for better quality
          
          // Download the actual image
          https.get(pictureUrl, (imgResponse) => {
            if (imgResponse.statusCode === 200) {
              const file = fs.createWriteStream(outputPath);
              imgResponse.pipe(file);
              file.on('finish', () => {
                file.close();
                resolve({
                  name: `${user.name.first} ${user.name.last}`,
                  gender: user.gender,
                  path: outputPath
                });
              });
            } else {
              reject(new Error(`Failed to download image: ${imgResponse.statusCode}`));
            }
          }).on('error', (err) => {
            file.close();
            if (fs.existsSync(outputPath)) {
              fs.unlinkSync(outputPath);
            }
            reject(err);
          });
        } catch (error) {
          reject(new Error(`Failed to parse API response: ${error.message}`));
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// Download multiple avatars
async function downloadAvatars(count, gender) {
  const avatars = [];
  const genderLabel = gender === 'male' ? 'male' : 'female';
  
  console.log(`\n📥 Downloading ${count} ${genderLabel} avatars from RandomUser.me...\n`);
  
  for (let i = 0; i < count; i++) {
    const filename = `${genderLabel}-${String(i + 1).padStart(2, '0')}.jpg`;
    const outputPath = path.join(facesDir, filename);
    
    // Skip if already exists
    if (fs.existsSync(outputPath)) {
      console.log(`  ⏭️  Skipped ${filename} (already exists)`);
      continue;
    }
    
    try {
      const result = await downloadRandomUserAvatar(gender, i, outputPath);
      console.log(`  ✓ Downloaded ${filename} (${result.name})`);
      avatars.push(result);
      
      // Delay to avoid rate limiting (RandomUser.me is generous but be respectful)
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`  ✗ Failed to download ${filename}: ${error.message}`);
      // Retry once after a delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      try {
        const result = await downloadRandomUserAvatar(gender, i, outputPath);
        console.log(`  ✓ Downloaded ${filename} (retry successful)`);
        avatars.push(result);
      } catch (retryError) {
        console.error(`  ✗ Retry failed for ${filename}: ${retryError.message}`);
      }
    }
  }
  
  return avatars;
}

// Main execution
async function main() {
  console.log('🎭 RandomUser.me Avatar Downloader');
  console.log('=====================================\n');
  
  try {
    // Download 10 male avatars
    const maleAvatars = await downloadAvatars(10, 'male');
    
    // Download 10 female avatars
    const femaleAvatars = await downloadAvatars(10, 'female');
    
    console.log(`\n✅ Avatar download complete!`);
    console.log(`   Male avatars: ${maleAvatars.length}`);
    console.log(`   Female avatars: ${femaleAvatars.length}`);
    console.log(`   Total: ${maleAvatars.length + femaleAvatars.length}`);
    console.log(`\n📁 Avatars saved to: ${facesDir}`);
    console.log(`\n📝 Files:`);
    console.log(`   Male: male-01.jpg through male-10.jpg`);
    console.log(`   Female: female-01.jpg through female-10.jpg`);
    console.log(`\n💡 These avatars can be used as profile pictures for employees.`);
    console.log(`   They are realistic human faces from RandomUser.me API.`);
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main();

