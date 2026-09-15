# Implementation roadmap

The initial publishing milestone is complete. The next milestone adds local illustrations and provider-independent chapter/image ownership.

- [x] Foundation: SvelteKit 5, TypeScript, Netlify build, local/Turso libSQL, migrations, environment validation, UI shell, error handling.
- [x] Content slice: catalog, book pages, public free reader, protected locked content, book/chapter editor, Markdown preview, publication/archival, audit events.
- [x] Authentication needed by the slice: Better Auth magic links, database sessions, roles, protected studio, local email development, production email adapter.
- [x] Reader polish included early: responsive typography, theme and font controls, locally saved appearance, chapter navigation, scroll indicator.
- [x] PWA base: manifest/icons, service worker, public asset cache, offline fallback.
- [ ] Verify real Netlify deployment, production Turso connectivity, real email delivery, and physical-device installation once service configuration is available.
- [x] Scoped author permissions: book ownership, explicit collaborators, protected previews/media, admin role management, and chapter/image AI disclosures.
- [x] Illustration milestone: local private uploads, generated blurred previews, Markdown asset references, chapter/image access requests, admin confirmation/revocation, purchase credits, collection completion, and library.
- [ ] Configure and verify private cloud image storage and a suitable payment provider before deploying the illustration milestone.
- [ ] Remaining Phase 3: effective entitlements, grant/revoke administration, product administration, library and paid-content authorization. Book ownership must include future published chapters.
- [ ] Phase 4: hashed 256-bit single-use claims, atomic redemption, expiration/revocation, login continuation, immediate-only plaintext export, audit events, and concurrency tests.
- [ ] Phase 5: account-backed progress, completion, bookmarks, account-backed reader preferences, and offline progress resilience.
- [ ] Phase 6: physical-device PWA testing and install UX refinement.
- [ ] Phase 7: configurable purchase destinations, promotional previews, privacy-conscious aggregate metrics, and source attribution.

Future features remain deferred as specified: direct payments, OnlyFans automation, subscriptions, marketplace tenancy, comments, DMs, EPUB/PDF export, and offline paid-book downloads.
