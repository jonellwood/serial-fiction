import { client } from '$lib/server/db';
import { requireAuthor } from '$lib/server/access';
export const load = async ({ locals }) => {
  requireAuthor(locals.user);
  const result = await client.execute(
    'SELECT action,target_type,target_id,created_at FROM audit_log ORDER BY created_at DESC LIMIT 100',
  );
  return {
    events: result.rows.map((r) => ({
      action: String(r.action),
      type: String(r.target_type),
      id: String(r.target_id),
      at: String(r.created_at),
    })),
  };
};
