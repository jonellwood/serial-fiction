# Between Lines

An original SvelteKit 5 publishing and reading PWA, built from [the project specification](ref/serialized-fiction-pwa-project-spec.md).

This release implements the **first-session milestone in section 51**: an author signs in with an email magic link, creates a book and chapter, previews Markdown, publishes a free chapter, and an anonymous visitor reads it. The specification explicitly asks to complete this slice before claim tokens.

## Start locally

Requires Node.js 22.12+ and npm.

```sh
npm install
cp .env.example .env
npm run db:migrate
npm run db:seed
npm run dev
```

Open **http://localhost:5173**. Use that hostname consistently because authentication validates its configured origin.

The seed creates three demonstration books, free and locked chapters, draft chapters, complete-book product records, an admin (`author@example.test`), and a reader (`reader@example.test`). The demo stories are non-explicit placeholders. Identity and cover artwork are original editable placeholders. Replace Alex Morgan and the sample catalog before launch.

To try the author flow:

1. Visit `/admin` and request a sign-in link for `author@example.test`.
2. With `DEV_MAILBOX=true`, open `.data/mailbox.json` in your editor and open its `url` in the browser. The local mailbox contains only the latest development email and is excluded from Git. Links expire after ten minutes and can be used once. No login bypass is provided.
3. Create a book in the studio and set its status to **Published**.
4. Add a chapter, enter a URL slug and Markdown, check **Free chapter**, preview, and publish.
5. Open its public book page in a signed-out browser. Unpublish either the book or chapter to remove public reading access.

Local email is written to a private file instead of being printed in logs or sent externally. `DEV_MAILBOX` is accepted only by the development server. Production refuses to start with that setting enabled.

## Included

- SvelteKit, Svelte 5, TypeScript, Vite, and Netlify adapter.
- Local libSQL development and Turso production connection, versioned transactional migrations, idempotent local seed, and guarded local reset.
- Better Auth passwordless email login, database-backed sessions and rate limiting, reader/author/admin roles, safe login continuation, and sign-out.
- Author studio: create/edit books and chapters, draft/published/archived states, cover URLs, tags, content notices, free/locked controls, unsaved Markdown preview, and saved reader preview.
- Audit entries written transactionally with publishing changes. Archiving replaces destructive deletion in this first release.
- Responsive public catalog with search and tag filters, book details, share links, chapter lists, and locked states.
- Server-only chapter retrieval with centralized authorization. Public metadata queries never select story text. Paid chapters are denied to every reader in this milestone; authors/admins may preview them.
- Sanitized Markdown with raw HTML disabled. No source Markdown in public static files or client bundles.
- Focused scrolling reader with font family, size, spacing, width, and light/dark/sepia/system themes; settings saved locally.
- Accessible native age-attestation dialog, keyboard focus styles, reduced-motion support, responsive mobile navigation, and dark discovery theme.
- Share metadata and canonical URLs, no-index author/private reading pages, generic error responses, request IDs, security headers, and CSP.
- PWA manifest, original SVG and PNG icons, service worker, public asset cache, and offline fallback. Server responses and chapters are never cached by the service worker.

## Commands

| Command                                   | Purpose                                                                   |
| ----------------------------------------- | ------------------------------------------------------------------------- |
| `npm run dev`                             | Local development server                                                  |
| `npm run build`                           | Production assets and Netlify function bundle                             |
| `npm run preview`                         | Preview a production build; production environment validation applies     |
| `npm run check`                           | Svelte and TypeScript checks                                              |
| `npm run lint`                            | Type checks and formatting checks                                         |
| `npm run format`                          | Format source                                                             |
| `npm run test`                            | Security-focused automated tests                                          |
| `npm run test:pwa`                        | Verify compiled service-worker caching and offline fallback after a build |
| `npm run test:e2e`                        | Chromium publishing acceptance test against the running local server      |
| `npm run db:migrate`                      | Apply outstanding SQL migrations                                          |
| `npm run db:seed`                         | Migrate and seed the local demonstration catalog                          |
| `npm run db:reset`                        | Delete and recreate the **local** development database tables             |
| `npm run admin:promote -- your@email.com` | Promote an existing email-verified account, with an audit record          |

