import { client } from './db';
import { chapterImages } from './images';
import { bundlePrice } from '$lib/pricing';
import { owns } from './ownership';
import { error } from '@sveltejs/kit';
export async function quote(
  chapterId: string,
  userId: string,
  kind: string,
  imageId: string,
) {
  const chapter = (
    await client.execute({
      sql: "SELECT c.* FROM chapters c JOIN books b ON b.id=c.book_id WHERE c.id=? AND c.status='published' AND b.status='published'",
      args: [chapterId],
    })
  ).rows[0];
  if (!chapter) error(404);
  const images = await chapterImages(chapterId, userId);
  if (kind === 'chapter') {
    if (chapter.is_free || (await owns(userId, 'chapter', chapterId)))
      error(409, 'You already have access to this chapter.');
    return {
      total: Number(chapter.price_cents),
      items: [{ type: 'chapter', id: chapterId, credit: 0 }],
    };
  }
  if (!chapter.is_free && !(await owns(userId, 'chapter', chapterId)))
    error(403, 'Unlock the chapter before its images.');
  if (kind === 'image') {
    const image = images.find((i) => i.id === imageId);
    if (!image) error(404);
    if (image.price_cents === 0)
      error(
        409,
        'This image is included with the chapter. No purchase is needed.',
      );
    if (image.owned) error(409, 'You already own this image.');
    return {
      total: image.price_cents,
      items: [{ type: 'image', id: image.id, credit: image.price_cents }],
    };
  }
  if (kind !== 'bundle') error(400);
  const remaining = images.filter((i) => !i.owned && i.price_cents > 0);
  if (!remaining.length) error(409, 'You already own this collection.');
  const total = bundlePrice(Number(chapter.image_bundle_cents), images);
  return {
    total,
    items: remaining.map((i, index) => ({
      type: 'image',
      id: i.id,
      credit:
        Math.floor(total / remaining.length) +
        (index < total % remaining.length ? 1 : 0),
    })),
  };
}
export async function requestOrder(
  userId: string,
  chapterId: string,
  kind: string,
  imageId: string,
  expectedTotal?: number,
) {
  const offer = await quote(chapterId, userId, kind, imageId);
  if (expectedTotal !== undefined && expectedTotal !== offer.total)
    error(409, 'The price changed. Reload to review the new price.');
  const pending = (
    await client.execute({
      sql: "SELECT id FROM orders WHERE user_id=? AND status='pending'",
      args: [userId],
    })
  ).rows;
  if (pending.length >= 20)
    error(429, 'Please wait for your existing requests to be processed.');
  const id = crypto.randomUUID();
  await client.batch(
    [
      {
        sql: 'INSERT INTO orders(id,user_id,chapter_id,kind,total_cents,created_at) VALUES(?,?,?,?,?,?)',
        args: [
          id,
          userId,
          chapterId,
          kind,
          offer.total,
          new Date().toISOString(),
        ],
      },
      ...offer.items.map((i) => ({
        sql: 'INSERT INTO order_items(order_id,content_type,content_id,credit_cents) VALUES(?,?,?,?)',
        args: [id, i.type, i.id, i.credit],
      })),
    ],
    'write',
  );
  return id;
}
export async function fulfill(
  id: string,
  actorId: string,
  reference: string,
  complimentary: boolean,
) {
  if (!reference.trim() || reference.length > 250)
    error(400, 'Add a payment reference or reason for complimentary access.');
  const tx = await client.transaction('write');
  try {
    const order = (
      await tx.execute({ sql: 'SELECT * FROM orders WHERE id=?', args: [id] })
    ).rows[0];
    if (!order || order.status !== 'pending')
      error(409, 'This request is no longer pending.');
    const items = (
      await tx.execute({
        sql: 'SELECT * FROM order_items WHERE order_id=?',
        args: [id],
      })
    ).rows;
    for (const item of items) {
      if (item.content_type === 'image') {
        const image = (
          await tx.execute({
            sql: 'SELECT price_cents FROM images WHERE id=?',
            args: [item.content_id],
          })
        ).rows[0];
        if (!image || Number(image.price_cents) === 0)
          error(
            409,
            'An image is now included with the chapter. Cancel this request and obtain a fresh quote.',
          );
      }
      const existing = (
        await tx.execute({
          sql: 'SELECT id FROM entitlements WHERE user_id=? AND content_type=? AND content_id=? AND revoked_at IS NULL',
          args: [order.user_id, item.content_type, item.content_id],
        })
      ).rows;
      if (existing.length)
        error(
          409,
          'Access changed since this request. Cancel it and ask the reader to request a fresh quote.',
        );
    }
    const now = new Date().toISOString();
    for (const item of items)
      await tx.execute({
        sql: 'INSERT INTO entitlements(id,user_id,content_type,content_id,credit_cents,order_id,created_at) VALUES(?,?,?,?,?,?,?)',
        args: [
          crypto.randomUUID(),
          order.user_id,
          item.content_type,
          item.content_id,
          complimentary ? 0 : item.credit_cents,
          id,
          now,
        ],
      });
    await tx.execute({
      sql: "UPDATE orders SET status='fulfilled',reference=? WHERE id=?",
      args: [reference, id],
    });
    await tx.execute({
      sql: 'INSERT INTO audit_log(id,actor_user_id,action,target_type,target_id,metadata_json,created_at) VALUES(?,?,?,?,?,?,?)',
      args: [
        crypto.randomUUID(),
        actorId,
        complimentary ? 'access.gifted' : 'payment.confirmed',
        'order',
        id,
        JSON.stringify({ reference }),
        now,
      ],
    });
    await tx.commit();
  } catch (e) {
    await tx.rollback();
    throw e;
  } finally {
    tx.close();
  }
}
