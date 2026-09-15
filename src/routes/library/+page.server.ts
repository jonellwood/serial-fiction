import { redirect } from '@sveltejs/kit';
import { client } from '$lib/server/db';
export const load = async ({ locals }) => {
  if (!locals.user) redirect(303, '/login?next=/library');
  const rows = (
    await client.execute({
      sql: "SELECT DISTINCT c.id,c.title,c.slug,b.slug AS book_slug,b.title AS book_title FROM entitlements e LEFT JOIN images i ON e.content_type='image' AND i.id=e.content_id JOIN chapters c ON c.id=CASE WHEN e.content_type='chapter' THEN e.content_id ELSE i.chapter_id END JOIN books b ON b.id=c.book_id WHERE e.user_id=? AND e.revoked_at IS NULL AND c.status='published' AND b.status='published' ORDER BY b.title,c.chapter_number",
      args: [locals.user.id],
    })
  ).rows;
  return {
    chapters: rows.map((c) => ({
      id: String(c.id),
      title: String(c.title),
      slug: String(c.slug),
      bookSlug: String(c.book_slug),
      bookTitle: String(c.book_title),
    })),
  };
};
