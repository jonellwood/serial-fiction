# Project Specification: Serialized Fiction PWA

## Working Concept

A SvelteKit-based progressive web application for publishing, previewing, selling access to, and reading serialized erotic fiction.

The product should feel familiar to users of creator-content platforms such as OnlyFans without copying OnlyFans branding, visual assets, exact layouts, trademarks, or proprietary interface elements.

The platform should combine:

- Creator-style discovery and promotion
- Serialized chapter releases
- Free previews
- Permanent reader libraries
- Purchase entitlement redemption
- A clean Kindle-like reading experience
- A lightweight author/admin CMS
- A sales-channel-agnostic entitlement system
- Installable PWA functionality
- Low operating cost at launch with a clean scale-up path

Initial sales will occur primarily through OnlyFans, with external traffic potentially coming from Reddit, SDC, social media, direct links, and other communities.

OnlyFans is a sales and discovery channel.

The PWA is the reader, library, and content platform.

---

# 1. Core Product Principles

## 1.1 Keep sales channels separate from reader identity

The reader's identity belongs to this platform, not OnlyFans.

A customer should not need an OnlyFans account to use the PWA after their purchase has been claimed.

Internal identity:

```text
email address
    ↓
platform user UUID
    ↓
entitlements
    ↓
library
```

Possible entitlement sources:

```text
onlyfans
direct
promo
gift
subscription
admin
other
```

This avoids locking the platform to OnlyFans and makes future channels easy to support.

---

## 1.2 Purchases create permanent entitlements

Once a reader successfully claims a purchase, access should be tied permanently to their account unless explicitly revoked by an administrator.

A chapter purchase grants access to a chapter.

A full-book purchase grants access to all current and future published chapters belonging to that book unless the product is intentionally configured otherwise.

Entitlement decisions must always be performed server-side.

---

## 1.3 Do not use reusable chapter links

Do not secure paid content using:

- secret URLs
- query-string flags
- static Markdown URLs
- LocalStorage-only access
- client-side unlock flags

Instead:

```text
purchase
   ↓
single-use claim token
   ↓
authenticated reader
   ↓
server creates entitlement
   ↓
token permanently marked redeemed
```

After redemption, the claim URL is no longer required.

---

# 2. Recommended Technology Stack

## Frontend / Application

- SvelteKit
- TypeScript
- Svelte 5
- Vite
- PWA support using `@vite-pwa/sveltekit` or the best actively maintained equivalent
- Responsive mobile-first design

## Hosting

- Netlify
- SvelteKit Netlify adapter
- Netlify environment variables
- Netlify serverless functions / SvelteKit server routes as appropriate

## Database

### Turso / libSQL

Use Turso as the production database.

Reasons:

- SQLite-compatible
- Easy local development
- Good free-tier economics for an MVP
- Simple migration path to paid service as traffic increases
- Fits the modest write volume and read-heavy nature of a fiction platform
- No server management

Use local SQLite/libSQL during development where practical.

## Authentication

Preferred starting approach:

- Better Auth
- Email-based magic-link authentication
- Database-backed sessions in Turso

Avoid passwords for the MVP.

The desired user experience:

```text
Enter email address
      ↓
Receive login link
      ↓
Tap link
      ↓
Authenticated
```

If Better Auth proves unnecessarily complex with Turso or Netlify at implementation time, another mature passwordless provider may be substituted, provided identity remains independent of OnlyFans.

## Content Format

Store book chapter source content as Markdown.

Markdown provides:

- portability
- simple editing
- easy version control
- clean database storage
- straightforward HTML rendering
- future EPUB/PDF export possibilities

Sanitize generated HTML before rendering.

---

# 3. High-Level Architecture

```text
                ┌─────────────────────────┐
                │   External Discovery    │
                │                         │
                │ OnlyFans                │
                │ Reddit                  │
                │ SDC                     │
                │ Social / Direct Links   │
                └───────────┬─────────────┘
                            │
                            ▼
                ┌─────────────────────────┐
                │      SvelteKit PWA      │
                │                         │
                │ Public Catalog          │
                │ Free Previews           │
                │ Reader                   │
                │ Library                  │
                │ Claim Redemption         │
                │ Account                  │
                └───────────┬─────────────┘
                            │
             ┌──────────────┴──────────────┐
             ▼                             ▼
   ┌──────────────────┐          ┌──────────────────┐
   │   Better Auth    │          │   Application    │
   │                  │          │   API / Server   │
   │ magic links      │          │   Authorization │
   │ sessions         │          │   Entitlements  │
   └────────┬─────────┘          └────────┬─────────┘
            │                             │
            └──────────────┬──────────────┘
                           ▼
                  ┌─────────────────┐
                  │ Turso / libSQL  │
                  │                 │
                  │ Books           │
                  │ Chapters        │
                  │ Users           │
                  │ Entitlements    │
                  │ Claim Tokens    │
                  │ Progress        │
                  └─────────────────┘
```

