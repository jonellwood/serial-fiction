import { getBook, listChapters } from '$lib/server/content';
export const load = async ({ params, locals }) => {
  const book = await getBook(params.bookSlug, locals.user?.role);
  return { book, chapters: await listChapters(book.id, locals.user?.role) };
};
