# Between Lines

An original SvelteKit 5 publishing and reading PWA, built from [the project specification](ref/serialized-fiction-pwa-project-spec.md).

The publishing milestone is complete. This working version adds private chapter illustrations, separate chapter/image ownership, collection pricing with purchase credits, and administrator-confirmed access requests. Online payment processing and external claim tokens are not connected yet.

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
- Server-only chapter retrieval with centralized authorization. Public metadata queries never select story text. Paid chapters require an active account entitlement; book owners/collaborators and admins may preview them.
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

See [ROADMAP.md](ROADMAP.md). Single-use external purchase claims, online checkout, full-book products, account-synced preferences/progress, bookmarks and analytics remain future work. Chapter/image entitlements, permanent library entries and manual access confirmation are implemented. No payments are processed by this application yet.

Authors can manage only books they own or explicitly collaborate on; administrators can manage the entire studio. Scheduling, destructive deletion, full offline chapter storage, and direct checkout remain outside this milestone.

## Illustration and ownership milestone (local preview)

Run `npm run dev:milestone`, then open **http://localhost:5180**. This seeds a separate `.data/milestone.db`, uses `.data/milestone-images` for private files, and overrides real email and database credentials without modifying `.env`. Do not use real payments in this environment. Sign-in links are written to `.data/milestone-mailbox.json`; open its `url` after each request. Use `author@example.test` for the administrator and `reader@example.test` in a separate browser profile for a reader.

1. In the studio, save a chapter, set its chapter price and image collection price in USD, and upload JPEG/PNG/WebP illustrations (up to 3 MB / 25 megapixels each).
2. Each upload creates a normalized WebP original (up to 1600 pixels per side, quality 80, no enlargement, metadata removed) and a separately encoded blurred preview (up to 320 pixels per side, quality 45). The upload confirmation shows the combined stored size. Compression varies with image detail; no fixed byte size is promised. These settings apply to new uploads; existing files are unchanged. The original uploaded file is not retained.
3. Use **Insert in chapter** and save. References must occupy their own lines: `![Illustration](asset:IMAGE-ID)`. Captions and image prices can be edited below the uploader. The collection includes **all images uploaded to that chapter**, including images not yet inserted in its text. Upload only the images intended for sale in that collection. Saved reader preview shows the illustrations; the text-only Markdown preview does not.
4. A reader requests chapter access, an image, or the remaining collection. This records a pending request and does **not** charge or grant access.
5. An administrator opens **Access requests**, verifies an external payment and records its reference, or explicitly marks the grant complimentary. Chapter access is required before purchasing its images. Author accounts cannot confirm payments.
6. Returning to the chapter displays owned originals and blurred previews for the rest. The library lists chapters with active chapter/image access.

Collection completion costs the lesser of (a) the collection price minus prior active image payment credits and (b) the individual prices of unowned images, never below zero. Chapter payments do not count. Complimentary grants have zero credit. Bundle payments allocate their credit across included images in whole cents. Revoking an image removes its ownership and credit; refunds must be processed separately. Orders snapshot their items/prices at request time. Added images are not automatically included in earlier purchases. Overlapping stale requests cannot be fulfilled; cancel them and obtain a fresh request. The administrator list shows the most recent 100 requests/grants.

Every image delivery goes through the authenticated application endpoint. Original image URLs are not public bucket URLs, unauthorized requests are rejected before storage is read, and originals/previews use `private, no-store`. Draft/archived content remains inaccessible to readers even with an entitlement. Private media is never put in the PWA cache. Authorized readers can still save images they view.

Local storage works only in development. Before deploying this milestone, apply `npm run db:migrate` against the intended Turso database and configure a **private** S3-compatible bucket using the `IMAGE_*` variables in `.env.example`. Never enable public bucket access. Use a bucket-scoped credential permitting object Get/Put/Delete, and set its region (for AWS, such as `us-east-1`; `auto` is for compatible providers that accept it). Production deliberately refuses filesystem fallback. The application proxies images rather than exposing storage keys or relying on CSS blur. Cloud storage delivery still needs testing with the selected provider before launch.

`npm test` includes transactional ownership, bundle pricing, revocation and private-delivery tests against an in-memory database. With the isolated preview running, `npm run test:images` exercises upload, chapter access, image access, bundle credits, library and mobile rendering using only local test accounts. It leaves its fixture chapter available for inspection. No real email is sent. Existing `test:e2e` targets the original local setup on port 5173; do not run it against a live Turso/Resend configuration.

## Author permissions and AI disclosures

Migration `003_author_scope_disclosure.sql` adds book ownership, explicit collaborators, and independent AI-generated flags for chapter prose and images. Existing books have no owner and remain **admin-only** until assigned; new books belong to their creator. In the studio, **Manage book collaborators** lets an admin assign the owner, and lets the owner or an admin add/remove verified Author/Admin collaborators. Collaborators cannot delegate access. Demoted readers lose studio access even if their ownership/collaborator records remain. Public reading and paid access for unrelated authors follow reader rules. Activity logs, access confirmation and account roles are admin-only.

An admin can use **Account roles** to find an exact email and promote a verified account to Author. Role changes terminate that account's sessions so the person must sign in again. Self-role changes are prohibited. Do not promote authors on an older deployment that lacks these checks: deploy this version and apply migrations first.

Chapter editors and image upload/detail forms have separate AI disclosure checkboxes. Labels appear in chapter listings, unlock pages, and the reader (including locked image previews). These are author-provided disclosures, not automated provenance verification. Existing content is unlabelled until its author reviews it; unchecked is not a certification of human authorship.

Images priced at **$0.00** are included with chapter access. The **Included with chapter** checkbox on upload and image editing sets that price automatically. These images render without a separate purchase and are excluded from collection purchase items/counts. They remain protected when their chapter is paid, draft or archived. To make an included image paid again, uncheck the box and enter a positive price; existing image entitlements remain valid. Pending purchase requests containing newly free images must be cancelled and requoted before confirmation.
