import { useEffect, useMemo, useRef, useState } from "react";
import { useApolloClient, useQuery } from "@apollo/client";
import { useTranslation } from "react-i18next";
import { ORDERS_BY_REST_ID } from "@/lib/apollo/queries/orders";
import { useUserContext } from "@/lib/context/global/user.context";
import { useCurrency } from "@/lib/utils/methods/use-currency";
import { IOrder } from "@/lib/utils/interfaces/order.interface";

type HistoryOrder = Pick<
  IOrder,
  | "_id"
  | "orderId"
  | "createdAt"
  | "orderStatus"
  | "paymentMethod"
  | "orderAmount"
  | "deliveryMode"
  | "isPickedUp"
  | "reason"
  | "deliveryCharges"
  | "taxationAmount"
  | "tipping"
  | "discountAmount"
> & {
  user?: { name?: string; phone?: string };
  items?: { _id: string; title: string; quantity: number }[];
};
type Result = {
  ordersByRestId: {
    orders: HistoryOrder[];
    totalCount: number;
    totalPages: number;
  };
};
const mode = (o: HistoryOrder) =>
  o.deliveryMode === "PICKUP" || (!o.deliveryMode && o.isPickedUp)
    ? "Pickup"
    : o.deliveryMode === "SELF"
      ? "Self delivery"
      : "Localsell delivery";
