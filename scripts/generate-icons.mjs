import { Jimp } from 'jimp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'src', 'assets', 'icons');

const SIZES = [192, 512];
const RED = 0xCC0000FF;
const WHITE = 0xFFFFFFFF;
const DARK = 0x333333FF;

async function drawPokeball(size) {
  const img = new Jimp({ width: size, height: size, color: RED });
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.375;
  const stroke = Math.max(2, size * 0.015);

  // white circle
  img.scan(0, 0, size, size, (x, y) => {
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= r) {
      img.setPixelColor(WHITE, x, y);
    }
  });

  // dark border circle
  img.scan(0, 0, size, size, (x, y) => {
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist >= r - stroke && dist <= r + stroke) {
      img.setPixelColor(DARK, x, y);
    }
  });

  // horizontal divider
  img.scan(0, cy - stroke, size, stroke * 2, (x, y) => {
    const dx = x - cx;
    const dist = Math.sqrt(dx * dx);
    if (dist <= r + stroke) {
      img.setPixelColor(DARK, x, y);
    }
  });

  // inner white circle
  const ir = size * 0.12;
  img.scan(0, 0, size, size, (x, y) => {
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= ir) {
      img.setPixelColor(WHITE, x, y);
    }
  });

  // inner dark circle
  const ir2 = size * 0.05;
  img.scan(0, 0, size, size, (x, y) => {
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= ir2) {
      img.setPixelColor(DARK, x, y);
    }
  });

  // inner border
  img.scan(0, 0, size, size, (x, y) => {
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist >= ir - stroke && dist <= ir + stroke) {
      img.setPixelColor(DARK, x, y);
    }
  });

  return img;
}

for (const size of SIZES) {
  const img = await drawPokeball(size);
  await img.write(join(outDir, `icon-${size}.png`));
  console.log(`Generated ${size}x${size}`);
}

console.log('Done!');
