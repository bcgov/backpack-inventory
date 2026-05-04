import { eq } from 'drizzle-orm';
import { ROLE_PERMISSIONS } from '$lib/types.js';
import type { SessionUser } from '$lib/types.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDB = any; type AnySchema = any;

export type EmailTemplateKey = 'order_placed' | 'order_cancelled';

export async function getTemplate(
  db: AnyDB, schema: AnySchema, key: EmailTemplateKey,
): Promise<{ subject: string; body: string }> {
  const [row] = await db
    .select({ subject: schema.emailTemplates.subject, body: schema.emailTemplates.body })
    .from(schema.emailTemplates)
    .where(eq(schema.emailTemplates.key, key))
    .limit(1);
  if (!row) throw new Error(`Template not found: ${key}`);
  return row;
}

export async function setTemplate(
  db: AnyDB, schema: AnySchema, user: SessionUser, key: EmailTemplateKey,
  input: { subject: string; body: string },
): Promise<void> {
  if (!ROLE_PERMISSIONS[user.role].has('manage_email_settings')) {
    throw new Error(`Your role (${user.role}) does not have permission to manage email settings`);
  }
  const now = new Date().toISOString();
  await db
    .update(schema.emailTemplates)
    .set({ subject: input.subject, body: input.body, updatedAt: now })
    .where(eq(schema.emailTemplates.key, key));
}

export function renderTemplate(
  template: { subject: string; body: string },
  vars: Record<string, string>,
): { subject: string; body: string } {
  function sub(s: string): string {
    return s.replace(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`));
  }
  return { subject: sub(template.subject), body: sub(template.body) };
}