---

# 4. User Roles

Initial roles:

```text
reader
author
admin
```

## Reader

Can:

- browse public books
- read free chapters
- authenticate
- redeem claim tokens
- view library
- read entitled content
- save reading progress
- bookmark chapters
- change reader preferences

## Author

Can:

- create books
- create/edit chapters
- preview unpublished chapters
- publish/unpublish content
- manage book metadata

For the MVP, `author` and `admin` may effectively be the same account if desired.

## Admin

Can do everything an author can plus:

- generate claim tokens
- view redemption records
- grant/revoke entitlements
- manage users
- inspect audit history
- manage products
- view basic metrics

---

# 5. Database Model

Use migration files from the beginning.

All primary identifiers should use UUIDs or similarly non-sequential opaque IDs.

Do not expose integer database IDs publicly.

---

## 5.1 users

Authentication provider may create some of these tables automatically.

Conceptual application user:

```sql
users
-----
id TEXT PRIMARY KEY
email TEXT UNIQUE NOT NULL
role TEXT NOT NULL DEFAULT 'reader'
display_name TEXT
created_at TEXT NOT NULL
updated_at TEXT NOT NULL
```

Roles:

```text
reader
author
admin
```

---

## 5.2 books

```sql
books
-----
id TEXT PRIMARY KEY
slug TEXT UNIQUE NOT NULL
title TEXT NOT NULL
subtitle TEXT
description TEXT
cover_image_url TEXT
author_name TEXT NOT NULL
status TEXT NOT NULL
published_at TEXT
created_at TEXT NOT NULL
updated_at TEXT NOT NULL
```

Possible status values:

```text
draft
scheduled
published
archived
```

---

## 5.3 chapters

```sql
chapters
--------
id TEXT PRIMARY KEY
book_id TEXT NOT NULL
chapter_number INTEGER NOT NULL
slug TEXT NOT NULL
title TEXT NOT NULL
summary TEXT
content_markdown TEXT NOT NULL
is_free INTEGER NOT NULL DEFAULT 0
status TEXT NOT NULL
published_at TEXT
created_at TEXT NOT NULL
updated_at TEXT NOT NULL

UNIQUE(book_id, chapter_number)
UNIQUE(book_id, slug)
```

Possible chapter status:

```text
draft
scheduled
published
archived
```

A free chapter bypasses entitlement checks once published.

---

## 5.4 products

A product represents something that can be sold or granted.

Do not equate products directly with chapters.

```sql
products
--------
id TEXT PRIMARY KEY
slug TEXT UNIQUE NOT NULL
name TEXT NOT NULL
description TEXT
product_type TEXT NOT NULL
price_cents INTEGER
active INTEGER NOT NULL DEFAULT 1
created_at TEXT NOT NULL
updated_at TEXT NOT NULL
```

Product types might include:

```text
chapter
book
bundle
subscription
bonus
```

Examples:

```text
Chapter 2
Complete Book 1
Books 1-3 Bundle
Bonus Epilogue
```

---

## 5.5 product_contents

Maps products to what they unlock.

```sql
product_contents
----------------
id TEXT PRIMARY KEY
product_id TEXT NOT NULL
content_type TEXT NOT NULL
content_id TEXT NOT NULL
created_at TEXT NOT NULL
```

`content_type` examples:

```text
chapter
book
```

Examples:

```text
Product: Chapter 4
→ content_type = chapter
→ content_id = chapter UUID
```

```text
Product: Complete Book
→ content_type = book
→ content_id = book UUID
```

Authorization logic should understand that book access implies chapter access.

---

## 5.6 entitlements

```sql
entitlements
------------
id TEXT PRIMARY KEY
user_id TEXT NOT NULL
product_id TEXT
content_type TEXT NOT NULL
content_id TEXT NOT NULL
source TEXT NOT NULL
source_reference TEXT
granted_at TEXT NOT NULL
revoked_at TEXT
notes TEXT
created_by TEXT
```

Typical sources:

```text
onlyfans
direct
promo
gift
subscription
admin
```

Important:

The entitlement table stores effective access.

This makes authorization straightforward even if product definitions later change.

---

