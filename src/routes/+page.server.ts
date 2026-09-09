import { listBooks } from '$lib/server/content';
export const load = async () => ({ books: await listBooks() });