const date = (value: string) => {
  const d = new Date(/^\d+$/.test(value) ? Number(value) : value);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
};
const csv = (value: unknown) => {
  const text = String(value ?? "");
  return (
    '"' +
    (/^[=+@\-\t\r]/.test(text) ? "'" + text : text).replace(/"/g, '""') +
    '"'
  );
};

export default function WebOrderHistory({
  onTransactions,
}: {
  onTransactions: () => void;
}) {
  const { t } = useTranslation();
  const { userId } = useUserContext();
  const { format } = useCurrency();
  const client = useApolloClient();
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [range, setRange] = useState("7");
  const [status, setStatus] = useState("DELIVERED");
  const [fulfilment, setFulfilment] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState(10);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [selected, setSelected] = useState<HistoryOrder | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(input.trim().replace(/^#/, ""));
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [input]);
  useEffect(() => {
    if (selected) dialog.current?.showModal();
  }, [selected]);
  const starting = useMemo(() => {
    if (range === "ALL") return undefined;
    const d = new Date();
    d.setDate(d.getDate() - Number(range));
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, [range]);
  const filters = {
    restaurant: userId,
    search: search || undefined,
    starting_date: starting,
    orderStatus:
      status === "DELIVERED"
        ? ["DELIVERED", "COMPLETED"]
        : status
          ? [status]
          : ["DELIVERED", "COMPLETED", "CANCELLED"],
    deliveryMode: fulfilment ? [fulfilment] : undefined,
  };
  const { data, loading, error, refetch } = useQuery<Result>(
    ORDERS_BY_REST_ID,
    {
      variables: { ...filters, page, rows },
      skip: !userId,
      fetchPolicy: "cache-and-network",
    },
  );
  const orders = data?.ordersByRestId.orders ?? [];
  const total = data?.ordersByRestId.totalCount ?? 0;
  const pages = data?.ordersByRestId.totalPages ?? 1;
  const reset = () => {
    setInput("");
    setSearch("");
    setRange("7");
    setStatus("DELIVERED");
    setFulfilment("");
    setPage(1);
  };
  const exportOrders = async () => {
    if (exporting || !userId) return;
    setExporting(true);
    setExportError("");
    try {
      const all: HistoryOrder[] = [];
      let current = 1;
      let last = 1;
      do {
        const result = await client.query<Result>({
          query: ORDERS_BY_REST_ID,
          variables: { ...filters, page: current, rows: 100 },
          fetchPolicy: "network-only",
        });
        all.push(...result.data.ordersByRestId.orders);
        last = result.data.ordersByRestId.totalPages;
        current++;
      } while (current <= last);
      const content = [
        [
          "Order",
          "Date & time",
          "Customer",
          "Phone",
          "Items",
          "Fulfilment",
          "Payment",
          "Total",
          "Status",
        ],
        ...all.map((o) => [
          o.orderId,
          date(o.createdAt),
          o.user?.name,
          o.user?.phone,
          o.items?.length ?? 0,
          mode(o),
          o.paymentMethod,
          o.orderAmount ?? 0,
          o.orderStatus,
        ]),
      ]
        .map((row) => row.map(csv).join(","))
        .join("\r\n");
      const url = URL.createObjectURL(
        new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8;" }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `order-history-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setExportError(t("Export failed. Please try again."));
    } finally {
      setExporting(false);
    }
  };
  return (
    <section className="order-history-web">
      <style>{styles}</style>
      <header className="oh-heading">
        <div>
          <h1>{t("Order History")}</h1>
          <p>{t("Review completed and cancelled orders.")}</p>
        </div>
        <div className="oh-actions">
          <button className="oh-link" onClick={onTransactions}>
            {t("Transactions")}
          </button>
          <button
            className="oh-outline"
            disabled={exporting || !userId || loading || !!error || !total}
            onClick={() => void exportOrders()}
          >
            <span aria-hidden="true">⇩</span>{" "}
            {t(exporting ? "Exporting…" : "Export orders")}
          </button>
        </div>
      </header>
      <div className="oh-toolbar">
        <label className="oh-search">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            aria-hidden="true"
          >
            <circle cx="10.5" cy="10.5" r="7.5" />
            <path d="m16 16 5 5" />
          </svg>
          <input
            aria-label={t("Search order ID or customer")}
            placeholder={t("Search order ID or customer")}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </label>
        <div className="oh-ranges" aria-label={t("Date range")}>
          {["7", "30", "90", "ALL"].map((r) => (
            <button
              key={r}
              aria-pressed={range === r}
              className={range === r ? "active" : ""}
              onClick={() => {
                setRange(r);
                setPage(1);
              }}
            >
              {r === "ALL"
                ? t("All time")
                : t("{{count}} days", { count: Number(r) })}
            </button>
          ))}
        </div>
        <select
          aria-label={t("Order status")}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">{t("All statuses")}</option>
          <option value="DELIVERED">{t("Delivered")}</option>
          <option value="CANCELLED">{t("Cancelled")}</option>
        </select>
        <select
          aria-label={t("Fulfilment")}
          value={fulfilment}
          onChange={(e) => {
            setFulfilment(e.target.value);
            setPage(1);
          }}
        >
          <option value="">{t("All fulfilment")}</option>
          <option value="PICKUP">{t("Pickup")}</option>
          <option value="SELF">{t("Self delivery")}</option>
          <option value="PLATFORM">{t("Localsell delivery")}</option>
        </select>
        <button
          className="oh-reset"
          title={t("Reset filters")}
          aria-label={t("Reset filters")}
          onClick={reset}
        >
          ↺
        </button>
      </div>
      <div className="oh-count" role="status">
        {loading
          ? t("Loading orders…")
          : t("{{count}} orders", { count: total })}
      </div>
      {exportError && (
        <p role="alert" className="oh-error">
          {exportError}
        </p>
      )}
      <div className="oh-card" aria-busy={loading}>
        <div className="oh-scroll">
          <table>
            <thead>
              <tr>
                {[
                  "Order",
                  "Date & time",
                  "Customer",
                  "Items",
                  "Fulfilment",
                  "Payment",
                  "Total",
                  "Status",
                  "Actions",
                ].map((label) => (
                  <th
                    key={label}
                    className={label === "Total" ? "oh-number" : ""}
                  >
                    {t(label)}
                    {label === "Date & time" && (
                      <span title={t("Newest first")} className="oh-sort">
                        ⌄
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!error &&
                orders.map((o) => (
                  <tr key={o._id}>
                    <td>
                      <button
                        className="oh-link oh-id"
                        onClick={() => setSelected(o)}
                      >
                        #{o.orderId.replace(/^#/, "")}
                      </button>
                    </td>
                    <td className="oh-date">{date(o.createdAt)}</td>
                    <td>
                      <span className="oh-customer">
                        {o.user?.name || t("Customer")}
                      </span>
                      <span className="oh-phone">{o.user?.phone || "—"}</span>
                    </td>
                    <td>
                      {t(
                        (o.items?.length ?? 0) === 1
                          ? "1 item"
                          : "{{count}} items",
                        { count: o.items?.length ?? 0 },
                      )}
                    </td>
                    <td>{t(mode(o))}</td>
                    <td>
                      {o.paymentMethod === "COD"
                        ? "COD"
                        : o.paymentMethod || "—"}
                    </td>
                    <td className="oh-number">{format(o.orderAmount ?? 0)}</td>
                    <td>
                      <span
                        className={`oh-badge ${o.orderStatus === "CANCELLED" ? "cancelled" : ""}`}
                      >
                        {t(
                          o.orderStatus === "COMPLETED"
                            ? "DELIVERED"
                            : o.orderStatus || "",
                        )}
                      </span>
                    </td>
                    <td>
                      <button
                        className="oh-view"
                        aria-label={t("View order {{id}}", { id: o.orderId })}
                        onClick={() => setSelected(o)}
                      >
                        {t("View")}
                      </button>
                    </td>
                  </tr>
                ))}
              {(error || !orders.length) && (
                <tr>
                  <td colSpan={9} className="oh-empty">
                    {error ? (
                      <>
                        <p role="alert">{t("Unable to load orders.")}</p>
                        <button
                          className="oh-outline"
                          onClick={() => void refetch()}
                        >
                          {t("Retry")}
                        </button>
                      </>
                    ) : loading ? (
                      t("Loading orders…")
                    ) : (
                      <>
                        <strong>{t("No orders found")}</strong>
                        <p>
                          {t(
                            "Try a different date range or clear your filters.",
                          )}
                        </p>
                        <button className="oh-outline" onClick={reset}>
                          {t("Reset filters")}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <footer className="oh-footer">
          <span>
            {t("Showing {{start}}–{{end}} of {{total}} orders", {
              start: total ? (page - 1) * rows + 1 : 0,
              end: Math.min(page * rows, total),
              total,
            })}
          </span>
          <div className="oh-pagination">
            <label>
              {t("Rows per page")}{" "}
              <select
                value={rows}
                onChange={(e) => {
                  setRows(Number(e.target.value));
                  setPage(1);
                }}
              >
                {[10, 25, 50].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
            <button
              aria-label={t("Previous page")}
              disabled={page <= 1 || loading}
              onClick={() => setPage(page - 1)}
            >
              ‹
            </button>
            <span className="oh-page" aria-current="page">
              {page}
            </span>
            <button
              aria-label={t("Next page")}
              disabled={page >= pages || loading}
              onClick={() => setPage(page + 1)}
            >
              ›
            </button>
          </div>
        </footer>
      </div>
      <dialog
        ref={dialog}
        className="oh-detail"
        onCancel={() => setSelected(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            dialog.current?.close();
            setSelected(null);
          }
        }}
      >
        {selected && (
          <>
            <header>
              <div>
                <h2>{t("Order details")}</h2>
                <p>#{selected.orderId}</p>
              </div>
              <button
                aria-label={t("Close order details")}
                onClick={() => {
                  dialog.current?.close();
                  setSelected(null);
                }}
              >
                ×
              </button>
            </header>
            <p>
              <strong>{selected.user?.name}</strong>
              <br />
              {selected.user?.phone}
            </p>
            <p>
              {date(selected.createdAt)} · {t(mode(selected))}
            </p>
            <p>
              {t(selected.orderStatus || "")} · {selected.paymentMethod}
            </p>
            <ul>
              {selected.items?.map((item) => (
                <li key={item._id}>
                  {item.quantity} × {item.title}
                </li>
              ))}
            </ul>
            <dl>
              {[
                ["Tax", selected.taxationAmount],
                ["Delivery charges", selected.deliveryCharges],
                ["Tip", selected.tipping],
                ["Discount", selected.discountAmount],
                ["Total", selected.orderAmount],
              ].map(([label, amount]) => (
                <div key={label}>
                  <dt>{t(String(label))}</dt>
                  <dd>{format(Number(amount) || 0)}</dd>
                </div>
              ))}
            </dl>
            {selected.reason && (
              <p>
                {t("Cancellation reason")}: {selected.reason}
              </p>
            )}
          </>
        )}
      </dialog>
    </section>
  );
}

const styles = `
.order-history-web{box-sizing:border-box;overflow:auto;flex:1;width:100%;padding:26px 22px 30px;background:linear-gradient(125deg,#f3f8ff,#edf4fc);color:#20314d;font-family:Inter,system-ui,-apple-system,sans-serif;font-size:12px;min-height:0}
.order-history-web *{box-sizing:border-box}.order-history-web button,.order-history-web input,.order-history-web select{font:inherit}.order-history-web button{cursor:pointer;transition:background .15s}.order-history-web button:disabled{cursor:default;opacity:.4}.order-history-web button:focus-visible,.order-history-web input:focus-visible,.order-history-web select:focus-visible{outline:2px solid #1559e9;outline-offset:3px}.order-history-web button:hover:not(:disabled){filter:brightness(.96)}
.oh-heading{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;margin:0 3px 20px}.oh-heading h1{font-size:25px;letter-spacing:-.7px;line-height:1.25;margin:0 0 5px;font-weight:750;color:#122b49}.oh-heading p{font-size:13px;color:#687b9b;margin:0}.oh-actions{display:flex;align-items:center;gap:16px}.oh-outline,.oh-view{border:1px solid #5685ff;background:white;color:#0759f5;border-radius:6px;font-weight:600!important;padding:9px 16px}.oh-outline span{font-size:19px;margin-right:7px}.oh-link{border:0;background:none;color:#0760ff;padding:0;text-align:left}.oh-id{font-weight:650!important;white-space:nowrap}
.oh-toolbar{display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:14px;background:#fff;border:1px solid #e0e8f4;border-radius:7px}.oh-search{height:36px;display:flex;align-items:center;gap:10px;flex:1;min-width:210px;border:1px solid #d9e2f0;border-radius:6px;padding:0 11px;color:#7c8da9}.oh-search input{border:0;outline:none;background:transparent;width:100%;color:#20314d}.oh-search input::placeholder{color:#7383a0}.oh-ranges{display:flex;border:1px solid #dce4f0;border-radius:5px;overflow:hidden;height:35px}.oh-ranges button{border:0;border-right:1px solid #e5ebf5;background:#fff;color:#6b7d9a;padding:0 20px;white-space:nowrap}.oh-ranges button:last-child{border:0}.oh-ranges button.active{background:#1057e9;color:#fff;border-radius:4px}.order-history-web select{height:35px;border:1px solid #d9e2f0;background:#fff;color:#34445e;border-radius:6px;padding:0 30px 0 12px}.oh-toolbar select{min-width:145px}.oh-reset{width:40px;height:35px;background:white;border:1px solid #d9e2f0;border-radius:6px;color:#617591;font-size:20px!important}.oh-count{text-align:right;color:#7d8da7;margin:12px 0 10px}.oh-card{background:#fff;border:1px solid #e0e8f4;border-radius:7px;padding:10px 11px 0;box-shadow:0 8px 24px #24467904}.oh-scroll{overflow-x:auto}.oh-card table{border-collapse:collapse;width:100%;text-align:left;white-space:nowrap}.oh-card th{font-size:11px;font-weight:650;background:#ebf1f8;color:#344967;height:37px;padding:10px 12px}.oh-card th:first-child{border-radius:5px 0 0 0}.oh-card th:last-child{border-radius:0 5px 0 0}.oh-card td{padding:10px 12px;height:49px;border-bottom:1px solid #eaf0f7;font-size:12px}.oh-card tbody tr:hover{background:#fafcff}.oh-sort{margin-left:8px}.oh-customer{display:block;font-weight:500}.oh-phone{display:block;color:#6c7f9f;margin-top:3px}.oh-date{white-space:nowrap}.oh-number{text-align:right}.oh-badge{display:inline-block;border-radius:7px;background:#d3f5df;color:#11933f;font-size:10px;font-weight:650;padding:5px 9px}.oh-badge.cancelled{background:#fee5e5;color:#bc3535}.oh-view{padding:6px 20px;min-width:68px}.oh-footer{padding:15px 7px;display:flex;justify-content:space-between;align-items:center;gap:16px;color:#647694;min-height:64px}.oh-pagination{display:flex;align-items:center;gap:13px}.oh-pagination label{display:flex;align-items:center;gap:12px;margin-right:17px}.oh-pagination button,.oh-page{display:grid;place-items:center;width:33px;height:33px;background:white;border:1px solid #dbe4f1;border-radius:6px;color:#667b9e;font-size:20px}.oh-pagination button:disabled{background:#f0f3f8}.oh-page{font-size:13px;color:#1559e9;border-color:#5685ff}.oh-empty{text-align:center;padding:50px!important;color:#6b7d99;white-space:normal}.oh-error{color:#bb3030}.oh-detail{width:min(480px,calc(100% - 32px));border:1px solid #e0e8f4;border-radius:12px;padding:24px;color:#20314d;max-height:85vh;overflow:auto;box-shadow:0 20px 80px #122b4940}.oh-detail::backdrop{background:#18304770}.oh-detail header{display:flex;justify-content:space-between}.oh-detail h2{margin:0}.oh-detail header button{border:0;background:none;font-size:25px;align-self:flex-start;color:#526785}.oh-detail p{line-height:1.7}.oh-detail ul{padding:16px 20px;background:#f3f7fc;border-radius:8px;line-height:2}.oh-detail dl div{display:flex;justify-content:space-between;padding:8px 0}.oh-detail dl div:last-child{border-top:1px solid #dce4f0;font-weight:700}
@media(min-width:1500px){.order-history-web{padding:32px 40px}.oh-toolbar{gap:18px}.oh-card td{height:55px}}@media(max-width:700px){.order-history-web{padding:20px 12px}.oh-heading{flex-wrap:wrap}.oh-heading h1{font-size:23px}.oh-actions{width:100%;justify-content:space-between}.oh-search{flex-basis:100%}.oh-ranges{width:100%}.oh-ranges button{flex:1;padding:0 12px}.oh-toolbar{gap:10px}.oh-toolbar select{flex:1;min-width:120px}.oh-footer{align-items:flex-start;flex-direction:column}.oh-pagination{width:100%;justify-content:flex-end}.oh-pagination label{margin-right:auto}}
`;
