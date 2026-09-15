import sharp from 'sharp';

// Normalize before writing to either local storage or a private cloud bucket.
export async function prepareImage(input: Buffer) {
  if (!input.length || input.length > 3_000_000)
    throw new Error('Images must be under 3 MB.');
  const metadata = await sharp(input, {
    limitInputPixels: 25_000_000,
  }).metadata();
  if (
    !['jpeg', 'png', 'webp'].includes(metadata.format || '') ||
    (metadata.pages || 1) > 1
  )
    throw new Error('Use a still JPEG, PNG or WebP.');
  // Sharp strips metadata by default. Rotate before resizing to respect EXIF.
  const original = await sharp(input, { limitInputPixels: 25_000_000 })
    .rotate()
    .resize({
      width: 1600,
      height: 1600,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 80, effort: 4 })
    .toBuffer();
  // Encode the tiny blurred version first: two resize calls in one Sharp
  // pipeline would otherwise override one another.
  const small = await sharp(original)
    .resize({ width: 24, height: 24, fit: 'inside', withoutEnlargement: true })
    .blur(3)
    .webp()
    .toBuffer();
  const preview = await sharp(small)
    .resize({ width: 320, height: 320, fit: 'inside' })
    .webp({ quality: 45 })
    .toBuffer();
  return { original, preview };
}
