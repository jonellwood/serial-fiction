import { client } from '$lib/server/db';
import { fulfill } from '$lib/server/orders';
import { error, fail } from '@sveltejs/kit';
function admin(user: App.Locals['user']) {
  if (user?.role !== 'admin') error(403);
  return user;
}
export const load = async ({ locals }) => {
  admin(locals.user);
  const orders = (
    await client.execute(
      'SELECT o.*,u.email,c.title FROM orders o JOIN user u ON u.id=o.user_id JOIN chapters c ON c.id=o.chapter_id ORDER BY o.created_at DESC LIMIT 100',
    )
  ).rows;
  const grants = (
    await client.execute(
      'SELECT e.id,e.content_type,e.content_id,u.email FROM entitlements e JOIN user u ON u.id=e.user_id WHERE e.revoked_at IS NULL ORDER BY e.created_at DESC LIMIT 100',
    )
  ).rows;
  return {
    orders: orders.map((o) => ({
      id: String(o.id),
      email: String(o.email),
      title: String(o.title),
      kind: String(o.kind),
      status: String(o.status),
      total: Number(o.total_cents),
    })),
    grants: grants.map((g) => ({
      id: String(g.id),
      type: String(g.content_type),
      contentId: String(g.content_id),
      email: String(g.email),
    })),
  };
};
export const actions = {
  fulfill: async ({ locals, request }) => {
    const actor = admin(locals.user),
      f = await request.formData();
    await fulfill(
      String(f.get('id')),
      actor.id,
      String(f.get('reference') || ''),
      f.has('complimentary'),
    );
    return { message: 'Access granted.' };
  },
  cancel: async ({ locals, request }) => {
    const actor = admin(locals.user),
      f = await request.formData();
    await client.batch(
      [
        {
          sql: "UPDATE orders SET status='cancelled' WHERE id=? AND status='pending'",
          args: [String(f.get('id'))],
        },
        {
          sql: 'INSERT INTO audit_log(id,actor_user_id,action,target_type,target_id,created_at) VALUES(?,?,?,?,?,?)',
          args: [
            crypto.randomUUID(),
            actor.id,
            'order.cancelled',
            'order',
            String(f.get('id')),
            new Date().toISOString(),
          ],
        },
      ],
      'write',
    );
    return { message: 'Request cancelled.' };
  },
  revoke: async ({ locals, request }) => {
    const actor = admin(locals.user),
      f = await request.formData();
    const reason = String(f.get('reason') || '').trim();
    if (!reason || reason.length > 250)
      return fail(400, { message: 'Enter a reason up to 250 characters.' });
    await client.batch(
      [
        {
          sql: 'UPDATE entitlements SET revoked_at=? WHERE id=? AND revoked_at IS NULL',
          args: [new Date().toISOString(), String(f.get('id'))],
        },
        {
          sql: 'INSERT INTO audit_log(id,actor_user_id,action,target_type,target_id,metadata_json,created_at) VALUES(?,?,?,?,?,?,?)',
          args: [
            crypto.randomUUID(),
            actor.id,
            'entitlement.revoked',
            'entitlement',
            String(f.get('id')),
            JSON.stringify({ reason }),
            new Date().toISOString(),
          ],
        },
      ],
      'write',
    );
    return {
      message: 'Access revoked. No payment was refunded automatically.',
    };
  },
};
