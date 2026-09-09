import { readChapter } from '$lib/server/content';
import { renderMarkdown } from '$lib/server/markdown';
export const load = async ({ params, locals }) => {
  const { markdown, ...data } = await readChapter(
    params.bookSlug,
    params.chapterSlug,
    locals.user?.role,
  );
  return { ...data, html: renderMarkdown(markdown) };
};
