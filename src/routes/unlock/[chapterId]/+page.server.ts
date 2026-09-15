import { client } from '$lib/server/db';
import { requestOrder, quote } from '$lib/server/orders';
import { error, redirect } from '@sveltejs/kit';
export const load = async ({ params, locals, url }) => {
  if (!locals.user)
    redirect(
      303,
      `/login?next=${encodeURIComponent(url.pathname + url.search)}`,
    );
  const kind = url.searchParams.get('kind') || 'chapter';
  const imageId = url.searchParams.get('image') || '';
  const chapter = (
    await client.execute({
      sql: "SELECT c.title,c.slug,c.ai_generated,b.slug AS book_slug FROM chapters c JOIN books b ON b.id=c.book_id WHERE c.id=? AND c.status='published' AND b.status='published'",
      args: [params.chapterId],
    })
  ).rows[0];
  if (!chapter) error(404);
  const orders = (
    await client.execute({
      sql: 'SELECT id,status,total_cents,kind FROM orders WHERE user_id=? AND chapter_id=? ORDER BY created_at DESC LIMIT 20',
      args: [locals.user.id, params.chapterId],
    })
  ).rows;
  const offer = url.searchParams.has('requested')
    ? null
    : await quote(params.chapterId, locals.user.id, kind, imageId);
  const aiImages = (
    await client.execute({
      sql: "SELECT id FROM images WHERE chapter_id=? AND ai_generated=1 AND (?='bundle' OR id=?)",
      args: [params.chapterId, kind, imageId],
    })
  ).rows;
  return {
    aiDisclosure:
      kind === 'chapter' ? !!chapter.ai_generated : aiImages.length > 0,
    chapter: {
      title: String(chapter.title),
      slug: String(chapter.slug),
      book_slug: String(chapter.book_slug),
    },
    kind,
    imageId,
    total: offer?.total ?? null,
    orders: orders.map((o) => ({
      id: String(o.id),
      status: String(o.status),
      total: Number(o.total_cents),
      kind: String(o.kind),
    })),
  };
};
export const actions = {
  default: async ({ params, locals, request }) => {
    if (!locals.user) error(401);
    const form = await request.formData();
    const kind = String(form.get('kind') || ''),
      imageId = String(form.get('image') || '');
    await requestOrder(
      locals.user.id,
      params.chapterId,
      kind,
      imageId,
      Number(form.get('expected_total')),
    );
    redirect(303, `/unlock/${params.chapterId}?requested=1`);
  },
};
