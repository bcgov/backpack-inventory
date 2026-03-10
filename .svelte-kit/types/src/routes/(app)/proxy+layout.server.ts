// @ts-nocheck
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load = async ({ locals }: Parameters<LayoutServerLoad>[0]) => {
  if (!locals.user) throw redirect(303, '/auth/signin');
  return { user: locals.user };
};
