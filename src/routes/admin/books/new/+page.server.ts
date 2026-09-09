import { saveContent } from '$lib/server/editor';
import { redirect } from '@sveltejs/kit';
export const actions = {
  default: async ({ request, locals }) => {
    const result = await saveContent(
      locals.user,
      await request.formData(),
      'book',
    );
    if (result.failure) return result.failure;
    redirect(303, `/admin/books/${result.id}`);
  },
};
