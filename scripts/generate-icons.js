/**
 * Generate app icons for electron-builder
 * Creates PNG icons that electron-builder will convert to icns/ico
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// SVG icon - modern microphone design
const createIconSVG = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea"/>
      <stop offset="100%" style="stop-color:#764ba2"/>
    </linearGradient>
    <linearGradient id="mic" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#ffffff"/>
      <stop offset="100%" style="stop-color:#e0e0e0"/>
    </linearGradient>
  </defs>

  <!-- Background circle -->
  <circle cx="256" cy="256" r="240" fill="url(#bg)"/>

  <!-- Microphone body -->
  <rect x="196" y="120" width="120" height="180" rx="60" fill="url(#mic)"/>

  <!-- Microphone grille lines -->
  <line x1="220" y1="160" x2="292" y2="160" stroke="#ccc" stroke-width="4"/>
  <line x1="220" y1="185" x2="292" y2="185" stroke="#ccc" stroke-width="4"/>
  <line x1="220" y1="210" x2="292" y2="210" stroke="#ccc" stroke-width="4"/>
  <line x1="220" y1="235" x2="292" y2="235" stroke="#ccc" stroke-width="4"/>

  <!-- Microphone stand arc -->
  <path d="M156 260 Q156 360 256 360 Q356 360 356 260"
        stroke="url(#mic)" stroke-width="24" fill="none" stroke-linecap="round"/>

  <!-- Microphone stand -->
  <line x1="256" y1="360" x2="256" y2="410" stroke="url(#mic)" stroke-width="20" stroke-linecap="round"/>

  <!-- Microphone base -->
  <line x1="196" y1="410" x2="316" y2="410" stroke="url(#mic)" stroke-width="20" stroke-linecap="round"/>
</svg>
`;

async function generateIcons() {
  // Create build directory
  const buildDir = path.join(__dirname, '..', 'build');
  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
  }

  // Generate SVG
  const svgContent = createIconSVG(512);
  const svgPath = path.join(buildDir, 'icon.svg');
  fs.writeFileSync(svgPath, svgContent.trim());
  console.log('Generated icon.svg');

  // Convert SVG to PNG using sharp
  const svgBuffer = Buffer.from(svgContent.trim());

  // Generate 512x512 PNG (main icon)
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(buildDir, 'icon.png'));
  console.log('Generated icon.png (512x512)');

  // Generate 256x256 PNG for Windows ICO
  await sharp(svgBuffer)
    .resize(256, 256)
    .png()
    .toFile(path.join(buildDir, 'icon-256.png'));
  console.log('Generated icon-256.png (256x256)');

  // Generate 1024x1024 PNG for macOS (optional, for high DPI)
  await sharp(svgBuffer)
    .resize(1024, 1024)
    .png()
    .toFile(path.join(buildDir, 'icon-1024.png'));
  console.log('Generated icon-1024.png (1024x1024)');

  console.log('');
  console.log('All icons generated in build/ folder');
  console.log('electron-builder will convert these to .icns and .ico during build');
}

generateIcons().catch(console.error);
