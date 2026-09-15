import { client } from '$lib/server/db';
import { error, fail } from '@sveltejs/kit';
function admin(user: App.Locals['user']) {
  if (user?.role !== 'admin') error(403);
  return user;
}
export const load = async ({ locals, url }) => {
  admin(locals.user);
  const email = url.searchParams.get('email')?.trim().toLowerCase() || '';
  const rows = email
    ? (
        await client.execute({
          sql: 'SELECT id,email,role,emailVerified FROM user WHERE email=?',
          args: [email],
        })
      ).rows
    : [];
  return {
    email,
    people: rows.map((u) => ({
      id: String(u.id),
      email: String(u.email),
      role: String(u.role),
      verified: !!u.emailVerified,
    })),
  };
};
export const actions = {
  default: async ({ locals, request }) => {
    const actor = admin(locals.user),
      form = await request.formData(),
      id = String(form.get('id')),
      role = String(form.get('role'));
    if (!['reader', 'author', 'admin'].includes(role)) error(400);
    if (id === actor.id)
      return fail(400, { message: 'You cannot change your own role here.' });
    const target = (
      await client.execute({
        sql: 'SELECT id FROM user WHERE id=? AND emailVerified=1',
        args: [id],
      })
    ).rows[0];
    if (!target)
      return fail(400, {
        message: 'The account must finish email verification first.',
      });
    await client.batch(
      [
        {
          sql: 'UPDATE user SET role=?,updatedAt=? WHERE id=?',
          args: [role, Date.now(), id],
        },
        { sql: 'DELETE FROM session WHERE userId=?', args: [id] },
        {
          sql: 'INSERT INTO audit_log(id,actor_user_id,action,target_type,target_id,metadata_json,created_at) VALUES(?,?,?,?,?,?,?)',
          args: [
            crypto.randomUUID(),
            actor.id,
            'user.role_changed',
            'user',
            id,
            JSON.stringify({ role }),
            new Date().toISOString(),
          ],
        },
      ],
      'write',
    );
    return { message: 'Role updated. This person must sign in again.' };
  },
};