# 6. Claim Token System

## 6.1 Purpose

Claim tokens bridge an external purchase to an internal reader account.

Example flow:

```text
Reader purchases Chapter 4 on OnlyFans
                ↓
Reader receives unique claim URL
                ↓
https://example.com/claim/<opaque-token>
                ↓
PWA identifies product
                ↓
Reader signs in
                ↓
Token redeemed
                ↓
Entitlement created
                ↓
Chapter appears in Library
```

---

## 6.2 claim_tokens

Never store the plaintext token.

Store only a cryptographic hash.

```sql
claim_tokens
------------
id TEXT PRIMARY KEY
token_hash TEXT UNIQUE NOT NULL
product_id TEXT NOT NULL
source TEXT NOT NULL
source_reference TEXT
status TEXT NOT NULL DEFAULT 'unused'
created_at TEXT NOT NULL
expires_at TEXT
redeemed_at TEXT
redeemed_by_user_id TEXT
created_by_user_id TEXT
notes TEXT
```

Statuses:

```text
unused
redeemed
revoked
expired
```

---

## 6.3 Token generation

Generate at least 256 bits of cryptographically secure random data.

Example concept:

```ts
crypto.getRandomValues(...)
```

or a secure server-side equivalent.

Encode using URL-safe Base64 or hex.

Example URL:

```text
https://reader.example.com/claim/zX4pK8n...opaque-random-value
```

Never encode:

- user ID
- product ID
- price
- chapter
- email
- source account

inside the token.

The token should be meaningless random entropy.

---

## 6.4 Token storage

At generation:

```text
plaintext token
      ↓
SHA-256
      ↓
token_hash stored in DB
```

The plaintext token is returned once for distribution.

At redemption:

```text
token from URL
      ↓
SHA-256
      ↓
lookup token_hash
```

This means a database leak does not expose redeemable links.

---

## 6.5 Redemption transaction

Redemption must be atomic.

Pseudo workflow:

```text
BEGIN

find claim token by hash

verify:
- token exists
- status = unused
- not expired
- product active

resolve product contents

create entitlement(s)

update token:
- status = redeemed
- redeemed_by_user_id
- redeemed_at

write audit record

COMMIT
```

If any operation fails:

```text
ROLLBACK
```

Two simultaneous requests must never redeem the same token twice.

---

# 7. MVP OnlyFans Workflow

Do not depend on unofficial OnlyFans APIs for the MVP.

Initially:

1. Admin selects a product.
2. Admin generates one or more claim links.
3. Admin copies an unused link.
4. Link is supplied to the customer through OnlyFans after purchase.
5. Customer redeems it in the PWA.
6. PWA owns access from that point forward.

Admin UI should make this workflow extremely fast.

Example:

```text
Product: Chapter 6

[ Copy Next Unused Claim Link ]

Unused links:   31
Redeemed:       17
Revoked:         0
```

Clicking the button:

- finds or generates an unused claim token
- copies the complete URL
- marks it as "issued" optionally, if an issued state is implemented

Future automation may integrate an external API or browser automation layer, but it must be an optional adapter rather than part of core authorization.

---

# 8. Future Sales Automation

Design an interface such as:

```ts
interface PurchaseSourceAdapter {
    source: string;

    processPurchase(event: PurchaseEvent): Promise<void>;
}
```

Potential future adapters:

```text
OnlyFans
Direct Checkout
Patreon
Other creator platforms
Promo codes
Gift purchases
```

External systems should never directly mutate reader authorization state.

They should call application services that grant entitlements.

---

# 9. Public Application Routes

Suggested route structure:

```text
/
 /books
 /books/[bookSlug]
 /books/[bookSlug]/chapter/[chapterSlug]
 /read/[bookSlug]/[chapterSlug]

 /claim/[token]

 /login
 /auth/callback
 /logout

 /library
 /library/[bookSlug]

 /account
 /account/preferences

 /admin
 /admin/books
 /admin/books/new
 /admin/books/[bookId]
 /admin/books/[bookId]/chapters
 /admin/books/[bookId]/chapters/[chapterId]

 /admin/products
 /admin/products/[productId]

 /admin/claims
 /admin/entitlements
 /admin/users
```

---

# 10. Public Home / Discovery Experience

The visual language may feel familiar to modern creator platforms, but must be original.

Avoid:

- OnlyFans logo
- OnlyFans wordmark
- copied icons
- exact color values intentionally mimicking branding
- pixel-identical page structure
- misleading language implying affiliation

Desired feel:

