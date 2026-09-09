import { requireAuthor } from '$lib/server/access';
export const load = ({ locals }) => ({ author: requireAuthor(locals.user) });
