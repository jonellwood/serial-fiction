import { mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
await mkdir('.data', { recursive: true });
export const localEnv = {
  ...process.env,
  TURSO_DATABASE_URL: 'file:.data/milestone.db',
  TURSO_AUTH_TOKEN: '',
  AUTH_SECRET: randomBytes(32).toString('hex'),
  PUBLIC_SITE_URL: 'http://localhost:5180',
  DEV_MAILBOX: 'true',
  DEV_MAILBOX_PATH: '.data/milestone-mailbox.json',
  EMAIL_PROVIDER_API_KEY: '',
  EMAIL_FROM: '',
  ADMIN_EMAIL: 'author@example.test',
  IMAGE_BUCKET: '',
  IMAGE_LOCAL_DIRECTORY: '.data/milestone-images',
};
async function run(args) {
  await new Promise((resolve, reject) => {
    const child = spawn('npm', args, { env: localEnv, stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`Command failed: ${code}`)),
    );
  });
}
await run(['run', 'db:seed']);
console.log(
  'Local milestone preview: http://localhost:5180. Sign in as author@example.test for admin or reader@example.test for reader. Links are written only to .data/milestone-mailbox.json.',
);
const server = spawn('npm', ['run', 'dev', '--', '--port', '5180'], {
  env: localEnv,
  stdio: 'inherit',
});
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => server.kill(signal));
server.on('exit', (code) => process.exit(code ?? 0));
