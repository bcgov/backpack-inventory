import { redirect } from "@sveltejs/kit";
const load = async ({ locals }) => {
  if (!locals.user) throw redirect(303, "/auth/signin");
  return { user: locals.user };
};
export {
  load
};
