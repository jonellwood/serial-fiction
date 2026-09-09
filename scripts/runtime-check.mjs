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
