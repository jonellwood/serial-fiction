import { createClient } from '@libsql/client';
try {
  process.loadEnvFile('.env');
} catch {
  /* Shell environment is supported. */
}
const email = process.argv[2]?.trim().toLowerCase();
if (!email || !email.includes('@'))
  throw new Error('Usage: npm run admin:promote -- your@email.com');
const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});
try {
  const result = await db.execute({
    sql: 'SELECT id FROM user WHERE email=? AND emailVerified=1',
    args: [email],
  });
  if (!result.rows[0])
    throw new Error(
      'This account must sign in with an email magic link before it can be promoted.',
    );
  const id = String(result.rows[0].id);
  await db.batch(
    [
      {
        sql: "UPDATE user SET role='admin', updatedAt=? WHERE id=?",
        args: [Date.now(), id],
      },
      {
        sql: 'INSERT INTO audit_log (id,action,target_type,target_id,metadata_json,created_at) VALUES (?,?,?,?,?,?)',
        args: [
          crypto.randomUUID(),
          'user.role_changed',
          'user',
          id,
          JSON.stringify({ role: 'admin', source: 'operator-cli' }),
          new Date().toISOString(),
        ],
      },
    ],
    'write',
  );
  console.log('Verified account promoted to admin.');
} finally {
  db.close();
}
