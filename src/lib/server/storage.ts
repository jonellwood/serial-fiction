import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
export function imageStorageAvailable() {
  return (
    (!env.IMAGE_BUCKET && dev) ||
    !!(
      env.IMAGE_BUCKET &&
      env.IMAGE_ACCESS_KEY_ID &&
      env.IMAGE_SECRET_ACCESS_KEY
    )
  );
}
function bucket() {
  if (!env.IMAGE_BUCKET) {
    if (!dev) throw new Error('Private image storage has not been configured.');
    return null;
  }
  return new S3Client({
    region: env.IMAGE_REGION || 'auto',
    endpoint: env.IMAGE_ENDPOINT || undefined,
    forcePathStyle: true,
    credentials: {
      accessKeyId: env.IMAGE_ACCESS_KEY_ID || '',
      secretAccessKey: env.IMAGE_SECRET_ACCESS_KEY || '',
    },
  });
}
function key(id: string, preview: boolean) {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error('Invalid image ID');
  return `${id}/${preview ? 'preview' : 'original'}.webp`;
}
export async function putImage(id: string, preview: boolean, bytes: Buffer) {
  const name = key(id, preview),
    s3 = bucket();
  if (s3)
    await s3.send(
      new PutObjectCommand({
        Bucket: env.IMAGE_BUCKET,
        Key: name,
        Body: bytes,
        ContentType: 'image/webp',
      }),
    );
  else {
    const path = join(env.IMAGE_LOCAL_DIRECTORY || '.data/images', id);
    await mkdir(path, { recursive: true });
    await writeFile(
      join(env.IMAGE_LOCAL_DIRECTORY || '.data/images', name),
      bytes,
    );
  }
}
export async function deleteImage(id: string, preview: boolean) {
  const name = key(id, preview),
    s3 = bucket();
  if (s3)
    await s3.send(
      new DeleteObjectCommand({ Bucket: env.IMAGE_BUCKET, Key: name }),
    );
  else
    await unlink(join(env.IMAGE_LOCAL_DIRECTORY || '.data/images', name)).catch(
      () => {},
    );
}
export async function getImage(id: string, preview: boolean) {
  const name = key(id, preview),
    s3 = bucket();
  if (!s3)
    return new Uint8Array(
      await readFile(join(env.IMAGE_LOCAL_DIRECTORY || '.data/images', name)),
    );
  const response = await s3.send(
    new GetObjectCommand({ Bucket: env.IMAGE_BUCKET, Key: name }),
  );
  return await response.Body!.transformToByteArray();
}
