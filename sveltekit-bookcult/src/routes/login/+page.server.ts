import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const session = await locals.safeGetSession();

  // Redirect to discover if already authenticated
  if (session?.user) {
    throw redirect(303, '/discover');
  }

  return {};
};
