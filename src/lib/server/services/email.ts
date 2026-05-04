import { randomUUID } from 'crypto';
import nodemailer from 'nodemailer';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDB = any; type AnySchema = any;

export interface SendEmailInput {
  to: string[];
  subject: string;
  body: string;
  relatedKind: 'order_placed' | 'order_cancelled';
  relatedId: string;
}

interface Transporter {
  sendMail(opts: { from: string; to: string; subject: string; text: string }): Promise<unknown>;
}

function buildTransport(): Transporter {
  const mode = process.env.EMAIL_TRANSPORT ?? 'stub';
  if (mode === 'throwing-stub') {
    return { sendMail: async () => { throw new Error('forced stub failure'); } };
  }
  if (mode === 'stub') {
    return { sendMail: async () => ({ accepted: true }) };
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? '' }
      : undefined,
  });
}

export async function sendEmail(
  db:     AnyDB,
  schema: AnySchema,
  input:  SendEmailInput,
): Promise<{ success: boolean; error?: string }> {
  const id = randomUUID();
  const now = new Date().toISOString();

  // Insert outbox row first — durable record before SMTP attempt.
  db.insert(schema.emailOutbox).values({
    id,
    recipients:  JSON.stringify(input.to),
    subject:     input.subject,
    body:        input.body,
    sentAt:      now,
    success:     null,
    error:       null,
    relatedKind: input.relatedKind,
    relatedId:   input.relatedId,
  }).run();

  const transport = buildTransport();
  const from = process.env.EMAIL_FROM ?? 'no-reply@example.com';

  try {
    await transport.sendMail({ from, to: input.to.join(', '), subject: input.subject, text: input.body });
    db.update(schema.emailOutbox)
      .set({ success: true })
      .where(/* drizzle eq */ (await import('drizzle-orm')).eq(schema.emailOutbox.id, id))
      .run();
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    db.update(schema.emailOutbox)
      .set({ success: false, error: msg })
      .where((await import('drizzle-orm')).eq(schema.emailOutbox.id, id))
      .run();
    return { success: false, error: msg };
  }
}
