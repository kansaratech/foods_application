"use client";
import type { IOrderTrackingDetail } from "@/lib/utils/interfaces/order-tracking-detail.interface";
import { FiPhone, FiShoppingBag, FiTruck } from "react-icons/fi";

export function phoneLink(phone?: string | null): string | null {
  if (!phone || !/^[+\d\s().-]+$/.test(phone)) return null;
  const normalized = phone.replace(/[\s().-]/g, "");
  return /^\+?\d{7,15}$/.test(normalized) ? `tel:${normalized}` : null;
}

export default function OrderContactCard({ order }: { order: IOrderTrackingDetail }) {
  if (["DELIVERED", "COMPLETED", "CANCELLED"].includes(order.orderStatus)) return null;
  const contacts = [
    { key: "store", label: "Restaurant / store", name: order.restaurant?.name, phone: order.restaurant?.phone, action: "Call restaurant / store", icon: FiShoppingBag, unavailable: "Phone number unavailable. Use Get Help for assistance." },
    ...(!order.isPickedUp ? [{ key: "rider", label: "Delivery rider", name: order.rider?.name, phone: order.rider?.phone, action: "Call rider", icon: FiTruck, unavailable: order.rider?._id ? "Phone number unavailable. Use rider chat or Get Help." : "Contact details will appear when a rider is assigned." }] : []),
  ];
  return (
    <section aria-label="Contact your order team" className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-gray-900">
      <h2 className="mb-1 text-base font-semibold text-slate-900 dark:text-white">Need an order update?</h2>
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">Call for updates or help with delivery directions.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {contacts.map(({ key, label, name, phone, action, icon: Icon, unavailable }) => {
          const href = phoneLink(phone);
          return (
            <div key={key} className="flex min-w-0 flex-col rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400"><Icon aria-hidden="true" />{label}</div>
              {name && <p className="mt-1 break-words text-sm font-semibold text-slate-900 dark:text-white">{name}</p>}
              {href ? <><p className="mb-3 mt-1 text-sm text-slate-500 dark:text-slate-400">{phone}</p><a href={href} className="mt-auto flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary-color px-3 py-2 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"><FiPhone aria-hidden="true" />{action}</a></> : <p className="mt-2 text-sm leading-5 text-slate-500 dark:text-slate-400">{unavailable}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
