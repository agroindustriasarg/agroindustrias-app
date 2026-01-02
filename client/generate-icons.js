import sharp from 'sharp';

// Generate 192x192 icon from logo
await sharp('./public/logo-original.jpg')
  .resize(192, 192, { fit: 'cover' })
  .png()
  .toFile('./public/pwa-192x192.png');

// Generate 512x512 icon from logo
await sharp('./public/logo-original.jpg')
  .resize(512, 512, { fit: 'cover' })
  .png()
  .toFile('./public/pwa-512x512.png');

console.log('Icons generated successfully from your logo!');
