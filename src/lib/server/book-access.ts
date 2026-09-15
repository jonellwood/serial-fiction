import { client } from './db';
import { requireAuthor } from './access';
import { error } from '@sveltejs/kit';
export async function canEditBook(
  bookId: string,
  role?: string,
  userId?: string,
) {
  if (role === 'admin') return true;
  if (role !== 'author' || !userId) return false;
  return (
    (
      await client.execute({
        sql: 'SELECT id FROM books WHERE id=? AND (owner_user_id=? OR EXISTS(SELECT 1 FROM book_collaborators WHERE book_id=books.id AND user_id=?))',
        args: [bookId, userId, userId],
      })
    ).rows.length > 0
  );
}
export async function requireBookEditor(
  bookId: string,
  user: App.Locals['user'],
) {
  const actor = requireAuthor(user);
  if (!(await canEditBook(bookId, actor.role, actor.id)))
    error(404, 'Book not found.');
  return actor;
}
