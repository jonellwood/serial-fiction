import { safeNext } from '$lib/server/access';
import { config } from '$lib/server/db';
export const load = ({ url }) => ({
  originMismatch: url.origin !== new URL(config.url).origin,
  loginURL: new URL('/login', config.url).href,
  next: safeNext(url.searchParams.get('next')),
  authError: url.searchParams.has('error'),
});
