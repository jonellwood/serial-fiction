export function validateConfig(
  env: Record<string, string | undefined>,
  production: boolean,
) {
  const url = env.PUBLIC_SITE_URL || 'http://localhost:5173';
  if (!/^https?:\/\//.test(url))
    throw new Error('PUBLIC_SITE_URL must be an HTTP(S) URL.');
  if (production) {
    for (const key of [
      'TURSO_DATABASE_URL',
      'TURSO_AUTH_TOKEN',
      'AUTH_SECRET',
      'PUBLIC_SITE_URL',
      'EMAIL_FROM',
      'EMAIL_PROVIDER_API_KEY',
    ])
      if (!env[key])
        throw new Error(`Missing required environment variable: ${key}`);
    if (!env.TURSO_DATABASE_URL?.startsWith('libsql://'))
      throw new Error('Production requires a Turso libsql:// database.');
    if (!url.startsWith('https://'))
      throw new Error('Production requires an HTTPS site URL.');
    if (
      (env.AUTH_SECRET?.length || 0) < 32 ||
      env.AUTH_SECRET?.includes('replace-with')
    )
      throw new Error('Set a random AUTH_SECRET of at least 32 characters.');
    if (env.DEV_MAILBOX === 'true')
      throw new Error('DEV_MAILBOX must be disabled in production.');
  }
  return {
    url,
    databaseUrl: env.TURSO_DATABASE_URL || 'file:local.db',
    secret:
      env.AUTH_SECRET || 'local-development-only-secret-do-not-deploy-123456',
  };
}