- clean
- modern
- intimate
- mobile-first
- creator-focused
- content-forward
- high-quality rather than "adult website" cliché

Possible layout:

```text
Creator Header
Avatar / Pen Name / Bio

Featured Book

Recent Releases

Free Reads

Continue Reading (authenticated)

Books / Series
```

---

# 11. Book Detail Page

A book page should include:

- cover
- title
- subtitle
- author
- description
- tags
- number of chapters
- publication state
- chapter list
- free/locked/unlocked status
- full-book purchase CTA
- reading progress when applicable

Example:

```text
THE NEIGHBOR'S WIFE

12 Chapters

Chapter 1 — The Invitation
FREE
[ Read ]

Chapter 2 — After Hours
Unlocked
[ Continue ]

Chapter 3 — Crossing the Line
Locked

Chapter 4 — The Weekend
Locked

[ Unlock Complete Book ]
```

For initial external-purchase-only MVP, the "Unlock" button may explain where it is available rather than processing payment internally.

---

# 12. Free Preview Strategy

At least Chapter 1 of each primary book should normally be free.

Free chapters:

- require no account
- can be indexed if desired
- can be shared directly
- should include social metadata
- should include a strong next-chapter CTA

This enables sharing from:

- Reddit
- SDC
- social networks
- OnlyFans public/free posts
- direct messages
- creator profile links
- search engines where appropriate

Example funnel:

```text
Reddit post
   ↓
Free Chapter 1
   ↓
Reader finishes
   ↓
"Continue the story"
   ↓
purchase instructions / OnlyFans
   ↓
claim link
   ↓
library
```

---

# 13. Reader Experience

The reader should deliberately feel different from the discovery UI.

Think:

```text
creator platform outside
ebook reader inside
```

Priorities:

- typography
- focus
- minimal distraction
- fast load
- comfortable one-handed mobile reading

---

## 13.1 Reader modes

Support:

```text
Light
Dark
Sepia
System
```

Store preference per account and optionally mirror it in LocalStorage for instant application.

---

## 13.2 Typography controls

Allow reader to change:

- font family
- font size
- line height
- content width

Potential font options:

```text
Serif
Sans Serif
System
```

Avoid an excessive number of controls.

---

## 13.3 Reader navigation

Include:

- back to book
- previous chapter
- next chapter
- reading progress
- chapter selector
- bookmark
- reader settings

On mobile, hide navigation while actively reading if useful.

---

## 13.4 Scroll model

Prefer vertical scrolling for MVP.

Reasons:

- natural web behavior
- simpler accessibility
- simpler progress tracking
- easier text selection
- fewer layout bugs

Page-turn simulation can be considered later but should not delay MVP.

---

# 14. Reading Progress

```sql
reading_progress
----------------
id TEXT PRIMARY KEY
user_id TEXT NOT NULL
book_id TEXT NOT NULL
chapter_id TEXT NOT NULL
progress_percent REAL
scroll_position INTEGER
updated_at TEXT NOT NULL

UNIQUE(user_id, chapter_id)
```

Update progress intelligently.

Do not write to the database on every scroll event.

Debounce writes, for example:

- every 10–20 seconds while actively reading
- when leaving the page
- when chapter completion is detected

Use LocalStorage as temporary resilience if the network is unavailable.

---

# 15. Bookmarks

MVP bookmarks may simply mark a chapter.

Future bookmarks may support a text position.

```sql
bookmarks
---------
id TEXT PRIMARY KEY
user_id TEXT NOT NULL
book_id TEXT NOT NULL
chapter_id TEXT NOT NULL
position_data TEXT
created_at TEXT NOT NULL
```

---

# 16. Library

Authenticated users receive a personal library.

Sections:

```text
Continue Reading

Owned Books

Owned Chapters

Completed

Recently Added
```

A book should appear in the library when the user owns:

- the complete book
- at least one paid chapter
- optionally when they intentionally save a free book

Display:

- cover
- title
- progress
- last read
- next available chapter
- ownership status

---

# 17. Admin CMS

The admin area is part of the MVP.

Do not rely on direct database editing for routine operations.

---

## 17.1 Dashboard

Show:

```text
Published Books
Published Chapters
Readers
Claims Generated
Claims Redeemed
Recent Redemptions
```

No need for elaborate analytics initially.

---

## 17.2 Book editor

Fields:

```text
Title
Slug
Subtitle
Author / Pen Name
Description
Cover
Status
Publish Date
Tags
```

Actions:

```text
Save Draft
Preview
Publish
Archive
```

---

## 17.3 Chapter editor

Fields:

