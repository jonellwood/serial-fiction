import { listBooks } from '$lib/server/content';
import { requireAuthor } from '$lib/server/access';
export const load = async ({ locals }) => {
  requireAuthor(locals.user);
  return { books: await listBooks(true) };
};
