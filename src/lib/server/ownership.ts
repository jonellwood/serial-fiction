import { client } from './db';
export async function owns(
  userId: string | undefined,
  type: string,
  id: string,
) {
  if (!userId) return false;
  return (
    (
      await client.execute({
        sql: 'SELECT id FROM entitlements WHERE user_id=? AND content_type=? AND content_id=? AND revoked_at IS NULL',
        args: [userId, type, id],
      })
    ).rows.length > 0
  );
}
