import { error, json } from "@sveltejs/kit";
import { g as getDb, a as getSchema } from "../../../../chunks/index2.js";
import { c as createTransaction } from "../../../../chunks/transactions.js";
const POST = async ({ locals, request }) => {
  if (!locals.user) throw error(401, "Unauthorized");
  let body;
  try {
    body = await request.json();
  } catch {
    throw error(400, "Invalid JSON body");
  }
  const db = await getDb();
  const schema = await getSchema();
  try {
    const result = await createTransaction(db, schema, locals.user, body);
    return json(result, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    throw error(400, msg);
  }
};
export {
  POST
};
