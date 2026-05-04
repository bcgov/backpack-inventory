import { randomBytes, randomUUID } from 'crypto';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { ROLE_PERMISSIONS } from '$lib/types.js';
import { getOfficeIdsForUser, assertOfficeInScope } from './scope.js';
import { sendEmail } from './email.js';
import { getTemplate, renderTemplate } from './orderTemplates.js';
import type { SessionUser, OrderStatus } from '$lib/types.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDB = any; type AnySchema = any;

export interface CreateOrderInput {
  officeId: string;
  notes?: string;
  lineItems: Array<{
    productId?: string;
    isOther?: boolean;
    otherDescription?: string;
    quantityOrdered: number;
  }>;
}

export interface OrderRow {
  id: string;
  confirmationId: string;
  officeId: string;
  officeName: string;
  officeNumber: string;
  status: OrderStatus;
  createdByName: string;
  createdAt: string;
  lineItemCount: number;
}

export interface OrderDetail {
  order: {
    id: string;
    confirmationId: string;
    officeId: string;
    officeName: string;
    officeNumber: string;
    status: OrderStatus;
    notes: string | null;
    createdByName: string;
    createdAt: string;
    cancelledAt: string | null;
    cancelledByName: string | null;
    cancellationMessage: string | null;
  };
  lineItems: Array<{
    id: string;
    productId: string | null;
    productName: string | null;
    isOther: boolean;
    otherDescription: string | null;
    quantityOrdered: number;
    quantityReceived: number;
    remaining: number;
  }>;
  receiveEvents: Array<{
    id: string;
    transactionId: string;
    receivedByName: string;
    receivedAt: string;
    shippingReceiptPath: string | null;
  }>;
}

function generateConfirmationId(): string {
  return randomBytes(4).toString('hex').toUpperCase();
}

async function getRecipientsForOffice(db: AnyDB, schema: AnySchema, officeId: string): Promise<string[]> {
  const rows = await db
    .select({ email: schema.officeEmailRecipients.email })
    .from(schema.officeEmailRecipients)
    .where(eq(schema.officeEmailRecipients.officeId, officeId));
  return rows.map((r: { email: string }) => r.email);
}

async function getOfficeMeta(db: AnyDB, schema: AnySchema, officeId: string) {
  const [row] = await db
    .select({ name: schema.offices.name, officeNumber: schema.offices.officeNumber })
    .from(schema.offices)
    .where(eq(schema.offices.id, officeId))
    .limit(1);
  return row as { name: string; officeNumber: string } | undefined;
}

function formatItemList(lines: Array<{ productName?: string | null; otherDescription?: string | null; quantityOrdered: number }>): string {
  return lines.map((li) => `  - ${li.productName ?? li.otherDescription ?? 'Unknown'} × ${li.quantityOrdered}`).join('\n');
}

export async function createOrder(
  db: AnyDB, schema: AnySchema, user: SessionUser, input: CreateOrderInput,
): Promise<{ orderId: string; confirmationId: string; emailSucceeded: boolean }> {
  if (!ROLE_PERMISSIONS[user.role].has('create_order')) {
    throw new Error(`Your role (${user.role}) does not have permission to create orders`);
  }
  if (!input.lineItems.length || input.lineItems.every((l) => l.quantityOrdered <= 0)) {
    throw new Error('Order must have at least one line item with quantity > 0');
  }
  await assertOfficeInScope(db, schema, user, input.officeId);

  const orderId        = randomUUID();
  const confirmationId = generateConfirmationId();
  const now            = new Date().toISOString();

  // Resolve product names for the email body (productIds only — others use otherDescription)
  const productIds = input.lineItems.map((l) => l.productId).filter(Boolean) as string[];
  const productMap = new Map<string, string>();
  if (productIds.length) {
    const rows = await db
      .select({ id: schema.products.id, name: schema.products.name })
      .from(schema.products)
      .where(inArray(schema.products.id, productIds));
    for (const r of rows) productMap.set(r.id, r.name);
  }

  db.transaction((tx: AnyDB) => {
    tx.insert(schema.orders).values({
      id: orderId, confirmationId, officeId: input.officeId, status: 'pending',
      notes: input.notes ?? null, createdByUserId: user.id, createdAt: now,
    }).run();
    for (const li of input.lineItems) {
      if (li.quantityOrdered <= 0) continue;
      tx.insert(schema.orderLineItems).values({
        id: randomUUID(),
        orderId,
        productId: li.productId ?? null,
        isOther: li.isOther ?? false,
        otherDescription: li.otherDescription ?? null,
        quantityOrdered: li.quantityOrdered,
        quantityReceived: 0,
      }).run();
    }
  });

  // Send email (non-fatal)
  const office     = await getOfficeMeta(db, schema, input.officeId);
  const recipients = await getRecipientsForOffice(db, schema, input.officeId);
  let emailSucceeded = true;
  if (recipients.length && office) {
    const lines = input.lineItems.filter((l) => l.quantityOrdered > 0).map((l) => ({
      productName: l.productId ? productMap.get(l.productId) ?? null : null,
      otherDescription: l.otherDescription ?? null,
      quantityOrdered: l.quantityOrdered,
    }));
    const tpl = await getTemplate(db, schema, 'order_placed');
    const rendered = renderTemplate(tpl, {
      orderId: confirmationId,
      officeNumber: office.officeNumber,
      officeName: office.name,
      itemList: formatItemList(lines),
      notes: input.notes ?? '',
      createdBy: user.name,
    });
    const result = await sendEmail(db, schema, {
      to: recipients, subject: rendered.subject, body: rendered.body,
      relatedKind: 'order_placed', relatedId: orderId,
    });
    emailSucceeded = result.success;
  }

  return { orderId, confirmationId, emailSucceeded };
}

