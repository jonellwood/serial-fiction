import { createClient } from '@libsql/client';
import { env } from '$env/dynamic/private';
import { dev, building } from '$app/environment';
import { validateConfig } from './config';
// PUBLIC_SITE_URL is deliberately read separately: SvelteKit filters public variables.
import { env as publicEnv } from '$env/dynamic/public';
export const config = validateConfig(
  { ...env, ...publicEnv },
  !dev && !building,
);
export const client = createClient({
  url: config.databaseUrl,
  authToken: env.TURSO_AUTH_TOKEN,
});
