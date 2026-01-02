import sharp from 'sharp';
import { readFileSync } from 'fs';

const svgBuffer = readFileSync('./public/pwa-icon.svg');

// Generate 192x192 icon
await sharp(svgBuffer)
  .resize(192, 192)
  .png()
  .toFile('./public/pwa-192x192.png');

// Generate 512x512 icon
await sharp(svgBuffer)
  .resize(512, 512)
  .png()
  .toFile('./public/pwa-512x512.png');

console.log('Icons generated successfully!');