```text
Chapter Number
Title
Slug
Summary
Markdown Content
Free / Paid
Status
Publish Date
```

Editor layout:

```text
Markdown Editor | Reader Preview
```

Or provide toggleable modes on smaller displays.

Include:

- save draft
- preview
- publish
- unpublish
- word count

Autosave drafts if reasonable.

---

## 17.4 Product editor

Fields:

```text
Product Name
Slug
Description
Type
Price
Active
Included Content
```

Included content should allow:

```text
one chapter
one book
multiple books
multiple chapters
mixed bundle
```

---

## 17.5 Claim manager

Admin should be able to:

- choose product
- generate N claim links
- copy next unused link
- view token status
- revoke unused token
- see redemption account
- export claims as CSV

Never display stored token plaintext because plaintext should not be stored.

Generated tokens can be exported immediately when created.

For later use, generate a new token rather than trying to recover a previous plaintext token.

---

## 17.6 Manual entitlements

Admin needs:

```text
Grant Access
Revoke Access
```

Example reasons:

```text
customer support
promotion
gift
refund
testing
migration
```

All manual changes should create audit entries.

---

# 18. Audit Log

```sql
audit_log
---------
id TEXT PRIMARY KEY
actor_user_id TEXT
action TEXT NOT NULL
target_type TEXT
target_id TEXT
metadata_json TEXT
ip_hash TEXT
created_at TEXT NOT NULL
```

Useful actions:

```text
claim.generated
claim.redeemed
claim.revoked
entitlement.granted
entitlement.revoked
book.published
chapter.published
chapter.updated
user.role_changed
```

Do not log sensitive auth tokens.

---

# 19. Authorization Rules

Create centralized authorization helpers.

Do not scatter access logic through page components.

Example functions:

```ts
canReadChapter(userId, chapterId)
canManageBook(userId, bookId)
isAdmin(userId)
```

`canReadChapter` should return true when:

1. chapter is published AND free

OR

2. user has direct entitlement to chapter

OR

3. user has entitlement to the containing book

OR

4. user has another bundle/subscription entitlement that resolves to access

Never rely on:

```text
UI says unlocked
```

The server decides.

---

# 20. Paid Content Delivery Security

Paid chapter Markdown must never be shipped in:

- public static assets
- public JSON
- client bundles
- prerendered routes
- predictable Markdown files

For a paid chapter:

```text
browser requests chapter
        ↓
server authenticates user
        ↓
server checks entitlement
        ↓
server returns rendered/sanitized content
```

Do not expose source Markdown unless intentionally required.

---

# 21. Anti-Piracy Position

Do not attempt invasive DRM.

If users can read text, determined users can reproduce it.

The goal is to prevent casual unauthorized access, not create hostile UX.

Useful protections:

- server-side entitlement checks
- one-time claim links
- authenticated paid-content APIs
- rate limiting
- opaque IDs
- no static paid chapter files
- optional subtle purchaser watermarking later

Avoid:

- disabling text selection
- blocking copy/paste globally
- aggressive browser fingerprinting
- intrusive DRM
- punishing legitimate readers

---

# 22. PWA Requirements

The application must be installable.

Include:

- manifest
- application icons
- theme colors
- mobile viewport configuration
- service worker
- install support
- offline shell

Suggested bottom navigation:

```text
Home
Library
Discover
Account
```

Admin navigation should only appear for authorized users.

---

# 23. Offline Reading

Do not make full offline paid-book support a hard MVP requirement.

Phase 1:

- cache application shell
- cache public assets
- remember progress locally during connectivity loss

Phase 2:

Allow a reader to explicitly:

```text
Download for Offline Reading
```

Only entitled chapters should be cached.

Offline content introduces additional authorization and revocation complexity and should be implemented intentionally.

---

# 24. Image / Media Storage

Book covers and promotional images should not live in the database.

Initial options:

- Netlify/static assets for a single-author MVP
- Cloudflare R2
- another low-cost object store

If admin cover uploads are implemented, prefer object storage over database BLOBs.

Persist only URLs and metadata in Turso.

---

# 25. SEO and Sharing

Free preview pages should have strong metadata.

Support:

```text
<title>
meta description
Open Graph
Twitter/X cards
canonical URL
structured data where useful
```

Each book should have a social preview image.

Each free chapter should be shareable.

Paid chapter content should not be indexed.

---

# 26. Content Warnings and Metadata

Support optional book-level and chapter-level content notices.

Examples:

```text
Explicit sexual content
BDSM
Group sex
Voyeurism
Infidelity fantasy
Consensual non-monogamy
```

