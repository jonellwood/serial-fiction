import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { magicLink } from 'better-auth/plugins';
import { drizzle } from 'drizzle-orm/libsql';
import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';
import { client, config } from './db';
import * as schema from './schema';
export const auth = betterAuth({
  baseURL: config.url,
  secret: config.secret,
  database: drizzleAdapter(drizzle(client, { schema }), {
    provider: 'sqlite',
    schema,
  }),
  user: {
    additionalFields: {
      role: { type: 'string', defaultValue: 'reader', input: false },
    },
  },
  rateLimit: {
    enabled: true,
    storage: 'database',
    window: 60,
    max: 30,
    customRules: { '/sign-in/magic-link': { window: 60, max: 3 } },
  },
  plugins: [
    magicLink({
      storeToken: 'hashed',
      expiresIn: 600,
      sendMagicLink: async ({ email, url }) => {
        if (dev && env.DEV_MAILBOX === 'true') {
          const { mkdir, writeFile } = await import('node:fs/promises');
          await mkdir('.data', { recursive: true });
          await writeFile(
            env.DEV_MAILBOX_PATH || '.data/mailbox.json',
            JSON.stringify({ email, url, createdAt: new Date().toISOString() }),
            { mode: 0o600 },
          );
          return;
        }
        if (!env.EMAIL_PROVIDER_API_KEY || !env.EMAIL_FROM)
          throw new Error('Email delivery is not configured.');
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.EMAIL_PROVIDER_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: env.EMAIL_FROM,
            to: [email],
            subject: 'Your sign-in link · Between Lines',
            text: `Open this link to sign in to Between Lines. It expires in 10 minutes.\n\n${url}\n\nIf you did not request this, ignore this email.`,
          }),
        });
        if (!response.ok) {
          // Log only provider status/category, never its message or request payload:
          // those may contain recipient addresses or authentication links.
          const body = await response.json().catch(() => null);
          const knownCategories = new Set([
            'validation_error',
            'missing_api_key',
            'invalid_api_key',
            'restricted_api_key',
            'rate_limit_exceeded',
            'daily_quota_exceeded',
            'monthly_quota_exceeded',
            'application_error',
            'internal_server_error',
          ]);
          const category = knownCategories.has(body?.name)
            ? body.name
            : 'unknown';
          console.error(
            JSON.stringify({
              event: 'email.delivery_failed',
              provider: 'resend',
              status: response.status,
              category,
            }),
          );
          throw new Error('Email delivery failed.');
        }
      },
    }),
  ],
});
