import { redirect } from "@sveltejs/kit";
const load = () => {
  throw redirect(303, "/dashboard");
};
export {
  load
};
