import { chapterImages } from '$lib/server/images';
import {
  putImage,
  deleteImage,
  imageStorageAvailable,
} from '$lib/server/storage';
import { client } from '$lib/server/db';
import { cents } from '$lib/pricing';
import { prepareImage } from '$lib/server/image-processing';
import { editBook, editChapter, saveContent } from '$lib/server/editor';
import { requireAuthor } from '$lib/server/access';
import { renderMarkdown } from '$lib/server/markdown';
import { fail, redirect } from '@sveltejs/kit';
export const load = async ({ params, locals }) => {
  requireAuthor(locals.user);
  await editBook(params.bookId, locals.user);
  return {
    imageStorageAvailable: imageStorageAvailable(),
    images:
      params.chapterId === 'new' ? [] : await chapterImages(params.chapterId),
    book: await editBook(params.bookId, locals.user),
    chapter:
      params.chapterId === 'new'
        ? null
        : await editChapter(params.bookId, params.chapterId, locals.user),
  };
};
export const actions = {
  imageDetails: async ({ params, request, locals }) => {
    const actor = requireAuthor(locals.user);
    await editChapter(params.bookId, params.chapterId, locals.user);
    const form = await request.formData();
    const id = String(form.get('id'));
    const caption = String(form.get('caption') || '').trim();
    let price: number;
    try {
      price = cents(String(form.get('image_price')));
    } catch {
      return fail(400, { message: 'Enter a valid image price.' });
    }
    if (!caption || caption.length > 300)
      return fail(400, { message: 'Add a caption up to 300 characters.' });
    const row = (
      await client.execute({
        sql: 'SELECT id FROM images WHERE id=? AND chapter_id=?',
        args: [id, params.chapterId],
      })
    ).rows[0];
    if (!row) return fail(404, { message: 'Image not found in this chapter.' });
    await client.batch(
      [
        {
          sql: 'UPDATE images SET caption=?,price_cents=?,ai_generated=? WHERE id=?',
          args: [caption, price, form.has('ai_generated') ? 1 : 0, id],
        },
        {
          sql: 'INSERT INTO audit_log(id,actor_user_id,action,target_type,target_id,created_at) VALUES(?,?,?,?,?,?)',
          args: [
            crypto.randomUUID(),
            actor.id,
            'image.updated',
            'image',
            id,
            new Date().toISOString(),
          ],
        },
      ],
      'write',
    );
    return {
      message:
        'Image details saved. Existing ownership and payment credits are unchanged.',
    };
  },
  upload: async ({ params, request, locals }) => {
    const actor = requireAuthor(locals.user);
    await editChapter(params.bookId, params.chapterId, locals.user);
    if (!imageStorageAvailable())
      return fail(503, {
        message:
          'Image uploads will be available once private cloud storage is configured. You can continue editing chapters.',
      });
    const form = await request.formData();
    const file = form.get('image');
    const caption = String(form.get('caption') || '').trim();
    if (
      !(file instanceof File) ||
      !file.size ||
      file.size > 3_000_000 ||
      !caption ||
      caption.length > 300
    )
      return fail(400, {
        message:
          'Choose a JPEG, PNG or WebP image under 3 MB and add a caption (up to 300 characters).',
      });
    let price: number, original: Buffer, preview: Buffer;
    try {
      price = cents(String(form.get('image_price') || '9.99'));
      const input = Buffer.from(await file.arrayBuffer());
      ({ original, preview } = await prepareImage(input));
    } catch {
      return fail(400, {
        message:
          'Use a valid still JPEG, PNG or WebP under 25 megapixels and a valid price.',
      });
    }
    const id = crypto.randomUUID();
    try {
      await putImage(id, false, original);
      await putImage(id, true, preview);
      await client.batch(
        [
          {
            sql: 'INSERT INTO images(id,chapter_id,caption,price_cents,created_at,ai_generated) VALUES(?,?,?,?,?,?)',
            args: [
              id,
              params.chapterId,
              caption,
              price,
              new Date().toISOString(),
              form.has('ai_generated') ? 1 : 0,
            ],
          },
          {
            sql: 'INSERT INTO audit_log(id,actor_user_id,action,target_type,target_id,created_at) VALUES(?,?,?,?,?,?)',
            args: [
              crypto.randomUUID(),
              actor.id,
              'image.uploaded',
              'image',
              id,
              new Date().toISOString(),
            ],
          },
        ],
        'write',
      );
    } catch (e) {
      await Promise.allSettled([deleteImage(id, false), deleteImage(id, true)]);
      throw e;
    }
    return {
      message: `Image uploaded. Stored ${Math.ceil((original.length + preview.length) / 1024)} KB including the blurred preview (upload: ${Math.ceil(file.size / 1024)} KB). Insert its Markdown reference in the chapter, then save.`,
    };
  },
  save: async ({ params, request, locals }) => {
    requireAuthor(locals.user);
    await editBook(params.bookId, locals.user);
    const result = await saveContent(
      locals.user,
      await request.formData(),
      'chapter',
      params.chapterId === 'new' ? undefined : params.chapterId,
      params.bookId,
    );
    if (result.failure) return result.failure;
    redirect(
      303,
      `/admin/books/${params.bookId}/chapters/${result.id}?saved=1`,
    );
  },
  preview: async ({ request, locals }) => {
    requireAuthor(locals.user);
    const form = await request.formData();
    const source = String(form.get('content_markdown') || '');
    if (source.length > 250000)
      return fail(400, { message: 'Keep chapters below 250,000 characters.' });
    return { preview: renderMarkdown(source) };
  },
};
