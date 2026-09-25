import { client } from '$lib/server/db';
import { canEditBook } from '$lib/server/book-access';
import { owns } from '$lib/server/ownership';
import { getImage } from '$lib/server/storage';
import { error } from '@sveltejs/kit';
export const GET = async ({ params, locals, url }) => {
  const row = (
    await client.execute({
      sql: 'SELECT b.id AS book_id,i.id,i.price_cents,c.id AS chapter_id,c.is_free,c.status,b.status AS book_status FROM images i JOIN chapters c ON c.id=i.chapter_id JOIN books b ON b.id=c.book_id WHERE i.id=?',
      args: [params.id],
    })
  ).rows[0];
  if (!row) error(404);
  const manager = await canEditBook(
    String(row.book_id),
    locals.user?.role,
    locals.user?.id,
  );
  if (
    !manager &&
    (row.status !== 'published' || row.book_status !== 'published')
  )
    error(404);
  if (
    !manager &&
    !row.is_free &&
    !(await owns(locals.user?.id, 'chapter', String(row.chapter_id)))
  )
    error(403);
  const preview = url.searchParams.get('preview') === '1';
  if (
    !preview &&
    !manager &&
    Number(row.price_cents) !== 0 &&
    !(await owns(locals.user?.id, 'image', params.id))
  )
    error(403);
  return new Response(
    new Uint8Array(await getImage(params.id, preview)).buffer,
    {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    },
  );
};
