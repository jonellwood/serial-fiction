import { editBook, saveContent } from '$lib/server/editor';
import { listChapters } from '$lib/server/content';
import { requireAuthor } from '$lib/server/access';
export const load = async ({ params, locals }) => {
  const user = requireAuthor(locals.user);
  return {
    book: await editBook(params.bookId),
    chapters: await listChapters(params.bookId, user.role),
  };
};
export const actions = {
  default: async ({ params, request, locals }) => {
    const result = await saveContent(
      locals.user,
      await request.formData(),
      'book',
      params.bookId,
    );
    return result.failure || { message: 'Book saved.' };
  },
};
