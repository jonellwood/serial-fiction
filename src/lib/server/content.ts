import { owns } from './ownership';
import { client } from './db';
import type { Book, Chapter } from '$lib/types';
import { error } from '@sveltejs/kit';
import { canEditBook } from './book-access';
export async function listBooks(all = false, user?: App.Locals['user']) {
  const result = await client.execute({
    sql: `SELECT b.*, (SELECT count(*) FROM chapters c WHERE c.book_id=b.id AND c.status='published') AS chapter_count FROM books b WHERE ${all ? (user?.role === 'admin' ? '1=1' : "(?='author' AND (b.owner_user_id=? OR EXISTS(SELECT 1 FROM book_collaborators WHERE book_id=b.id AND user_id=?)))") : "b.status='published'"} ORDER BY b.created_at DESC`,
    args:
      all && user?.role !== 'admin'
        ? [user?.role || '', user?.id || '', user?.id || '']
        : [],
  });
  return result.rows as unknown as Book[];
}
export async function getBook(slug: string, role?: string, userId?: string) {
  const result = await client.execute({
    sql: 'SELECT * FROM books WHERE slug=?',
    args: [slug],
  });
  const book = result.rows[0] as unknown as Book;
  if (
    !book ||
    (book.status !== 'published' && !(await canEditBook(book.id, role, userId)))
  )
    error(404, 'This book is not available.');
  return book;
}
export async function listChapters(
  bookId: string,
  role?: string,
  userId?: string,
) {
  const result = await client.execute({
    sql: `SELECT id, book_id, chapter_number, slug, title, summary, content_notice, is_free, status, published_at, price_cents, image_bundle_cents, ai_generated FROM chapters WHERE book_id=? ${(await canEditBook(bookId, role, userId)) ? '' : "AND status='published'"} ORDER BY chapter_number`,
    args: [bookId],
  });
  return result.rows as unknown as Omit<Chapter, 'content_markdown'>[];
}
export async function readChapter(
  bookSlug: string,
  chapterSlug: string,
  role?: string,
  userId?: string,
) {
  const book = await getBook(bookSlug, role, userId);
  const chapters = await listChapters(book.id, role, userId);
  const chapter = chapters.find((item) => item.slug === chapterSlug);
  if (!chapter) error(404, 'This chapter is not published yet.');
  if (
    !(await canEditBook(book.id, role, userId)) &&
    !chapter.is_free &&
    !(await owns(userId, 'chapter', chapter.id))
  )
    error(
      403,
      'This chapter is locked. Request access from the chapter unlock page.',
    );
  const result = await client.execute({
    sql: 'SELECT content_markdown FROM chapters WHERE id=?',
    args: [chapter.id],
  });
  return {
    book,
    chapter,
    chapters,
    markdown: String(result.rows[0].content_markdown),
  };
}
