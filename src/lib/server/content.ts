import { client } from './db';
import type { Book, Chapter } from '$lib/types';
import { error } from '@sveltejs/kit';
import { canManage, canReadChapter } from './access';
export async function listBooks(all = false) {
  const result = await client.execute(
    `SELECT b.*, (SELECT count(*) FROM chapters c WHERE c.book_id=b.id AND c.status='published') AS chapter_count FROM books b ${all ? '' : "WHERE b.status='published'"} ORDER BY b.created_at DESC`,
  );
  return result.rows as unknown as Book[];
}
export async function getBook(slug: string, role?: string) {
  const result = await client.execute({
    sql: 'SELECT * FROM books WHERE slug=?',
    args: [slug],
  });
  const book = result.rows[0] as unknown as Book;
  if (!book || (book.status !== 'published' && !canManage(role)))
    error(404, 'This book is not available.');
  return book;
}
export async function listChapters(bookId: string, role?: string) {
  const result = await client.execute({
    sql: `SELECT id, book_id, chapter_number, slug, title, summary, content_notice, is_free, status, published_at FROM chapters WHERE book_id=? ${canManage(role) ? '' : "AND status='published'"} ORDER BY chapter_number`,
    args: [bookId],
  });
  return result.rows as unknown as Omit<Chapter, 'content_markdown'>[];
}
export async function readChapter(
  bookSlug: string,
  chapterSlug: string,
  role?: string,
) {
  const book = await getBook(bookSlug, role);
  const chapters = await listChapters(book.id, role);
  const chapter = chapters.find((item) => item.slug === chapterSlug);
  if (!chapter) error(404, 'This chapter is not published yet.');
  if (!canReadChapter(book.status, chapter.status, chapter.is_free, role))
    error(
      403,
      'This chapter is locked. Paid access will be available in a later release.',
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