Warnings are metadata, not censorship controls.

Allow the author to choose what is relevant.

Consider age confirmation before explicit material is displayed.

---

# 27. Age Gate

Implement a lightweight age confirmation:

```text
This site contains sexually explicit fictional material intended for adults.

[ I am 18 or older ]
[ Leave ]
```

Store acknowledgement locally and/or on the user's account.

Do not pretend this is identity verification.

It is an age-attestation gate.

---

# 28. UI Design Direction

The platform should be attractive enough to feel premium.

Avoid generic "porn-site" design.

## Discovery UI

Characteristics:

- clean card layouts
- rounded surfaces
- strong cover imagery
- subtle creator/social patterns
- clear locked/unlocked states
- tasteful accent color
- excellent mobile layout

## Reader UI

Characteristics:

- minimal chrome
- generous spacing
- premium typography
- comfortable line length
- dark/sepia support
- persistent progress

## Original identity

Use original:

- brand name
- logo
- icons
- color palette
- typography choices
- layout proportions

Borrow general interaction concepts, not trade dress.

---

# 29. Suggested SvelteKit Structure

```text
src/
├── lib/
│   ├── components/
│   │   ├── books/
│   │   ├── reader/
│   │   ├── library/
│   │   ├── admin/
│   │   └── ui/
│   │
│   ├── server/
│   │   ├── auth/
│   │   ├── db/
│   │   ├── entitlements/
│   │   ├── claims/
│   │   ├── books/
│   │   └── audit/
│   │
│   ├── stores/
│   ├── utils/
│   └── types/
│
├── routes/
│   ├── (public)/
│   ├── (reader)/
│   ├── claim/
│   ├── auth/
│   ├── admin/
│   └── api/
│
└── hooks.server.ts
```

Keep server-only code inside server-specific modules.

Never import database clients into browser bundles.

---

# 30. Environment Variables

Example:

```env
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=

AUTH_SECRET=

EMAIL_FROM=
EMAIL_PROVIDER_API_KEY=

PUBLIC_SITE_URL=
```

Do not expose server secrets through `PUBLIC_` variables.

---

# 31. Local Development

Provide:

```text
npm install
npm run dev
npm run build
npm run test
npm run lint
```

Add database scripts:

```text
npm run db:migrate
npm run db:seed
npm run db:reset
```

Seed development content:

- one admin
- one sample book
- several chapters
- one free chapter
- one complete-book product
- chapter products
- sample claim codes
- sample reader

Never seed production credentials.

---

# 32. Testing Requirements

Use automated tests for security-sensitive logic.

Minimum coverage:

## Claim redemption

Test:

- valid token
- invalid token
- expired token
- revoked token
- already redeemed token
- simultaneous redemption attempts
- unauthenticated redemption continuation
- entitlement creation

## Authorization

Test:

- free chapter
- direct chapter entitlement
- book entitlement
- unrelated entitlement
- revoked entitlement
- anonymous paid access

## Admin

Test:

- reader denied
- author permissions
- admin permissions

---

# 33. Claim UX

When a user opens:

```text
/claim/<token>
```

Do not immediately burn the token.

First validate it.

Show:

```text
You've unlocked:

The Neighbor's Wife
Chapter 4 — After Midnight

Sign in to add this permanently to your library.
```

If authenticated:

```text
[ Add to My Library ]
```

After successful redemption:

```text
Added to your library.

[ Start Reading ]
```

If already redeemed by current user:

```text
You already own this content.

[ Open Library ]
```

If redeemed by another account:

```text
This claim link has already been redeemed.

Sign in to the account that originally claimed it, or contact support.
```

Do not reveal the other account's email.

---

# 34. Authentication Continuation

Claim flow must survive authentication.

Example:

```text
/claim/ABC
      ↓
needs login
      ↓
magic link email
      ↓
auth callback
      ↓
return to /claim/ABC
```

Do not lose the purchase context during login.

---

# 35. External Preview Links

Provide clean URLs suitable for posting on Reddit, SDC, OnlyFans, and elsewhere.

Examples:

```text
https://example.com/books/the-neighbors-wife
https://example.com/books/the-neighbors-wife/chapter/the-invitation
```

Avoid marketing tracking parameters unless needed.

If analytics are later added, UTM parameters may identify sources:

```text
?utm_source=reddit
&utm_source=onlyfans
&utm_source=sdc
```

Track aggregate acquisition where useful without becoming creepy.

---

# 36. Analytics

MVP analytics can be simple.

