import { redirect } from '@sveltejs/kit';
export const load = ({ params }) =>
  redirect(308, `/read/${params.bookSlug}/${params.chapterSlug}`);
