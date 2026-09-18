import { IOrderTrackingDetail } from "@/lib/utils/interfaces/order-tracking-detail.interface";

export default function OrderHandoverCard({
  order,
}: {
  order: IOrderTrackingDetail;
}) {
  if (["DELIVERED", "COMPLETED", "CANCELLED"].includes(order.orderStatus))
    return null;
  const codeReady =
    !order.isPickedUp &&
    !!order.deliveryOtp &&
    ["ACCEPTED", "ASSIGNED", "PICKED"].includes(order.orderStatus);
  return (
    <section
      className="rounded-2xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-900 dark:bg-slate-800"
      aria-label="Order handover"
    >
      <h2 className="text-base font-semibold text-slate-900 dark:text-white">
        {order.isPickedUp ? "Pickup instructions" : "Delivery OTP"}
      </h2>
      {codeReady ? (
        <>
          <p className="my-2 text-3xl font-bold tracking-[0.3em] text-blue-700 dark:text-blue-300">
            {order.deliveryOtp}
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Share this code only when your order arrives. It confirms delivery,
            not payment.
          </p>
        </>
      ) : (
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          {order.isPickedUp
            ? `Collect from ${order.restaurant?.name}. Show order ${order.orderId} at the store when it is ready.`
            : "Your delivery code will appear here once the store has accepted the order and generated it."}
        </p>
      )}
      {order.paymentMethod === "COD" && order.paymentStatus !== "PAID" && (
        <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          {order.isPickedUp
            ? "Cash is payable at the store on collection."
            : "Cash is payable on delivery. Your payment status will update when collection is recorded."}
        </p>
      )}
    </section>
  );
}