Useful events:

```text
book_viewed
free_chapter_started
free_chapter_completed
purchase_cta_clicked
claim_redeemed
paid_chapter_started
paid_chapter_completed
```

Useful questions:

```text
Which preview converts best?
Where are readers coming from?
How many free readers finish Chapter 1?
How many claim purchasers actually read?
Where do readers stop?
```

Privacy-friendly analytics are preferred.

Avoid collecting sensitive reading behavior beyond what is genuinely useful.

---

# 37. Direct Sales — Future Phase

Do not hard-code the application around OnlyFans.

Eventually add direct checkout if a payment provider compatible with the content type is selected.

Flow:

```text
Product
   ↓
Checkout
   ↓
Payment webhook
   ↓
Verified successful payment
   ↓
entitlement
   ↓
library
```

Never grant an entitlement merely because the browser reached a "payment success" page.

Server-to-server payment confirmation is required.

---

# 38. Future Subscription Model

Potential future subscription:

```text
Monthly Reader Membership
```

Could grant:

- all new chapters
- selected catalog
- early access
- bonus scenes
- discounts

Do not bake subscription assumptions into basic chapter ownership.

Permanent purchases and subscription access must remain distinguishable.

---

# 39. Future Multi-Author Possibility

Do not build full multi-author tenancy for MVP.

However, avoid decisions that make it impossible later.

Potential future additions:

```text
authors
author_memberships
author_books
revenue tracking
creator dashboards
```

For MVP, `author_name` on books is sufficient unless implementation naturally supports an authors table.

---

# 40. Accessibility

Minimum requirements:

- semantic HTML
- keyboard navigation
- strong focus states
- adequate contrast
- screen-reader labels
- scalable text
- no required hover interactions
- reduced-motion support

The reader should remain usable at large font sizes.

---

# 41. Error Handling

Create polished user-facing states.

Examples:

```text
Claim link invalid
Claim already used
Session expired
Book unavailable
Chapter not published
Network unavailable
Unauthorized
```

Never dump stack traces or database errors.

---

# 42. Logging

Server logs should capture:

- request correlation ID
- security-relevant failures
- claim redemption errors
- auth callback errors
- unexpected database failures

Never log:

- magic-link tokens
- claim token plaintext
- session cookies
- auth secrets

---

# 43. Rate Limiting

Apply sensible rate limits to:

```text
magic-link requests
claim validation
claim redemption
admin login
future checkout endpoints
```

Do not aggressively rate-limit normal reading.

---

# 44. Security Headers

Configure reasonable headers, including:

```text
Content-Security-Policy
X-Content-Type-Options
Referrer-Policy
Permissions-Policy
frame-ancestors / anti-clickjacking controls
```

Prefer CSP over relying solely on legacy headers.

---

# 45. Markdown Security

Treat Markdown content as untrusted from the renderer's perspective even if currently authored only by the admin.

Use a Markdown parser configured to:

- prevent script injection
- sanitize HTML
- prevent unsafe URLs
- avoid arbitrary embedded JavaScript

Raw HTML should be disabled unless there is a compelling reason.

---

# 46. Phase-Based Build Order

The IDE agent should implement this project in phases.

Do not attempt every future feature at once.

---

## Phase 0 — Project Foundation

Deliver:

- SvelteKit project
- TypeScript
- Netlify adapter
- PWA base
- environment validation
- Turso connection
- migration framework
- basic UI shell
- light/dark theme
- error handling structure

Acceptance:

```text
npm run dev works
npm run build works
Netlify build succeeds
database connection succeeds
```

---

## Phase 1 — Content System

Deliver:

- books schema
- chapters schema
- products schema
- product_contents schema
- public catalog
- book page
- free chapter reader
- admin book CRUD
- admin chapter CRUD
- Markdown rendering
- preview before publish

Acceptance:

An admin can create a book, write Chapter 1 in Markdown, publish it, and an anonymous reader can read it.

---

## Phase 2 — Authentication

Deliver:

- Better Auth integration
- email magic links
- sessions
- account page
- roles
- protected routes
- admin route protection

Acceptance:

A reader can sign in without a password and retain a session.

A reader cannot access `/admin`.

---

## Phase 3 — Entitlements

Deliver:

- entitlements schema
- centralized authorization service
- locked chapter states
- protected paid chapter API
- library

Acceptance:

An admin can grant Chapter 2 to a reader and that reader can read it while another reader cannot.

---

## Phase 4 — Claim Tokens

Deliver:

