#!/usr/bin/env node
/**
 * Script to generate PNG icons from SVG
 * Run: node scripts/generate-icons.js
 * 
 * Requires: npm install sharp
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is installed
try {
  const sharp = require('sharp');
  
  const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
  const inputSvg = path.join(__dirname, '../static/icons/icon.svg');
  const outputDir = path.join(__dirname, '../static/icons');
  
  async function generateIcons() {
    console.log('Generating PNG icons...\n');
    
    for (const size of sizes) {
      const outputFile = path.join(outputDir, `icon-${size}x${size}.png`);
      
      try {
        await sharp(inputSvg)
          .resize(size, size)
          .png()
          .toFile(outputFile);
        
        console.log(`✓ Generated: icon-${size}x${size}.png`);
      } catch (err) {
        console.error(`✗ Failed: icon-${size}x${size}.png`, err.message);
      }
    }
    
    // Generate favicon.png (32x32)
    try {
      await sharp(path.join(__dirname, '../static/favicon.svg'))
        .resize(32, 32)
        .png()
        .toFile(path.join(__dirname, '../static/favicon.png'));
      
      console.log('\n✓ Generated: favicon.png');
    } catch (err) {
      console.error('\n✗ Failed: favicon.png', err.message);
    }
    
    // Generate maskable icons
    const maskableSizes = [192, 512];
    for (const size of maskableSizes) {
      const outputFile = path.join(outputDir, `maskable-icon-${size}x${size}.png`);
      
      try {
        await sharp(path.join(__dirname, '../static/icons/maskable-icon.svg'))
          .resize(size, size)
          .png()
          .toFile(outputFile);
        
        console.log(`✓ Generated: maskable-icon-${size}x${size}.png`);
      } catch (err) {
        console.error(`✗ Failed: maskable-icon-${size}x${size}.png`, err.message);
      }
    }
    
    console.log('\n✅ Icon generation complete!');
  }
  
  generateIcons().catch(console.error);
  
} catch (err) {
  console.error('❌ Please install sharp first:');
  console.error('   npm install -D sharp\n');
  console.error('Or use online converter:');
  console.error('   https://convertio.co/svg-png/');
  process.exit(1);
}
