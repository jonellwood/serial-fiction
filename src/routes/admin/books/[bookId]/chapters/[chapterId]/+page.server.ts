import { editBook, editChapter, saveContent } from '$lib/server/editor';
import { requireAuthor } from '$lib/server/access';
import { renderMarkdown } from '$lib/server/markdown';
import { fail, redirect } from '@sveltejs/kit';
export const load = async ({ params, locals }) => {
  requireAuthor(locals.user);
  return {
    book: await editBook(params.bookId),
    chapter:
      params.chapterId === 'new'
        ? null
        : await editChapter(params.bookId, params.chapterId),
  };
};
export const actions = {
  save: async ({ params, request, locals }) => {
    requireAuthor(locals.user);
    await editBook(params.bookId);
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
