import { requireBookEditor } from './book-access';
import { cents } from '$lib/pricing';
import { error, fail } from '@sveltejs/kit';
import { client } from './db';
import { requireAuthor } from './access';
import type { Book, Chapter } from '$lib/types';
export async function editBook(id: string, user: App.Locals['user']) {
  await requireBookEditor(id, user);
  const result = await client.execute({
    sql: 'SELECT * FROM books WHERE id=?',
    args: [id],
  });
  if (!result.rows[0]) error(404, 'Book not found.');
  return result.rows[0] as unknown as Book;
}
export async function editChapter(
  bookId: string,
  id: string,
  user: App.Locals['user'],
) {
  await requireBookEditor(bookId, user);
  const result = await client.execute({
    sql: 'SELECT * FROM chapters WHERE id=? AND book_id=?',
    args: [id, bookId],
  });
  if (!result.rows[0]) error(404, 'Chapter not found.');
  return result.rows[0] as unknown as Chapter;
}
export async function saveContent(
  user: App.Locals['user'],
  form: FormData,
  type: 'book' | 'chapter',
  id?: string,
  bookId?: string,
) {
  const actor = requireAuthor(user);
  if (type === 'chapter') await requireBookEditor(bookId!, actor);
  else if (id) await requireBookEditor(id, actor);
  const value = (key: string) => String(form.get(key) || '').trim();
  const title = value('title');
  const slug = value('slug');
  const status = value('status');
  if (
    !title ||
    title.length > 180 ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
    slug.length > 150
  )
    return {
      failure: fail(400, {
        message:
          'Add a title (up to 180 characters) and a URL slug using lowercase words separated by hyphens.',
      }),
    };
  if (!['draft', 'published', 'archived'].includes(status))
    return {
      failure: fail(400, { message: 'Choose a valid publication status.' }),
    };
  const now = new Date().toISOString();
  const contentId = id || crypto.randomUUID();
  let fields: Record<string, string | number | null> = {
    title,
    slug,
    status,
    updated_at: now,
  };
  if (type === 'book') {
    const cover = value('cover_image_url');
    if (cover && !/^https:\/\//.test(cover) && !/^\/(?!\/)/.test(cover))
      return {
        failure: fail(400, {
          message:
            'Cover must be an HTTPS URL or a local path beginning with /.',
        }),
      };
    if (!value('author_name'))
      return { failure: fail(400, { message: 'Add an author name.' }) };
    fields = {
      ...fields,
      subtitle: value('subtitle'),
      description: value('description'),
      author_name: value('author_name'),
      cover_image_url: cover,
      tags: value('tags'),
      content_notice: value('content_notice'),
    };
  } else {
    const number = Number(value('chapter_number'));
    if (!Number.isInteger(number) || number < 1 || number > 10000)
      return {
        failure: fail(400, {
          message: 'Chapter number must be a whole number between 1 and 10000.',
        }),
      };
    const markdown = value('content_markdown');
    if (markdown.length > 250000 || (status === 'published' && !markdown))
      return {
        failure: fail(400, {
          message:
            'Published chapters need text. Keep chapters below 250,000 characters.',
        }),
      };
    let price: number, bundle: number;
    try {
      price = cents(value('price') || '2.99');
      bundle = cents(value('image_bundle_price') || '50.00');
    } catch {
      return {
        failure: fail(400, {
          message: 'Enter valid chapter and image collection prices.',
        }),
      };
    }
    fields = {
      ...fields,
      price_cents: price,
      image_bundle_cents: bundle,
      book_id: bookId!,
      chapter_number: number,
      summary: value('summary'),
      content_markdown: markdown,
      content_notice: value('content_notice'),
      is_free: form.has('is_free') ? 1 : 0,
      ai_generated: form.has('ai_generated') ? 1 : 0,
    };
  }
  if (
    Object.values(fields).some(
      (v) => typeof v === 'string' && v.length > 250000,
    )
  )
    return { failure: fail(400, { message: 'A field is too long.' }) };
  let old: Book | Chapter | undefined;
  if (id)
    old =
      type === 'book'
        ? await editBook(id, user)
        : await editChapter(bookId!, id, user);
  fields.published_at =
    status === 'published'
      ? old?.published_at || now
      : old?.published_at || null;
  if (!id && type === 'book') fields.owner_user_id = actor.id;
  if (!id) fields = { id: contentId, ...fields, created_at: now };
  const keys = Object.keys(fields);
  const table = type === 'book' ? 'books' : 'chapters';
  const sql = id
    ? `UPDATE ${table} SET ${keys.map((k) => `${k}=?`).join(',')} WHERE id=?`
    : `INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`;
  try {
    await client.batch(
      [
        { sql, args: [...Object.values(fields), ...(id ? [id] : [])] },
        {
          sql: 'INSERT INTO audit_log (id,actor_user_id,action,target_type,target_id,metadata_json,created_at) VALUES (?,?,?,?,?,?,?)',
          args: [
            crypto.randomUUID(),
            actor.id,
            `${type}.${status === 'published' && old?.status !== 'published' ? 'published' : id ? 'updated' : 'created'}`,
            type,
            contentId,
            JSON.stringify({ status }),
            now,
          ],
        },
      ],
      'write',
    );
  } catch (err) {
    if (String(err).includes('UNIQUE constraint'))
      return {
        failure: fail(409, {
          message:
            'That URL slug or chapter number is already in use. Choose another.',
        }),
      };
    throw err;
  }
  return { id: contentId };
}