- claim_tokens schema
- secure token creation
- hashed storage
- claim route
- auth continuation
- transactional redemption
- claim admin UI
- audit records

Acceptance:

A single-use link can be redeemed exactly once and permanently grants access.

---

## Phase 5 — Reader Experience

Deliver:

- reading progress
- continue reading
- bookmarks
- font controls
- light/dark/sepia modes
- responsive reader
- chapter navigation

Acceptance:

Reader progress follows the user across devices after login.

---

## Phase 6 — PWA Polish

Deliver:

- install manifest
- icons
- service worker
- offline shell
- mobile bottom nav
- app-like transitions where appropriate
- saved local reader settings

Acceptance:

Application installs cleanly on iOS/Android-capable PWA environments and launches as a standalone experience.

---

## Phase 7 — Promotion / Conversion

Deliver:

- optimized free preview pages
- Open Graph metadata
- CTA after free chapters
- source tracking
- basic analytics
- share functionality

Acceptance:

A free chapter link posted externally renders a strong preview and guides the reader toward purchasing/unlocking the next content.

---

# 47. MVP Definition

The MVP is complete when:

1. Admin can create a book.
2. Admin can create chapters.
3. Chapter 1 can be made public/free.
4. Paid chapters remain inaccessible without entitlement.
5. Reader can authenticate via email magic link.
6. Admin can create products.
7. Admin can generate secure claim links.
8. Reader can redeem a claim.
9. Redemption permanently adds content to the reader library.
10. Reader can resume purchased content from another device.
11. Reader has a comfortable mobile reading interface.
12. PWA can be installed.
13. Application deploys successfully to Netlify.
14. Production database runs on Turso.

Everything else is secondary.

---

# 48. Explicit Non-Goals for MVP

Do not delay launch for:

- direct credit-card checkout
- unofficial OnlyFans API automation
- multi-author marketplace
- comments
- public reader profiles
- DMs
- native mobile applications
- sophisticated DRM
- EPUB downloads
- PDF generation
- AI writing
- recommendation algorithms
- social feed cloning
- advanced analytics
- elaborate offline synchronization

Build the reading/purchase-entitlement loop first.

---

# 49. Recommended First Production Workflow

## Author

```text
Write chapter in admin
      ↓
Preview
      ↓
Publish
      ↓
Create product if needed
      ↓
Generate claim links
```

## Promotion

```text
Publish free preview
      ↓
Share to OnlyFans / Reddit / SDC / elsewhere
      ↓
Reader reaches end of preview
      ↓
CTA to purchase/unlock
```

## Purchase

```text
Customer pays through OnlyFans
      ↓
Customer receives unique claim URL
      ↓
Customer opens PWA
      ↓
Magic-link login
      ↓
Redeem
      ↓
Permanent library access
```

---

# 50. Development Rules for the IDE Agent

The coding agent should follow these rules:

1. Do not weaken entitlement checks for convenience.
2. Never trust client-side ownership state.
3. Never store claim token plaintext.
4. Never expose paid Markdown through static files.
5. Keep authorization logic centralized.
6. Use migrations for all database changes.
7. Keep UI components small and reusable.
8. Prefer boring, maintainable code over clever abstractions.
9. Implement one phase completely before expanding scope.
10. Run build, lint, and tests after meaningful changes.
11. Document environment variables.
12. Never commit secrets.
13. Preserve mobile usability as a first-class requirement.
14. Make admin workflows fast enough for repeated real-world use.
15. Keep external sales providers behind adapters/services so the core application remains independent.

---

# 51. Suggested Initial Milestone

The first coding session should stop once the following works:

```text
Admin logs in
   ↓
Creates Book
   ↓
Creates Chapter 1
   ↓
Marks it Free
   ↓
Publishes
   ↓
Anonymous visitor opens public book page
   ↓
Clicks Chapter 1
   ↓
Reads it in polished reader UI
```

Do not implement claim tokens before this vertical slice feels excellent.

Once the free-reader experience is compelling, add monetized access.

---

# 52. Product Philosophy

The platform should not feel like a workaround for delivering files purchased on OnlyFans.

It should feel like the natural home of the stories.

External platforms bring readers in.

The PWA gives them:

- a library
- a comfortable reader
- persistent access
- continuity between books
- a direct relationship with the author

The long-term product opportunity is larger than a single sales channel:

```text
Creator discovery
        +
Serialized fiction
        +
Permanent library
        +
Premium reader
        +
Flexible entitlement system
```

Build the foundation so that a small personal publishing project can scale into a larger platform if readers actually show up and start throwing money at it.

That is a much better problem to have.
