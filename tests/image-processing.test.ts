import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { prepareImage } from '../src/lib/server/image-processing';

describe('image storage optimization', () => {
  it('bounds both variants, removes metadata and stores separate WebP previews', async () => {
    const input = await sharp({
      create: { width: 2400, height: 1200, channels: 3, background: '#769185' },
    })
      .png()
      .withMetadata()
      .toBuffer();
    const { original, preview } = await prepareImage(input);
    const image = await sharp(original).metadata(),
      blurred = await sharp(preview).metadata();
    expect([image.width, image.height, image.format]).toEqual([
      1600,
      800,
      'webp',
    ]);
    expect([blurred.width, blurred.height, blurred.format]).toEqual([
      320,
      160,
      'webp',
    ]);
    expect(image.exif).toBeUndefined();
    expect(image.icc).toBeUndefined();
    expect(original.equals(preview)).toBe(false);
    expect(original.length + preview.length).toBeLessThan(input.length);
  });
  it('respects camera orientation without upscaling the unlocked image', async () => {
    const input = await sharp({
      create: { width: 120, height: 80, channels: 3, background: 'blue' },
    })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();
    const { original } = await prepareImage(input);
    const image = await sharp(original).metadata();
    expect([image.width, image.height]).toEqual([80, 120]);
    expect(image.orientation).toBeUndefined();
  });
  it('rejects disguised non-image and oversized uploads', async () => {
    await expect(prepareImage(Buffer.from('<svg></svg>'))).rejects.toThrow();
    await expect(prepareImage(Buffer.alloc(3_000_001))).rejects.toThrow('3 MB');
  });
});
