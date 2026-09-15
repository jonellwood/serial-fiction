import { client } from './db';
export interface StoryImage {
  id: string;
  chapter_id: string;
  caption: string;
  price_cents: number;
  owned: boolean;
  ai_generated: number;
  credit_cents: number;
}
export async function chapterImages(chapterId: string, userId?: string) {
  const rows = (
    await client.execute({
      sql: `SELECT i.id,i.chapter_id,i.caption,i.price_cents,i.ai_generated,CASE WHEN e.id IS NULL THEN 0 ELSE 1 END AS owned,COALESCE(e.credit_cents,0) AS credit_cents FROM images i LEFT JOIN entitlements e ON e.content_id=i.id AND e.content_type='image' AND e.user_id=? AND e.revoked_at IS NULL WHERE i.chapter_id=? ORDER BY i.created_at,i.id`,
      args: [userId || '', chapterId],
    })
  ).rows;
  return rows.map((i) => ({
    ...i,
    owned: !!i.owned,
  })) as unknown as StoryImage[];
}
