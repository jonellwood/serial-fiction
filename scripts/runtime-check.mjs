import { cp, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';

// Run with --no-experimental-require-module to match Lambda's restriction.
// Import the deployed artifact, not the source or Vitest-transformed module.
const markdown = await import('../.netlify/server/chunks/markdown.js');
const renderers = Object.values(markdown).filter(
  (value) => typeof value === 'function',
);
assert.equal(renderers.length, 1, 'Expected one exported Markdown renderer');
const render = renderers[0];
assert.match(
  render('**A safe sentence.**'),
  /<strong>A safe sentence\.<\/strong>/,
);
assert.doesNotMatch(render('[unsafe](javascript:alert(1))'), /href=/);
assert.doesNotMatch(render('<script>alert(1)</script>'), /<script|alert\(1\)/);

// Initialize the compiled server and import every route with placeholder env.
// No live credentials, database queries, or email requests are used.
const { Server } = await import('../.netlify/server/index.js');
const { manifest } = await import('../.netlify/server/manifest.js');
const server = new Server(manifest);
await server.init({
  env: {
    TURSO_DATABASE_URL: 'libsql://runtime-check.invalid',
    TURSO_AUTH_TOKEN: 'runtime-check-placeholder',
    AUTH_SECRET: 'runtime-check-only-secret-never-used-for-a-real-session',
    PUBLIC_SITE_URL: 'https://runtime-check.invalid',
    EMAIL_FROM: 'Runtime Check <test@example.invalid>',
    EMAIL_PROVIDER_API_KEY: 'runtime-check-placeholder',
    DEV_MAILBOX: 'false',
  },
});
for (const load of manifest._.nodes) await load();
console.log(
  'PASS: Netlify server and all routes load without require(ESM); compiled Markdown remains sanitized.',
);

// A workspace import can hide missing deployment dependencies by resolving
// them from the project's node_modules. Test the built Markdown in isolation.
const isolated = await mkdtemp(join(tmpdir(), 'between-lines-runtime-'));
try {
  await cp('.netlify/server/chunks', join(isolated, 'chunks'), {
    recursive: true,
  });
  await writeFile(
    join(isolated, 'package.json'),
    JSON.stringify({ type: 'module' }),
  );
  const result = spawnSync(
    process.execPath,
    [
      '--no-experimental-require-module',
      '--input-type=module',
      '-e',
      `import assert from 'node:assert/strict';
     const module = await import('./chunks/markdown.js');
     const render = Object.values(module).find(value => typeof value === 'function');
     assert.ok(render('**Safe**').includes('<strong>Safe</strong>'));
     assert.doesNotMatch(render('[unsafe](javascript:alert(1))'), /href=/);`,
    ],
    { cwd: isolated, encoding: 'utf8', env: { ...process.env, NODE_PATH: '' } },
  );
  assert.equal(
    result.status,
    0,
    `Isolated Markdown runtime failed: ${result.stderr}`,
  );
  console.log(
    'PASS: compiled Markdown works without an installed node_modules directory.',
  );
} finally {
  await rm(isolated, { recursive: true, force: true });
}
