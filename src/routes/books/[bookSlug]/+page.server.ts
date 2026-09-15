import { owns } from '$lib/server/ownership';
import { getBook, listChapters } from '$lib/server/content';
export const load = async ({ params, locals }) => {
  const book = await getBook(
    params.bookSlug,
    locals.user?.role,
    locals.user?.id,
  );
  const chapters = await listChapters(
    book.id,
    locals.user?.role,
    locals.user?.id,
  );
  return {
    book,
    chapters: await Promise.all(
      chapters.map(async (c) => ({
        ...c,
        owned: await owns(locals.user?.id, 'chapter', c.id),
      })),
    ),
  };
};
