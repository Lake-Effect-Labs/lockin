const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// App theme colors
const BACKGROUND_COLOR = '#0A0A0F';
const ACCENT_COLOR = '#FF6B35';
const TEXT_COLOR = '#FFFFFF';

// Asset configurations
const assets = [
  { name: 'icon.png', width: 1024, height: 1024, type: 'icon' },
  { name: 'adaptive-icon.png', width: 1024, height: 1024, type: 'adaptive' },
  { name: 'splash.png', width: 1284, height: 2778, type: 'splash' },
  { name: 'favicon.png', width: 48, height: 48, type: 'favicon' },
  { name: 'notification-icon.png', width: 96, height: 96, type: 'notification' },
];

function drawLockIcon(ctx, centerX, centerY, size) {
  // Lock body
  const bodyWidth = size * 0.6;
  const bodyHeight = size * 0.45;
  const bodyX = centerX - bodyWidth / 2;
  const bodyY = centerY - bodyHeight / 4;
  const cornerRadius = size * 0.08;

  ctx.fillStyle = ACCENT_COLOR;
  ctx.beginPath();
  ctx.roundRect(bodyX, bodyY, bodyWidth, bodyHeight, cornerRadius);
  ctx.fill();

  // Lock shackle (the curved part)
  const shackleWidth = size * 0.35;
  const shackleHeight = size * 0.35;
  const shackleX = centerX - shackleWidth / 2;
  const shackleY = bodyY - shackleHeight + size * 0.05;
  const shackleThickness = size * 0.08;

  ctx.strokeStyle = ACCENT_COLOR;
  ctx.lineWidth = shackleThickness;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(centerX, bodyY, shackleWidth / 2, Math.PI, 0, false);
  ctx.stroke();

  // Keyhole
  const keyholeRadius = size * 0.07;
  const keyholeY = bodyY + bodyHeight * 0.35;
  ctx.fillStyle = BACKGROUND_COLOR;
  ctx.beginPath();
  ctx.arc(centerX, keyholeY, keyholeRadius, 0, Math.PI * 2);
  ctx.fill();

  // Keyhole slot
  const slotWidth = size * 0.04;
  const slotHeight = size * 0.12;
  ctx.fillRect(centerX - slotWidth / 2, keyholeY, slotWidth, slotHeight);
}

function drawFlameAccent(ctx, centerX, centerY, size) {
  // Small flame/fire accent to represent "fire" or "locked in" energy
  const flameSize = size * 0.15;
  ctx.fillStyle = '#FF8F5E';
  ctx.beginPath();
  ctx.moveTo(centerX, centerY - flameSize);
  ctx.quadraticCurveTo(centerX + flameSize * 0.6, centerY - flameSize * 0.3, centerX + flameSize * 0.3, centerY + flameSize * 0.5);
  ctx.quadraticCurveTo(centerX, centerY + flameSize * 0.2, centerX - flameSize * 0.3, centerY + flameSize * 0.5);
  ctx.quadraticCurveTo(centerX - flameSize * 0.6, centerY - flameSize * 0.3, centerX, centerY - flameSize);
  ctx.fill();
}

function generateIcon(config) {
  const { width, height, type, name } = config;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = BACKGROUND_COLOR;
  ctx.fillRect(0, 0, width, height);

  const centerX = width / 2;
  const centerY = height / 2;
  const iconSize = Math.min(width, height) * 0.5;

  if (type === 'splash') {
    // Splash screen - larger icon with text
    const splashIconSize = Math.min(width, height) * 0.25;
    drawLockIcon(ctx, centerX, centerY - height * 0.08, splashIconSize);

    // App name text
    const fontSize = Math.min(width, height) * 0.08;
    ctx.fillStyle = TEXT_COLOR;
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('LOCK-IN', centerX, centerY + height * 0.15);

    // Tagline
    const taglineSize = fontSize * 0.4;
    ctx.font = `${taglineSize}px Arial, sans-serif`;
    ctx.fillStyle = '#888888';
    ctx.fillText('Compete. Track. Win.', centerX, centerY + height * 0.2);
  } else if (type === 'notification') {
    // Notification icon - simpler, monochrome friendly
    drawLockIcon(ctx, centerX, centerY, iconSize * 0.9);
  } else if (type === 'favicon') {
    // Favicon - very small, needs to be recognizable
    drawLockIcon(ctx, centerX, centerY, iconSize * 1.2);
  } else if (type === 'adaptive') {
    // Adaptive icon - needs safe zone (inner 66%)
    const safeSize = iconSize * 0.7;
    drawLockIcon(ctx, centerX, centerY, safeSize);
  } else {
    // Regular icon
    drawLockIcon(ctx, centerX, centerY, iconSize);
  }

  // Save to file
  const outputPath = path.join(__dirname, 'assets', name);
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
  console.log(`✓ Generated: ${name} (${width}x${height})`);
}

// Generate all assets
console.log('\n🎨 Generating Lock-In app assets...\n');
assets.forEach(generateIcon);
console.log('\n✅ All assets generated successfully!\n');

