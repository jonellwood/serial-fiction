import { redirect } from '@sveltejs/kit';
export const load = ({ locals }) => {
  if (!locals.user) redirect(303, '/login?next=/account');
  return { user: locals.user };
};
