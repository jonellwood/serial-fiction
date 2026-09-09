import { describe, expect, it } from 'vitest';
import {
  canManage,
  canReadChapter,
  requireAuthor,
  safeNext,
} from '../src/lib/server/access';
import { renderMarkdown } from '../src/lib/server/markdown';
import { validateConfig } from '../src/lib/server/config';

describe('centralized chapter authorization', () => {
  it('permits anonymous published free chapters', () =>
    expect(canReadChapter('published', 'published', 1)).toBe(true));
  it.each([undefined, 'reader'])('denies paid chapters for %s', (role) =>
    expect(canReadChapter('published', 'published', 0, role)).toBe(false),
  );
  it.each(['draft', 'archived'])('hides %s chapters even when free', (status) =>
    expect(canReadChapter('published', status, 1, 'reader')).toBe(false),
  );
  it.each(['draft', 'archived'])('hides chapters of a %s book', (status) =>
    expect(canReadChapter(status, 'published', 1)).toBe(false),
  );
  it.each(['author', 'admin'])('allows %s to preview drafts', (role) =>
    expect(canReadChapter('draft', 'draft', 0, role)).toBe(true),
  );
  it('does not accept unknown roles', () =>
    expect(canManage('owner')).toBe(false));
});
describe('studio protection', () => {
  it('redirects anonymous visitors to login', () =>
    expect(() => requireAuthor(null)).toThrow());
  it('denies a reader', () =>
    expect(() =>
      requireAuthor({
        id: 'x',
        name: 'Reader',
        email: 'a@example.test',
        role: 'reader',
      }),
    ).toThrow());
  it.each(['author', 'admin'])('accepts %s', (role) =>
    expect(
      requireAuthor({ id: 'x', name: 'Author', email: 'a@example.test', role })
        .role,
    ).toBe(role),
  );
});
describe('Markdown security', () => {
  it('keeps safe prose formatting', () =>
    expect(renderMarkdown('**Hello** and *welcome*')).toContain(
      '<strong>Hello</strong>',
    ));
  it('removes scripts, events, frames and unsafe links', () => {
    const result = renderMarkdown(
      '<script>alert(1)</script><iframe src="https://evil.test"></iframe><img src=x onerror=alert(1)><a href="javascript:alert(1)">bad</a>',
    );
    expect(result).not.toMatch(/script|iframe|onerror|javascript|<img/);
  });
  it('blocks protocol-relative links', () =>
    expect(renderMarkdown('[test](//evil.test)')).not.toContain('href='));
});
describe('authentication continuation', () => {
  it('preserves a local destination', () =>
    expect(safeNext('/admin/books')).toBe('/admin/books'));
  it.each([
    '//evil.test',
    'https://evil.test',
    '/\\evil.test',
    '/\n/evil.test',
    null,
  ])('rejects an unsafe destination %s', (value) =>
    expect(safeNext(value)).toBe('/account'),
  );
});
describe('production configuration', () => {
  it('allows a local database in development', () =>
    expect(validateConfig({}, false).databaseUrl).toBe('file:local.db'));
  it('fails closed without production secrets', () =>
    expect(() => validateConfig({}, true)).toThrow());
  it('rejects a development database in production', () =>
    expect(() =>
      validateConfig(
        {
          TURSO_DATABASE_URL: 'file:local.db',
          TURSO_AUTH_TOKEN: 'token',
          AUTH_SECRET: 'a'.repeat(32),
          PUBLIC_SITE_URL: 'https://example.test',
          EMAIL_FROM: 'a@example.test',
          EMAIL_PROVIDER_API_KEY: 'key',
        },
        true,
      ),
    ).toThrow(/Turso/));
});
