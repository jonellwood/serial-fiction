import { error } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { building } from '$app/environment';
import type { Handle, HandleServerError } from '@sveltejs/kit';
export const handle: Handle = async ({ event, resolve }) => {
  event.locals.requestId = crypto.randomUUID();
  if (!['GET', 'HEAD', 'OPTIONS'].includes(event.request.method)) {
    if (event.request.headers.get('origin') !== event.url.origin) {
      error(403, 'Please submit this request from the application.');
    }
  }
  const session = await auth.api.getSession({ headers: event.request.headers });
  event.locals.user = session
    ? {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role,
      }
    : null;
  const response = await svelteKitHandler({ event, resolve, auth, building });
  response.headers.set('X-Content-Type-Options', 'nosniff');
  // Keep full paths and tokens out of referrers while preserving Origin on
  // native form POSTs. Auth redirects retain the strongest referrer policy.
  response.headers.set(
    'Referrer-Policy',
    event.url.pathname.startsWith('/api/auth/')
      ? 'no-referrer'
      : 'strict-origin',
  );
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()',
  );
  response.headers.set('X-Request-Id', event.locals.requestId);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
};
export const handleError: HandleServerError = ({ event, status }) => {
  console.error(
    JSON.stringify({
      requestId: event.locals.requestId,
      status,
      message: 'Request failed',
    }),
  );
  return {
    message: 'Something interrupted the story. Please try again.',
    requestId: event.locals.requestId,
  };
};
