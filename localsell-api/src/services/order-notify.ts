/**
 * WhatsApp notifications for the order lifecycle. Every function here is
 * fire-and-forget: it loads what it needs, sends via the Cloud API (or no-ops
 * when WhatsApp isn't configured / a recipient has no phone), and never throws
 * back into the order mutation. Templates + variable order: LOCALSELL_WHATSAPP.md.
 */
import { prisma } from '../prisma/client';
import { sendWhatsAppTemplateAsync } from '../utils/notifications';

export type OrderNotifyEvent =
  | 'PLACED'
  | 'CONFIRMED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RIDER_ASSIGNED';

const money = (n: number) => `₹${Math.round(n)}`;
const paymentLabel = (m: string) => (m?.toUpperCase() === 'COD' ? 'Cash on delivery' : m || 'Online');
const firstName = (name?: string | null) => (name?.trim().split(/\s+/)[0] || 'there');
const shortArea = (a?: { label?: string | null; details?: string | null; deliveryAddress?: string | null } | null) =>
  (a?.label || a?.details || a?.deliveryAddress || 'the delivery address').toString().slice(0, 60);

export function notifyOrderEvent(orderDbId: string, event: OrderNotifyEvent): void {
  // Defer past the current mutation's own follow-up work — this is a
  // best-effort side effect, never on the response's critical path.
  setImmediate(() => {
    void run(orderDbId, event).catch((err) =>
      console.error(`[order-notify] ${event} for ${orderDbId} failed:`, (err as Error).message),
    );
  });
}

async function run(orderDbId: string, event: OrderNotifyEvent): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderDbId },
    include: {
      user: { select: { id: true, name: true, phone: true } },
      rider: { select: { id: true, name: true, phone: true } },
      address: { select: { label: true, details: true, deliveryAddress: true } },
      restaurant: { select: { name: true, city: true, address: true, owner: { select: { id: true, name: true, phone: true } } } },
      items: { select: { quantity: true } },
    },
  });
  if (!order) return;

  const customer = order.user;
  const store = order.restaurant;
  const storeName = store?.name ?? 'the store';
  const num = order.orderId;

  switch (event) {
    case 'PLACED': {
      sendWhatsAppTemplateAsync('order_placed', customer?.phone, [
        firstName(customer?.name), num, storeName, money(order.orderAmount),
      ], { purpose: 'ORDER_UPDATE', userId: customer?.id, userType: 'CUSTOMER' });

      const itemCount = order.items.reduce((n, i) => n + i.quantity, 0);
      sendWhatsAppTemplateAsync('vendor_new_order', store?.owner?.phone, [
        num, String(itemCount), money(order.orderAmount), paymentLabel(order.paymentMethod),
      ], { purpose: 'ORDER_UPDATE', userId: store?.owner?.id, userType: 'VENDOR' });
      return;
    }
    case 'CONFIRMED':
      sendWhatsAppTemplateAsync('order_confirmed', customer?.phone, [
        firstName(customer?.name), num, storeName, order.preparationTime || '30',
      ], { purpose: 'ORDER_UPDATE', userId: customer?.id, userType: 'CUSTOMER' });
      return;

    case 'OUT_FOR_DELIVERY':
      // Code is deliberately not in the message (see whatsappTemplates.ts) —
      // the customer reads it off their order screen.
      sendWhatsAppTemplateAsync('order_out_for_delivery', customer?.phone, [
        firstName(customer?.name), num, storeName,
      ], { purpose: 'ORDER_UPDATE', userId: customer?.id, userType: 'CUSTOMER' });
      return;

    case 'DELIVERED': {
      const paid = order.paymentMethod?.toUpperCase() === 'COD' ? 'cash collected' : 'paid';
      sendWhatsAppTemplateAsync('order_delivered', customer?.phone, [
        firstName(customer?.name), num, storeName, `${money(order.orderAmount)}, ${paid}`,
      ], { purpose: 'ORDER_UPDATE', userId: customer?.id, userType: 'CUSTOMER' });
      return;
    }
    case 'CANCELLED':
      sendWhatsAppTemplateAsync('order_cancelled', customer?.phone, [
        firstName(customer?.name), num, storeName, order.reason?.slice(0, 60) || 'Not specified',
      ], { purpose: 'ORDER_UPDATE', userId: customer?.id, userType: 'CUSTOMER' });
      return;

    case 'RIDER_ASSIGNED': {
      if (!order.rider) return;
      const storeNameArea = [storeName, store?.city || store?.address?.slice(0, 30)].filter(Boolean).join(', ');
      sendWhatsAppTemplateAsync('rider_assigned', order.rider.phone, [
        firstName(order.rider.name), num, storeNameArea, shortArea(order.address),
      ], { purpose: 'ORDER_UPDATE', userId: order.rider.id, userType: 'RIDER' });
      return;
    }
  }
}