export async function listOrders(
  db: AnyDB, schema: AnySchema, user: SessionUser,
  filters: { status?: OrderStatus; officeId?: string },
): Promise<OrderRow[]> {
  const officeIds = await getOfficeIdsForUser(db, schema, user);
  if (!officeIds.length) return [];

  const conds = [inArray(schema.orders.officeId, officeIds)];
  if (filters.status)   conds.push(eq(schema.orders.status,   filters.status));
  if (filters.officeId) conds.push(eq(schema.orders.officeId, filters.officeId));

  const rows = await db
    .select({
      id:              schema.orders.id,
      confirmationId:  schema.orders.confirmationId,
      officeId:        schema.orders.officeId,
      officeName:      schema.offices.name,
      officeNumber:    schema.offices.officeNumber,
      status:          schema.orders.status,
      createdByName:   schema.users.name,
      createdAt:       schema.orders.createdAt,
    })
    .from(schema.orders)
    .innerJoin(schema.offices, eq(schema.orders.officeId, schema.offices.id))
    .innerJoin(schema.users,   eq(schema.orders.createdByUserId, schema.users.id))
    .where(and(...conds))
    .orderBy(desc(schema.orders.createdAt));

  // line item counts (single query, grouped)
  const orderIds = rows.map((r: { id: string }) => r.id);
  const counts = orderIds.length
    ? await db
        .select({
          orderId: schema.orderLineItems.orderId,
          n: schema.orderLineItems.id,
        })
        .from(schema.orderLineItems)
        .where(inArray(schema.orderLineItems.orderId, orderIds))
    : [];
  const countMap = new Map<string, number>();
  for (const c of counts) countMap.set(c.orderId, (countMap.get(c.orderId) ?? 0) + 1);

  return rows.map((r: OrderRow) => ({ ...r, lineItemCount: countMap.get(r.id) ?? 0 }));
}

export async function getOrder(
  db: AnyDB, schema: AnySchema, user: SessionUser, confirmationId: string,
): Promise<OrderDetail> {
  const [order] = await db
    .select({
      id:                  schema.orders.id,
      confirmationId:      schema.orders.confirmationId,
      officeId:            schema.orders.officeId,
      officeName:          schema.offices.name,
      officeNumber:        schema.offices.officeNumber,
      status:              schema.orders.status,
      notes:               schema.orders.notes,
      createdByName:       schema.users.name,
      createdAt:           schema.orders.createdAt,
      cancelledAt:         schema.orders.cancelledAt,
      cancelledByUserId:   schema.orders.cancelledByUserId,
      cancellationMessage: schema.orders.cancellationMessage,
    })
    .from(schema.orders)
    .innerJoin(schema.offices, eq(schema.orders.officeId, schema.offices.id))
    .innerJoin(schema.users,   eq(schema.orders.createdByUserId, schema.users.id))
    .where(eq(schema.orders.confirmationId, confirmationId))
    .limit(1);
  if (!order) throw new Error('Order not found');

  await assertOfficeInScope(db, schema, user, order.officeId);

  // cancelledByName lookup if applicable
  let cancelledByName: string | null = null;
  if (order.cancelledByUserId) {
    const [u] = await db
      .select({ name: schema.users.name })
      .from(schema.users)
      .where(eq(schema.users.id, order.cancelledByUserId))
      .limit(1);
    cancelledByName = u?.name ?? null;
  }

  const lineItemRows = await db
    .select({
      id:               schema.orderLineItems.id,
      productId:        schema.orderLineItems.productId,
      productName:      schema.products.name,
      isOther:          schema.orderLineItems.isOther,
      otherDescription: schema.orderLineItems.otherDescription,
      quantityOrdered:  schema.orderLineItems.quantityOrdered,
      quantityReceived: schema.orderLineItems.quantityReceived,
    })
    .from(schema.orderLineItems)
    .leftJoin(schema.products, eq(schema.orderLineItems.productId, schema.products.id))
    .where(eq(schema.orderLineItems.orderId, order.id));

  const receiveRows = await db
    .select({
      id:                  schema.orderReceiveEvents.id,
      transactionId:       schema.orderReceiveEvents.transactionId,
      receivedByName:      schema.users.name,
      receivedAt:          schema.orderReceiveEvents.receivedAt,
      shippingReceiptPath: schema.orderReceiveEvents.shippingReceiptPath,
    })
    .from(schema.orderReceiveEvents)
    .innerJoin(schema.users, eq(schema.orderReceiveEvents.receivedByUserId, schema.users.id))
    .where(eq(schema.orderReceiveEvents.orderId, order.id))
    .orderBy(desc(schema.orderReceiveEvents.receivedAt));

  return {
    order: {
      ...order,
      cancelledByName,
    },
    lineItems: lineItemRows.map((li: { id: string; productId: string | null; productName: string | null; isOther: boolean; otherDescription: string | null; quantityOrdered: number; quantityReceived: number }) => ({
      ...li,
      remaining: Math.max(0, li.quantityOrdered - li.quantityReceived),
    })),
    receiveEvents: receiveRows,
  };
}
