import { client } from '$lib/server/db';
import { editBook } from '$lib/server/editor';
import { error, fail } from '@sveltejs/kit';
async function authorize(id: string, user: App.Locals['user']) {
  const book = await editBook(id, user);
  if (user?.role !== 'admin' && book.owner_user_id !== user?.id)
    error(403, 'Only the owner or an administrator can manage collaborators.');
  return book;
}
export const load = async ({ params, locals }) => {
  const book = await authorize(params.bookId, locals.user);
  const rows = (
    await client.execute({
      sql: 'SELECT u.id,u.email FROM book_collaborators c JOIN user u ON u.id=c.user_id WHERE c.book_id=?',
      args: [book.id],
    })
  ).rows;
  const owner = book.owner_user_id
    ? (
        await client.execute({
          sql: 'SELECT email FROM user WHERE id=?',
          args: [book.owner_user_id],
        })
      ).rows[0]
    : null;
  return {
    book,
    owner: owner ? String(owner.email) : 'Unassigned (admin-only)',
    isAdmin: locals.user?.role === 'admin',
    collaborators: rows.map((r) => ({
      id: String(r.id),
      email: String(r.email),
    })),
  };
};
export const actions = {
  default: async ({ params, locals, request }) => {
    await authorize(params.bookId, locals.user);
    const form = await request.formData(),
      action = String(form.get('action'));
    if (!['owner', 'add', 'remove'].includes(action)) error(400);
    if (action === 'owner' && locals.user?.role !== 'admin') error(403);
    const email = String(form.get('email') || '')
      .trim()
      .toLowerCase();
    const target = (
      await client.execute({
        sql:
          action === 'remove'
            ? 'SELECT id FROM user WHERE email=?'
            : "SELECT id FROM user WHERE email=? AND emailVerified=1 AND role IN ('author','admin')",
        args: [email],
      })
    ).rows[0];
    if (!target)
      return fail(400, {
        message: 'Choose an existing verified Author or Admin account.',
      });
    const sql =
      action === 'owner'
        ? 'UPDATE books SET owner_user_id=? WHERE id=?'
        : action === 'add'
          ? 'INSERT INTO book_collaborators(user_id,book_id) VALUES(?,?) ON CONFLICT DO NOTHING'
          : 'DELETE FROM book_collaborators WHERE user_id=? AND book_id=?';
    await client.batch(
      [
        { sql, args: [target.id, params.bookId] },
        {
          sql: 'INSERT INTO audit_log(id,actor_user_id,action,target_type,target_id,metadata_json,created_at) VALUES(?,?,?,?,?,?,?)',
          args: [
            crypto.randomUUID(),
            locals.user!.id,
            `book.team_${action}`,
            'book',
            params.bookId,
            JSON.stringify({ userId: target.id }),
            new Date().toISOString(),
          ],
        },
      ],
      'write',
    );
    return { message: 'Book permissions updated.' };
  },
};