For browser tests, first run `npx playwright install chromium`, seed the default local database, and start `npm run dev`. Use the default local admin email and `DEV_MAILBOX=true`. The test signs in through actual magic links, creates and removes its own test book, and saves desktop/mobile screenshots under `.data/screenshots/`.

## Environment

| Variable                 | Use                                                                        |
| ------------------------ | -------------------------------------------------------------------------- |
| `TURSO_DATABASE_URL`     | `file:local.db` locally; a `libsql://` Turso URL in production             |
| `TURSO_AUTH_TOKEN`       | Required for production Turso                                              |
| `AUTH_SECRET`            | Random secret of at least 32 characters; required in production            |
| `PUBLIC_SITE_URL`        | Exact app origin; HTTPS required in production                             |
| `EMAIL_FROM`             | Verified sender identity                                                   |
| `EMAIL_PROVIDER_API_KEY` | Resend API key used by the server-side email adapter                       |
| `DEV_MAILBOX`            | Local development only; remove or set to `false` in production             |
| `ADMIN_EMAIL`            | Local seed admin email only; never an automatic role assignment at sign-in |

Generate a secret with `openssl rand -base64 48`. Never commit `.env`, a database, the mailbox, or tokens. Only `PUBLIC_SITE_URL` is browser-visible.

## Netlify and Turso deployment

The build bundles the Markdown sanitizer and its ESM parser dependencies for serverless compatibility. `npm run build` also checks the generated Netlify server and all route modules with `--no-experimental-require-module`, so the deployed runtime’s module-loading restriction is exercised before deployment.

The Netlify adapter build has been verified locally. A live deployment, production email delivery, and a remote Turso connection require your service accounts and credentials and have not been performed.

### Create the database by uploading a SQLite file

In Turso’s **Create a database → Upload a SQLite File** flow, select `exports/between-lines-schema.db` from this project. It contains the current application tables, indexes, constraints, and migration history. The upload file uses WAL journal mode, as required by Turso’s upload endpoint, with all changes checkpointed into the main `.db` file. Upload only the `.db` file; no `-wal` or `-shm` files are needed. It has no accounts, sessions, books, or chapters; your existing local database is unchanged. Turso supports [creating databases from SQLite files](https://docs.turso.tech/cli/db/create).

This file is a snapshot of the migrations at the time it was generated. After uploading, configure the database URL/token and run `npm run db:migrate` to apply any newer migrations. The included migration history prevents the existing migration from being reapplied. Continue with the email and admin-account setup below.

1. Create a Turso database and set its URL/token in your deployment environment.
2. Run `npm run db:migrate` against that database from a trusted operator environment. Do not run the demo seed in production; the seed/reset scripts reject remote databases.
3. Configure Netlify with the variables above, `npm run build` as the build command, and `build` as the publish directory. `netlify.toml` contains these settings and selects Node 22.
4. Configure a verified email sender and Resend API key. Confirm that your email provider’s terms permit your intended application.
5. Deploy, request a magic link for your real author email, and complete sign-in.
6. With the production database credentials in the operator shell, run `npm run admin:promote -- your@email.com`. Only a verified existing account can be promoted. Sign in again and open `/admin`.
7. Test production login, publish a free chapter, check anonymous access, and verify installation on actual iOS/Android devices.

Never use `db:reset` for production. Database migrations are deliberately an explicit deployment operation rather than a cold-start side effect.

Implementation references: [Better Auth SvelteKit integration](https://better-auth.com/docs/integrations/svelte-kit), [magic-link plugin](https://better-auth.com/docs/plugins/magic-link), [Drizzle adapter](https://better-auth.com/docs/adapters/drizzle), and [Netlify SvelteKit deployment](https://docs.netlify.com/build/frameworks/framework-setup-guides/sveltekit/).

## Next milestones

See [ROADMAP.md](ROADMAP.md). Product and product-content schemas exist, but product administration, entitlements, single-use purchase claims, permanent libraries, account-synced preferences/progress, bookmarks, analytics, and external purchase instructions are not implemented in this first slice. The library screen states this explicitly. No payments are taken and no purchase access is simulated.

The initial deployment is a single-author application: authors and admins share the content studio. Scheduling, multi-author ownership, destructive deletion, media uploads, full offline chapter storage, and direct checkout remain outside this milestone.
