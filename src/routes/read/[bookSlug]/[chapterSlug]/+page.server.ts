import { chapterImages } from '$lib/server/images';
import { bundlePrice } from '$lib/pricing';
import { canEditBook } from '$lib/server/book-access';
import { owns } from '$lib/server/ownership';
import { getBook, listChapters } from '$lib/server/content';
import { redirect } from '@sveltejs/kit';
import { readChapter } from '$lib/server/content';
import { renderMarkdown } from '$lib/server/markdown';
export const load = async ({ params, locals }) => {
  const book = await getBook(
    params.bookSlug,
    locals.user?.role,
    locals.user?.id,
  );
  const manager = await canEditBook(
    book.id,
    locals.user?.role,
    locals.user?.id,
  );
  const chapter = (
    await listChapters(book.id, locals.user?.role, locals.user?.id)
  ).find((c) => c.slug === params.chapterSlug);
  if (
    chapter &&
    !chapter.is_free &&
    !manager &&
    !(await owns(locals.user?.id, 'chapter', chapter.id))
  )
    redirect(303, `/unlock/${chapter.id}`);
  const { markdown, ...data } = await readChapter(
    params.bookSlug,
    params.chapterSlug,
    locals.user?.role,
    locals.user?.id,
  );
  const images = await chapterImages(data.chapter.id, locals.user?.id);
  const byId = new Map(images.map((i) => [i.id, i]));
  const parts: (
    | { html: string; image: null }
    | { html: null; image: (typeof images)[number] }
  )[] = [];
  // Only standalone asset references become illustrations; ordinary Markdown
  // continues through the existing sanitizer. Never interpolate user HTML.
  const pattern = /^!\[[^\]\n]*\]\(asset:([a-f0-9-]{36})\)[ \t]*$/gm;
  let cursor = 0;
  for (const match of markdown.matchAll(pattern)) {
    parts.push({
      html: renderMarkdown(markdown.slice(cursor, match.index)),
      image: null,
    });
    const image = byId.get(match[1]);
    if (image)
      parts.push({
        html: null,
        image: {
          ...image,
          owned: image.owned || manager || image.price_cents === 0,
        },
      });
    cursor = match.index! + match[0].length;
  }
  parts.push({ html: renderMarkdown(markdown.slice(cursor)), image: null });
  return {
    ...data,
    parts,
    remaining: images.filter((i) => !i.owned && i.price_cents > 0).length,
    bundle: bundlePrice(data.chapter.image_bundle_cents, images),
    manager: manager,
  };
};
