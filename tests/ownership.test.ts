import { beforeEach, afterAll, describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
vi.mock('../src/lib/server/db', async () => {
  const { createClient } = await import('@libsql/client');
  return { client: createClient({ url: ':memory:' }) };
});
vi.mock('../src/lib/server/storage', () => ({
  imageStorageAvailable: vi.fn(() => false),
  getImage: vi.fn(async () => new Uint8Array([1, 2, 3])),
}));
import { client } from '../src/lib/server/db';
import { getImage } from '../src/lib/server/storage';
import { owns } from '../src/lib/server/ownership';
import { quote, requestOrder, fulfill } from '../src/lib/server/orders';
import { bundlePrice, cents } from '../src/lib/pricing';
import { GET } from '../src/routes/media/[id]/+server';
import {
  readChapter,
  getBook,
  listBooks,
  listChapters,
} from '../src/lib/server/content';
import { canEditBook } from '../src/lib/server/book-access';
import { editBook, editChapter, saveContent } from '../src/lib/server/editor';
import { chapterImages } from '../src/lib/server/images';
import { actions as chapterActions } from '../src/routes/admin/books/[bookId]/chapters/[chapterId]/+page.server';
import { actions as teamActions } from '../src/routes/admin/books/[bookId]/team/+page.server';
import { actions as userActions } from '../src/routes/admin/users/+page.server';
let initialized = false;
beforeEach(async () => {
  vi.clearAllMocks();
  if (!initialized) {
    for (const migration of [
      '001_foundation.sql',
      '002_image_access.sql',
      '003_author_scope_disclosure.sql',
    ])
      await client.executeMultiple(
        await readFile(`migrations/${migration}`, 'utf8'),
      );
    initialized = true;
  }
  for (const table of [
    'book_collaborators',
    'entitlements',
    'order_items',
    'orders',
    'images',
    'audit_log',
    'chapters',
    'books',
    'user',
  ])
    await client.execute(`DELETE FROM ${table}`);
  await client.execute(
    "INSERT INTO user(id,name,email,emailVerified,createdAt,updatedAt,role) VALUES('r','Reader','reader@example.test',1,0,0,'reader'),('a','Admin','admin@example.test',1,0,0,'admin')",
  );
  await client.execute(
    "INSERT INTO books(id,slug,title,author_name,status,created_at,updated_at) VALUES('b','book','Book','Author','published','','')",
  );
  await client.execute(
    "INSERT INTO chapters(id,book_id,chapter_number,slug,title,content_markdown,status,is_free,created_at,updated_at) VALUES('c','b',1,'chapter','Chapter','Private test text','published',0,'','')",
  );
  for (let n = 0; n < 6; n++)
    await client.execute({
      sql: 'INSERT INTO images(id,chapter_id,caption,price_cents,created_at) VALUES(?,?,?,?,?)',
      args: [`i${n}`, 'c', `Image ${n}`, 999, ''],
    });
});
afterAll(() => client.close());
async function grantChapter() {
  const id = await requestOrder('r', 'c', 'chapter', '');
  await fulfill(id, 'a', 'test payment', false);
}
const media = (id: string, preview = false, role = 'reader', user = 'r') =>
  GET({
    params: { id },
    locals: { user: { id: user, role } },
    url: new URL(
      `https://example.test/media/${id}${preview ? '?preview=1' : ''}`,
    ),
  } as never);
describe('private delivery and ownership', () => {
  it('denies both preview and original before chapter ownership', async () => {
    await expect(media('i0')).rejects.toMatchObject({ status: 403 });
    await expect(media('i0', true)).rejects.toMatchObject({ status: 403 });
    expect(getImage).not.toHaveBeenCalled();
  });
  it('chapter ownership allows text and previews, never unpaid originals', async () => {
    await grantChapter();
    expect((await readChapter('book', 'chapter', 'reader', 'r')).markdown).toBe(
      'Private test text',
    );
    expect((await media('i0', true)).status).toBe(200);
    await expect(media('i0')).rejects.toMatchObject({ status: 403 });
  });
  it('image grants are account-specific, revocable and never bypass publication', async () => {
    await grantChapter();
    const id = await requestOrder('r', 'c', 'image', 'i0');
    await fulfill(id, 'a', 'image payment', false);
    expect((await media('i0')).headers.get('cache-control')).toBe(
      'private, no-store',
    );
    await expect(
      media('i0', false, 'reader', 'stranger'),
    ).rejects.toMatchObject({ status: 403 });
    await client.execute("UPDATE chapters SET status='draft'");
    await expect(media('i0')).rejects.toMatchObject({ status: 404 });
    await client.execute("UPDATE chapters SET status='published'");
    await client.execute(
      "UPDATE entitlements SET revoked_at='now' WHERE content_type='image'",
    );
    await expect(media('i0')).rejects.toMatchObject({ status: 403 });
  });
  it('allows author preview and keeps missing images private', async () => {
    expect((await media('i0', false, 'admin', 'a')).status).toBe(200);
    await expect(media('missing', false, 'admin', 'a')).rejects.toMatchObject({
      status: 404,
    });
  });
});
describe('purchase requests and bundle credit', () => {
  it('does not grant access merely for requesting', async () => {
    await requestOrder('r', 'c', 'chapter', '');
    expect(await owns('r', 'chapter', 'c')).toBe(false);
  });
  it('rejects forged prices and images from another chapter', async () => {
    await expect(
      requestOrder('r', 'c', 'chapter', '', 1),
    ).rejects.toMatchObject({ status: 409 });
    await grantChapter();
    await expect(quote('c', 'r', 'image', 'foreign')).rejects.toMatchObject({
      status: 404,
    });
  });
  it('credits actual payments and supports completion', async () => {
    await grantChapter();
    expect((await quote('c', 'r', 'bundle', '')).total).toBe(5000);
    const id = await requestOrder('r', 'c', 'image', 'i0');
    await fulfill(id, 'a', 'paid 9.99', false);
    const offer = await quote('c', 'r', 'bundle', '');
    expect(offer.total).toBe(4001);
    expect(offer.items).toHaveLength(5);
    const bundle = await requestOrder('r', 'c', 'bundle', '');
    await fulfill(bundle, 'a', 'paid 40.01', false);
    expect(await owns('r', 'image', 'i5')).toBe(true);
    await expect(quote('c', 'r', 'bundle', '')).rejects.toMatchObject({
      status: 409,
    });
  });
  it('does not award payment credit for gifts', async () => {
    await grantChapter();
    const id = await requestOrder('r', 'c', 'image', 'i0');
    await fulfill(id, 'a', 'gift', true);
    expect((await quote('c', 'r', 'bundle', '')).total).toBe(4995);
  });
  it('rejects repeated confirmation and overlapping stale orders atomically', async () => {
    await grantChapter();
    const first = await requestOrder('r', 'c', 'image', 'i0');
    const stale = await requestOrder('r', 'c', 'bundle', '');
    await fulfill(first, 'a', 'paid', false);
    await expect(fulfill(first, 'a', 'again', false)).rejects.toMatchObject({
      status: 409,
    });
    await expect(fulfill(stale, 'a', 'stale', false)).rejects.toMatchObject({
      status: 409,
    });
    expect(await owns('r', 'image', 'i1')).toBe(false);
  });
  it('caps prices at zero and at the remaining individual total', () => {
    expect(
      bundlePrice(5000, [
        { owned: true, credit_cents: 6000, price_cents: 999 },
        { owned: false, credit_cents: 0, price_cents: 999 },
      ]),
    ).toBe(0);
    expect(
      bundlePrice(5000, [{ owned: false, credit_cents: 0, price_cents: 999 }]),
    ).toBe(999);
    expect(cents('9.99')).toBe(999);
    expect(() => cents('-1')).toThrow();
    expect(() => cents('1.001')).toThrow();
  });
});

describe('author book boundaries', () => {
  const author = {
    id: 'writer',
    role: 'author',
    name: 'Writer',
    email: 'writer@example.test',
  };
  async function writer() {
    await client.execute(
      "INSERT INTO user(id,name,email,emailVerified,createdAt,updatedAt,role) VALUES('writer','Writer','writer@example.test',1,0,0,'author')",
    );
  }
  it('denies unrelated authors studio records, locked text, originals and draft metadata', async () => {
    await writer();
    expect(await canEditBook('b', 'author', 'writer')).toBe(false);
    expect(await listBooks(true, author)).toHaveLength(0);
    await expect(editBook('b', author)).rejects.toMatchObject({ status: 404 });
    await expect(editChapter('b', 'c', author)).rejects.toMatchObject({
      status: 404,
    });
    await expect(
      readChapter('book', 'chapter', 'author', 'writer'),
    ).rejects.toMatchObject({ status: 403 });
    await expect(media('i0', false, 'author', 'writer')).rejects.toMatchObject({
      status: 403,
    });
    await client.execute("UPDATE chapters SET status='draft'");
    expect(await listChapters('b', 'author', 'writer')).toHaveLength(0);
    await client.execute("UPDATE books SET status='draft'");
    await expect(getBook('book', 'author', 'writer')).rejects.toMatchObject({
      status: 404,
    });
  });
  it('grants scoped collaboration and immediately enforces its removal', async () => {
    await writer();
    await client.execute("INSERT INTO book_collaborators VALUES('b','writer')");
    expect((await editChapter('b', 'c', author)).id).toBe('c');
    expect(await listBooks(true, author)).toHaveLength(1);
    expect((await media('i0', false, 'author', 'writer')).status).toBe(200);
    await client.execute('DELETE FROM book_collaborators');
    await expect(editBook('b', author)).rejects.toMatchObject({ status: 404 });
  });
  it('assigns new books to their creator and ignores forged owner fields', async () => {
    await writer();
    const f = new FormData();
    for (const [k, v] of Object.entries({
      title: 'New',
      slug: 'new',
      status: 'draft',
      author_name: 'Writer',
      owner_user_id: 'a',
    }))
      f.set(k, v);
    const result = await saveContent(author, f, 'book');
    const book = await editBook(result.id!, author);
    expect(book.owner_user_id).toBe('writer');
    await expect(editChapter(book.id, 'c', author)).rejects.toMatchObject({
      status: 404,
    });
  });
  it('rejects unauthorized chapter creation and uploads before processing bodies', async () => {
    await writer();
    await expect(
      saveContent(author, new FormData(), 'chapter', undefined, 'b'),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      chapterActions.upload({
        locals: { user: author },
        params: { bookId: 'b', chapterId: 'c' },
        request: new Request('https://example.test', { method: 'POST' }),
      } as never),
    ).rejects.toMatchObject({ status: 404 });
  });
  it('does not let a collaborator delegate access or change account roles', async () => {
    await writer();
    await client.execute("INSERT INTO book_collaborators VALUES('b','writer')");
    await expect(
      teamActions.default({
        locals: { user: author },
        params: { bookId: 'b' },
      } as never),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      userActions.default({ locals: { user: author } } as never),
    ).rejects.toMatchObject({ status: 403 });
  });
  it('stores and clears text disclosure and returns it in reader metadata', async () => {
    await writer();
    await client.execute("UPDATE books SET owner_user_id='writer'");
    const f = new FormData();
    for (const [k, v] of Object.entries({
      title: 'Chapter',
      slug: 'chapter',
      status: 'published',
      chapter_number: '1',
      content_markdown: 'Test prose',
      is_free: 'on',
      ai_generated: 'on',
    }))
      f.set(k, v);
    await saveContent(author, f, 'chapter', 'c', 'b');
    expect((await readChapter('book', 'chapter')).chapter.ai_generated).toBe(1);
    f.delete('ai_generated');
    await saveContent(author, f, 'chapter', 'c', 'b');
    expect((await readChapter('book', 'chapter')).chapter.ai_generated).toBe(0);
  });
  it('allows scoped image disclosure changes and rejects unrelated image IDs', async () => {
    await writer();
    await client.execute("UPDATE books SET owner_user_id='writer'");
    const f = new FormData();
    f.set('id', 'i0');
    f.set('caption', 'Forest');
    f.set('image_price', '9.99');
    f.set('ai_generated', 'on');
    await chapterActions.imageDetails({
      locals: { user: author },
      params: { bookId: 'b', chapterId: 'c' },
      request: { formData: async () => f },
    } as never);
    expect((await chapterImages('c'))[0].ai_generated).toBe(1);
  });
});

it('returns a useful unavailable response before parsing uploads when storage is unconfigured', async () => {
  const response = await chapterActions.upload({
    locals: { user: { id: 'a', role: 'admin' } },
    params: { bookId: 'b', chapterId: 'c' },
    request: {
      formData: () => {
        throw new Error('Must not parse upload');
      },
    },
  } as never);
  expect(response).toMatchObject({ status: 503 });
});

describe('images included with a chapter', () => {
  it('serves zero-price originals anonymously only when the chapter is public and free', async () => {
    await client.execute("UPDATE images SET price_cents=0 WHERE id='i0'");
    await expect(media('i0', false, 'reader', '')).rejects.toMatchObject({
      status: 403,
    });
    await client.execute('UPDATE chapters SET is_free=1');
    expect((await media('i0', false, 'reader', '')).status).toBe(200);
    await expect(media('i1', false, 'reader', '')).rejects.toMatchObject({
      status: 403,
    });
    await client.execute("UPDATE chapters SET status='draft'");
    await expect(media('i0', false, 'reader', '')).rejects.toMatchObject({
      status: 404,
    });
  });
  it('includes free images after chapter purchase without granting image ownership', async () => {
    await grantChapter();
    await client.execute("UPDATE images SET price_cents=0 WHERE id='i0'");
    expect((await media('i0')).status).toBe(200);
    expect(await owns('r', 'image', 'i0')).toBe(false);
    await expect(quote('c', 'r', 'image', 'i0')).rejects.toMatchObject({
      status: 409,
    });
    const bundle = await quote('c', 'r', 'bundle', '');
    expect(bundle.items).toHaveLength(5);
    expect(bundle.total).toBe(4995);
    expect(bundle.items.some((i) => i.id === 'i0')).toBe(false);
    await client.execute('UPDATE images SET price_cents=0');
    await expect(quote('c', 'r', 'bundle', '')).rejects.toMatchObject({
      status: 409,
    });
  });
  it('saves the checkbox as zero, supports direct zero prices and can switch back to paid', async () => {
    const f = new FormData();
    f.set('id', 'i0');
    f.set('caption', 'Forest');
    f.set('image_price', '9.99');
    f.set('included', 'on');
    const save = () =>
      chapterActions.imageDetails({
        locals: { user: { id: 'a', role: 'admin' } },
        params: { bookId: 'b', chapterId: 'c' },
        request: { formData: async () => f },
      } as never);
    await save();
    expect(
      (await chapterImages('c')).find((i) => i.id === 'i0')!.price_cents,
    ).toBe(0);
    f.delete('included');
    f.set('image_price', '0.00');
    await save();
    expect(
      (await chapterImages('c')).find((i) => i.id === 'i0')!.price_cents,
    ).toBe(0);
    f.set('image_price', '9.99');
    await save();
    expect(
      (await chapterImages('c')).find((i) => i.id === 'i0')!.price_cents,
    ).toBe(999);
  });
  it('rejects stale purchase confirmations for images that are now free', async () => {
    await grantChapter();
    const id = await requestOrder('r', 'c', 'image', 'i0');
    await client.execute("UPDATE images SET price_cents=0 WHERE id='i0'");
    await expect(fulfill(id, 'a', 'old request', false)).rejects.toMatchObject({
      status: 409,
    });
    expect(await owns('r', 'image', 'i0')).toBe(false);
  });
});
