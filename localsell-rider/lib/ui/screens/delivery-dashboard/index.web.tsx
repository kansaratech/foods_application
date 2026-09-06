import { ReactNode, useContext, useEffect, useRef, useState } from "react";
import { Href, router, usePathname } from "expo-router";
import { useMutation, useQuery } from "@apollo/client";
import { useTranslation } from "react-i18next";
import PerfectScrollbar from "perfect-scrollbar";
import UserContext from "@/lib/context/global/user.context";
import { AuthContext } from "@/lib/context/global/auth.context";
import { UPDATE_AVAILABILITY } from "@/lib/apollo/mutations/rider.mutation";
import { ASSIGN_ORDER } from "@/lib/apollo/mutations/order.mutation";
import { RIDER_CASH_SUMMARY } from "@/lib/apollo/queries";
import { useCurrency } from "@/lib/utils/methods/use-currency";
import { IOrder } from "@/lib/utils/interfaces/order.interface";
import { calculateDistance } from "@/lib/utils/methods/custom-functions";

/**
 * Attach perfect-scrollbar to an element and keep it in sync. Returns a ref to
 * put on the scroll container (which needs a bounded height + overflow:auto).
 */
function usePerfectScrollbar<T extends HTMLElement>(deps: unknown[] = []) {
  const ref = useRef<T>(null);
  const ps = useRef<PerfectScrollbar | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    ps.current = new PerfectScrollbar(ref.current, {
      suppressScrollX: true,
      wheelPropagation: false,
    });
    return () => {
      ps.current?.destroy();
      ps.current = null;
    };
  }, []);
  useEffect(() => {
    ps.current?.update();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

export function Availability() {
  const { dataProfile, refetchProfile } = useContext(UserContext);
  const [update, { loading }] = useMutation(UPDATE_AVAILABILITY);
  const [error, setError] = useState(false);
  const busy = useRef(false);
  return (
    <div>
      <button
        className="rd-availability"
        role="switch"
        aria-checked={!!dataProfile?.available}
        disabled={loading || !dataProfile}
        onClick={async () => {
          if (busy.current) return;
          busy.current = true;
          setError(false);
          try {
            await update({ variables: { id: dataProfile?._id } });
            await refetchProfile();
          } catch {
            setError(true);
          } finally {
            busy.current = false;
          }
        }}
      >
        <span className={dataProfile?.available ? "rd-dot online" : "rd-dot"} />
        <span className="rd-label">
          {dataProfile?.available ? "You're available" : "You're offline"}
        </span>
        <span className={`rd-switch ${dataProfile?.available ? "on" : ""}`} />
      </button>
      {error && (
        <small role="alert">Could not update availability. Try again.</small>
      )}
    </div>
  );
}
const NAV_ICONS: Record<string, string> = {
  package:
    '<path d="M16.5 9.4 7.5 4.2"/><path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  calendar:
    '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  truck:
    '<path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
  chart: '<path d="M12 20V10M18 20V4M6 20v-4"/>',
  wallet:
    '<path d="M20 12V7H6a2 2 0 0 1 0-4h13v4"/><path d="M4 5v14a2 2 0 0 0 2 2h14v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  globe:
    '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 4 6.4 4 9s-1.5 6.3-4 9c-2.5-2.7-4-6.4-4-9s1.5-6.3 4-9Z"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  logout:
    '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
};

function NavIcon({ name }: { name: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: NAV_ICONS[name] ?? "" }}
    />
  );
}

const NAV_GROUPS = [
  [
    "DELIVERIES",
    ["package", "Available deliveries", "/home/orders"],
    ["list", "My deliveries", "/home/orders/processing"],
    ["clock", "Delivery history", "/home/orders/delivered"],
  ],
  [
    "WORK",
    ["calendar", "Work schedule", "/home/work-schedule"],
    ["truck", "Vehicle details", "/home/vehicle-type"],
  ],
  [
    "EARNINGS",
    ["chart", "Earnings", "/earnings"],
    ["wallet", "Cash collection", "/home/cash"],
    ["card", "Bank account", "/home/bank-management"],
  ],
  [
    "ACCOUNT",
    ["user", "Profile", "/profile"],
    ["globe", "Language", "/home/language"],
    ["help", "Help & Support", "/home/help"],
  ],
] as const;

export function RiderWebShell({ children }: { children: ReactNode }) {
  const { dataProfile, assignedOrders } = useContext(UserContext);
  const { logout } = useContext(AuthContext);
  const path = usePathname();
  const { t } = useTranslation();
  const [menu, setMenu] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("rd-nav-collapsed") === "1";
    } catch {
      return false;
    }
  });
  const [wide, setWide] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 761px)");
    const sync = () => setWide(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const toggleCollapsed = () =>
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem("rd-nav-collapsed", next ? "1" : "0");
      } catch {
        /* private mode — ignore */
      }
      return next;
    });

  const navRef = usePerfectScrollbar<HTMLElement>([]);
  const isCollapsed = collapsed && wide;
  const initials =
    (dataProfile?.name || "Rider")
      .split(" ")
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "R";
  const count = dataProfile?.available
    ? (assignedOrders?.filter(
        (o) => o.orderStatus === "ACCEPTED" && !o.rider && !o.isPickedUp,
      ).length ?? 0)
    : 0;

  return (
    <div className="rider-desk">
      <style>{css}</style>
      <button
        className="rd-menu"
        aria-label="Toggle navigation"
        aria-expanded={menu}
        onClick={() => setMenu(!menu)}
      >
        ☰
      </button>
      <aside
        className={`rd-sidebar ${menu ? "open" : ""} ${isCollapsed ? "collapsed" : ""}`}
      >
        <div className="rd-head">
          {wide && (
            <button
              className="rd-collapse"
              aria-label={isCollapsed ? "Expand menu" : "Collapse menu"}
              onClick={toggleCollapsed}
            >
              {isCollapsed ? "»" : "«"}
            </button>
          )}
          <div className="rd-brand">
            <img src="/brand/localsell-logo-inverse.png" alt="LocalSell" />
            <span>RIDER</span>
          </div>
          <div className="rd-identity">
            <span
              className={`rd-avatar ${dataProfile?.available ? "online" : ""}`}
            >
              {initials}
            </span>
            <div className="rd-idtext">
              <strong>{dataProfile?.name || t("Rider")}</strong>
              <small>
                <span
                  className={dataProfile?.available ? "rd-dot online" : "rd-dot"}
                />
                {dataProfile?.available ? t("Online") : t("Offline")}
              </small>
            </div>
          </div>
          {!isCollapsed && <Availability />}
        </div>
        <nav className="rd-nav" ref={navRef}>
          {NAV_GROUPS.map(([title, ...links]) => (
            <div className="rd-nav-group" key={title}>
              <h2>{t(title)}</h2>
              {links.map(([icon, label, href]) => (
                <button
                  key={href}
                  title={t(label)}
                  className={path.replace(/\/$/, "") === href ? "selected" : ""}
                  onClick={() => {
                    router.push(href as Href);
                    setMenu(false);
                  }}
                >
                  <span className="rd-ic">
                    <NavIcon name={icon} />
                  </span>
                  <span className="rd-label">{t(label)}</span>
                  {href === "/home/orders" && count > 0 && <b>{count}</b>}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <button
          className="rd-signout"
          title={t("Sign out")}
          onClick={() => void logout()}
        >
          <span className="rd-ic">
            <NavIcon name="logout" />
          </span>
          <span className="rd-label">{t("Sign out")}</span>
        </button>
      </aside>
      <div className="rd-content">{children}</div>
    </div>
  );
}
function distance(o: IOrder) {
  const from = o.restaurant?.location?.coordinates;
  const to = o.deliveryAddress?.location?.coordinates;
  if (
    !from ||
    !to ||
    from.length < 2 ||
    to.length < 2 ||
    ![...from, ...to].every((v) => Number.isFinite(Number(v)))
  )
    return null;
  return calculateDistance(
    Number(from[1]),
    Number(from[0]),
    Number(to[1]),
    Number(to[0]),
  );
}
export default function DeliveryDashboard({
  tab = "new_orders",
}: {
  tab?: string;
}) {
  const { t } = useTranslation();
  const {
    assignedOrders,
    dataProfile,
    errorAssigned,
    loadingAssigned,
    refetchAssigned,
    userId,
  } = useContext(UserContext);
  const { format } = useCurrency();
  const [search, setSearch] = useState("");
  const [payment, setPayment] = useState("");
  const [range, setRange] = useState("");
  const { data: cash } = useQuery(RIDER_CASH_SUMMARY, {
    variables: { riderId: userId },
    skip: !userId,
    fetchPolicy: "cache-and-network",
  });
  const available = (assignedOrders ?? []).filter(
    (o) => o.orderStatus === "ACCEPTED" && !o.rider && !o.isPickedUp,
  );
  const active = (assignedOrders ?? []).filter(
    (o) =>
      ["ASSIGNED", "PICKED"].includes(o.orderStatus) &&
      !o.isPickedUp &&
      o.rider?._id === dataProfile?._id,
  );
  const completed = (assignedOrders ?? []).filter(
    (o) =>
      ["DELIVERED", "COMPLETED"].includes(o.orderStatus) &&
      o.rider?._id === dataProfile?._id,
  );
  const list =
    tab === "processing"
      ? active
      : tab === "delivered"
        ? completed
        : dataProfile?.available
          ? available
          : [];
  const filtered = list.filter((o) => {
    const km = distance(o);
    return (
      `${o.orderId} ${o.restaurant?.name}`
        .toLowerCase()
        .includes(search.toLowerCase().trim()) &&
      (!payment ||
        (payment === "COD"
          ? o.paymentMethod === "COD"
          : o.paymentMethod !== "COD")) &&
      (!range || (km !== null && km <= Number(range)))
    );
  });
  const title =
    tab === "processing"
      ? "My deliveries"
      : tab === "delivered"
        ? "Delivery history"
        : "Available deliveries";
  const scrollRef = usePerfectScrollbar<HTMLElement>([
    filtered.length,
    tab,
    loadingAssigned,
    errorAssigned,
  ]);
  return (
    <main className="rd-dashboard" ref={scrollRef}>
      <header className="rd-heading">
        <div>
          <h1>{t(title)}</h1>
          <p>
            {t(
              tab === "new_orders"
                ? "Choose a delivery and start earning."
                : "Track and manage your deliveries.",
            )}
          </p>
        </div>
        <Availability />
      </header>
      <div className="rd-stats">
        {[
          [
            "⌖",
            "Available nearby",
            dataProfile?.available ? available.length : 0,
          ],
          ["◇", "Active delivery", active.length],
          [
            "▣",
            "Cash to remit",
            cash?.riderCashSummary
              ? format(cash.riderCashSummary.outstanding ?? 0)
              : "—",
          ],
        ].map(([icon, label, value], i) => (
          <div key={label} className="rd-stat">
            <span className={`rd-stat-icon tone-${i}`}>{icon}</span>
            <div>
              <p>{t(String(label))}</p>
              <strong>{value}</strong>
            </div>
          </div>
        ))}
      </div>
      <nav className="rd-tabs" aria-label="Delivery status">
        {[
          ["new_orders", "Available", "/home/orders"],
          ["processing", "Active", "/home/orders/processing"],
          ["delivered", "Completed", "/home/orders/delivered"],
        ].map(([key, label, href]) => (
          <button
            key={key}
            aria-current={tab === key ? "page" : undefined}
            className={tab === key ? "active" : ""}
            onClick={() => router.push(href as Href)}
          >
            {t(label)}
            {key === "new_orders" &&
              dataProfile?.available &&
              available.length > 0 && <span>{available.length}</span>}
          </button>
        ))}
      </nav>
      <div className="rd-filters">
        <label>
          <span aria-hidden="true">⌕</span>
          <input
            aria-label="Search order or restaurant"
            placeholder={t("Search order or restaurant")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select
          aria-label="Distance"
          value={range}
          onChange={(e) => setRange(e.target.value)}
        >
          <option value="">{t("All distances")}</option>
          {[2, 5, 10].map((n) => (
            <option key={n} value={n}>
              {t("Within {{count}} km", { count: n })}
            </option>
          ))}
        </select>
        <select
          aria-label="Payment"
          value={payment}
          onChange={(e) => setPayment(e.target.value)}
        >
          <option value="">{t("All payments")}</option>
          <option value="COD">{t("Cash on delivery")}</option>
          <option value="ONLINE">{t("Online payment")}</option>
        </select>
        <button
          aria-label="Refresh deliveries"
          disabled={loadingAssigned}
          onClick={() => refetchAssigned()}
        >
          ⟳
        </button>
      </div>
      {errorAssigned ? (
        <div className="rd-empty" role="alert">
          {t("Unable to load deliveries. Please refresh to try again.")}
        </div>
      ) : loadingAssigned && !list.length ? (
        <div className="rd-empty" role="status">
          {t("Loading deliveries…")}
        </div>
      ) : !filtered.length ? (
        <div className="rd-empty">
          <h2>
            {t(
              !dataProfile?.available && tab === "new_orders"
                ? "You're currently offline"
                : "No deliveries found",
            )}
          </h2>
          <p>
            {t(
              !dataProfile?.available && tab === "new_orders"
                ? "Turn on availability to see new deliveries."
                : "New deliveries will appear here. Try adjusting your filters.",
            )}
          </p>
        </div>
      ) : (
        <div className="rd-orders">
          {filtered.map((o) => (
            <DeliveryCard key={o._id} order={o} tab={tab} />
          ))}
        </div>
      )}
    </main>
  );
}
function DeliveryCard({ order: o, tab }: { order: IOrder; tab: string }) {
  const { format } = useCurrency();
  const { t } = useTranslation();
  const { refetchAssigned, dataProfile } = useContext(UserContext);
  const [assign, { loading }] = useMutation(ASSIGN_ORDER);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const km = distance(o);
  const cod = o.paymentMethod === "COD";
  const paid = ["PAID", "COMPLETED"].includes(o.paymentStatus?.toUpperCase());
  const posted = new Date(
    /^\d+$/.test(o.acceptedAt || o.createdAt)
      ? Number(o.acceptedAt || o.createdAt)
      : o.acceptedAt || o.createdAt,
  ).getTime();
  const age = Number.isFinite(posted)
    ? Math.max(0, Math.floor((Date.now() - posted) / 60000))
    : null;
  const details = () =>
    router.push({ pathname: "/order-detail", params: { itemId: o._id, tab } });
  return (
    <article className="rd-order">
      <div className="rd-order-main">
        <div className="rd-order-meta">
          <span className={`rd-badge ${tab === "processing" ? "working" : ""}`}>
            {t(tab === "new_orders" ? "AVAILABLE FOR PICKUP" : o.orderStatus)}
          </span>
          <strong>#{o.orderId.replace(/^#/, "")}</strong>
          {age !== null && (
            <small>{t("Posted {{count}} min ago", { count: age })}</small>
          )}
        </div>
        <div className="rd-restaurant">
          {o.restaurant?.image ? (
            <img
              src={o.restaurant.image}
              alt=""
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <span className="rd-store-placeholder">◇</span>
          )}
          <h2>{o.restaurant?.name}</h2>
        </div>
        <div className="rd-address">
          <p>
            <span>●</span>
            {o.restaurant?.address || t("Pickup address unavailable")}
          </p>
          <p>
            <span className="drop">●</span>
            {o.deliveryAddress?.deliveryAddress ||
              t("Drop-off address unavailable")}
          </p>
          <div className="rd-metrics">
            <span>
              ♧{" "}
              {km === null ? t("Distance unavailable") : `${km.toFixed(1)} km`}
            </span>
            {km !== null && (
              <span title="Estimated from straight-line distance at 25 km/h">
                ◷{" "}
                {t("Approx. {{count}} min", {
                  count: Math.max(1, Math.round((km / 25) * 60)),
                })}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="rd-order-payment">
        <h3 className={cod ? "cash" : "prepaid"}>
          ▣{" "}
          {t(
            cod
              ? "Cash on delivery"
              : paid
                ? "Prepaid order"
                : "Online payment",
          )}
        </h3>
        <div className="rd-amount">
          <span>{t("Collect from customer")}</span>
          <strong>{format(cod && !paid ? o.orderAmount : 0)}</strong>
        </div>
        <div className="rd-amount">
          <span>{t("Delivery earning")}</span>
          <span>{t("See earnings after delivery")}</span>
        </div>
        {error && (
          <p role="alert" className="rd-error">
            {error}
          </p>
        )}
        {tab === "new_orders" && (
          <button
            className="rd-primary"
            disabled={loading || !dataProfile?.available}
            onClick={async () => {
              if (lock.current) return;
              lock.current = true;
              setError("");
              try {
                await assign({ variables: { id: o._id } });
                refetchAssigned();
                router.push("/home/orders/processing" as Href);
              } catch {
                setError(
                  t("Could not accept delivery. Please refresh and try again."),
                );
              } finally {
                lock.current = false;
              }
            }}
          >
            {t(loading ? "Accepting…" : "Accept delivery")}
          </button>
        )}
        <button className="rd-outline" onClick={details}>
          {t("View details")}
        </button>
      </div>
    </article>
  );
}
const css = `
.rider-desk{display:flex;flex:1;height:100dvh;overflow:hidden;width:100%;font-family:Inter,system-ui,sans-serif;color:#111c30;background:#f0f6fd}.rider-desk *{box-sizing:border-box}.rider-desk .ps__rail-y{opacity:.55;background:transparent!important;width:11px}.rider-desk .ps__rail-y:hover,.rider-desk .ps__rail-y:focus,.rider-desk .ps--clicking .ps__rail-y{opacity:.9;background:transparent!important}.rider-desk .ps__thumb-y{background:#9fb0c7!important;width:6px;right:2px;border-radius:6px}.rider-desk .ps__rail-y:hover .ps__thumb-y,.rider-desk .ps__rail-y:focus .ps__thumb-y{width:7px;background:#7f93af!important}.rider-desk button,.rider-desk input,.rider-desk select{font:inherit}.rider-desk button{cursor:pointer}.rider-desk button:disabled{opacity:.5;cursor:default}.rider-desk button:focus-visible,.rider-desk input:focus-visible,.rider-desk select:focus-visible{outline:2px solid #4287ff;outline-offset:3px}.rd-sidebar{width:252px;flex-shrink:0;display:flex;flex-direction:column;background:#fff;color:#3a4658;height:100dvh;position:sticky;top:0;border-right:1px solid #e6ecf5;transition:width .16s ease;overflow:hidden}.rd-sidebar.collapsed{width:72px}.rd-head{position:relative;background:linear-gradient(140deg,#07203d,#0c3a72);color:#e9f1ff;padding:16px 14px 14px}.rd-collapse{position:absolute;top:10px;right:9px;width:24px;height:24px;border-radius:7px;border:0;background:#ffffff1f;color:#fff;display:grid;place-items:center;font-size:13px;line-height:1}.rd-collapse:hover{background:#ffffff36}.rd-brand{display:flex;align-items:baseline;gap:7px;margin-bottom:14px}.rd-brand img{width:112px;height:26px;object-fit:contain;display:block}.rd-brand>span{font-size:9px;letter-spacing:3px;color:#9fc0ee}.rd-identity{display:flex;align-items:center;gap:10px}.rd-avatar{display:grid;place-items:center;background:#fff;color:#0b56c9;border-radius:12px;width:40px;height:40px;font-weight:800;font-size:14px;flex-shrink:0}.rd-idtext{min-width:0}.rd-idtext strong{font-size:13px;display:block;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:150px}.rd-idtext small{display:flex;align-items:center;gap:6px;font-size:10px;color:#bcd4f2;margin-top:3px}.rd-availability{display:flex;align-items:center;gap:8px;width:100%;margin-top:12px;background:#ffffff14;border:0;border-radius:10px;color:#eaf2ff;padding:9px 10px;font-size:11px!important;white-space:nowrap}.rd-heading .rd-availability{width:auto;margin:0;background:#fff;border:1px solid #e3eaf2;color:#268539;border-radius:22px}.rd-dot{width:8px;height:8px;border-radius:50%;background:#94a3b8;flex-shrink:0}.rd-dot.online{background:#3ddc84}.rd-switch{width:34px;height:19px;border-radius:20px;background:#ffffff40;position:relative;margin-left:auto;flex-shrink:0}.rd-switch:after{content:"";position:absolute;width:13px;height:13px;top:3px;left:3px;background:#fff;border-radius:50%;transition:left .15s}.rd-switch.on{background:#2f8dff}.rd-switch.on:after{left:18px}.rd-heading .rd-switch{background:#cdd9e8}.rd-nav{flex:1;overflow:auto;padding:10px}.rd-nav-group{margin-top:14px}.rd-nav-group:first-child{margin-top:2px}.rd-nav-group h2{font-size:10px;letter-spacing:1px;font-weight:700;padding:0 10px;margin:0 0 6px;color:#93a1b5;text-transform:uppercase}.rd-nav-group button,.rd-signout{display:flex;align-items:center;gap:12px;width:100%;padding:9px 10px;border:0;background:none;color:#3c4a5e;border-radius:9px;text-align:left;font-size:12.5px!important;min-height:38px;font-weight:500}.rd-ic{width:20px;height:20px;display:grid;place-items:center;flex-shrink:0}.rd-ic svg{width:19px;height:19px}.rd-nav-group button:hover{background:#eef4ff}.rd-nav-group button.selected{color:#0b63e5;background:#e7f0ff;font-weight:700}.rd-nav-group b{border-radius:20px;background:#0b63e5;color:#fff;font-size:10px;padding:3px 7px;margin-left:auto;font-weight:700}.rd-signout{color:#d3413b;border-top:1px solid #e6ecf5;border-radius:0;margin:4px 8px 8px;padding:12px 6px 2px;width:auto}.rd-signout:hover{color:#b5322d;background:#fdeceb}.rd-sidebar.collapsed .rd-brand,.rd-sidebar.collapsed .rd-idtext,.rd-sidebar.collapsed .rd-nav-group h2,.rd-sidebar.collapsed .rd-label,.rd-sidebar.collapsed .rd-nav-group b{display:none}.rd-sidebar.collapsed .rd-head{padding:14px 8px}.rd-sidebar.collapsed .rd-identity{justify-content:center}.rd-sidebar.collapsed .rd-avatar.online{box-shadow:0 0 0 2px #0c3a72,0 0 0 4px #3ddc84}.rd-sidebar.collapsed .rd-nav-group button,.rd-sidebar.collapsed .rd-signout{justify-content:center;gap:0;padding-left:0;padding-right:0;margin-left:0;margin-right:0}.rd-content{flex:1;min-width:0;display:flex;flex-direction:column}.rd-dashboard{padding:25px 32px;overflow:auto;flex:1;background:linear-gradient(125deg,#f0f7ff,#f5f9fe)}.rd-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin-bottom:18px}.rd-heading h1{font-size:25px;letter-spacing:-.7px;margin:0 0 5px;font-weight:700}.rd-heading p{color:#7888a3;font-size:13px;margin:0}.rd-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-bottom:18px}.rd-stat{display:flex;gap:20px;align-items:center;background:white;border:1px solid #e2eaf5;border-radius:8px;padding:16px 18px}.rd-stat-icon{width:50px;height:50px;border-radius:10px;display:grid;place-items:center;font-size:30px}.tone-0{background:#eaf2ff;color:#006cff}.tone-1{background:#edfaef;color:#25b32d}.tone-2{background:#fff8e6;color:#f2a000}.rd-stat p{font-size:12px;font-weight:500;color:#6e809e;margin:0 0 4px}.rd-stat strong{font-size:26px;line-height:1}.rd-tabs{display:flex;border:1px solid #e2eaf5;border-radius:8px;padding:2px;background:#f8fbff;margin-bottom:13px}.rd-tabs button{flex:1;border:0;background:none;color:#6b7e9a;height:38px;border-radius:7px;font-weight:600;font-size:12px}.rd-tabs button.active{background:linear-gradient(120deg,#0873f8,#0860ea);color:white}.rd-tabs button span{margin-left:12px;border-radius:50%;padding:4px 7px;background:#ffffff40}.rd-filters{display:flex;gap:13px;margin-bottom:13px}.rd-filters label{display:flex;align-items:center;gap:10px;flex:2;background:white;border:1px solid #dde7f4;border-radius:7px;padding:0 13px;color:#7687a1}.rd-filters label>span{font-size:25px}.rd-filters input{border:0;outline:none;width:100%;font-size:12px;height:39px;min-width:0}.rd-filters select{flex:1;min-width:0;border:1px solid #dde7f4;border-radius:7px;background:white;color:#263b5b;padding:0 13px;font-size:12px}.rd-filters>button{height:41px;width:45px;border:1px solid #dde7f4;background:white;border-radius:7px;font-size:25px;color:#637a9a}.rd-orders{display:grid;gap:12px}.rd-order{display:flex;gap:20px;border:1px solid #e2eaf5;border-radius:10px;background:white;padding:14px 19px;box-shadow:0 3px 10px #183f6704}.rd-order-main{flex:1;min-width:0}.rd-order-meta{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:11px}.rd-order-meta strong{font-size:12px}.rd-order-meta small{font-size:10px;color:#8190a7}.rd-badge{padding:4px 11px;border:1px solid #75d986;border-radius:20px;color:#248b29;background:#d9f8dc;font-size:10px;font-weight:650}.rd-badge.working{background:#fff1d5;color:#a56a00;border-color:#eed18a}.rd-restaurant{display:flex;align-items:center;gap:14px}.rd-restaurant img,.rd-store-placeholder{width:41px;height:39px;object-fit:cover;border-radius:10px;background:#f1f5fa}.rd-store-placeholder{display:grid;place-items:center}.rd-restaurant h2{font-size:16px;margin:0;font-weight:650}.rd-address{padding-left:55px}.rd-address p{font-size:11px;line-height:1.5;color:#637796;margin:5px 0;display:flex;gap:10px}.rd-address p>span{color:#0865d8}.rd-address p>span.drop{color:#fb5e66}.rd-metrics{display:flex;gap:12px;margin-top:11px;flex-wrap:wrap}.rd-metrics span{background:#f0f4f8;border-radius:18px;color:#607390;font-size:11px;padding:6px 12px}.rd-order-payment{width:35%;min-width:245px;border-left:1px solid #e2e9f3;padding-left:19px}.rd-order-payment h3{margin:0 0 4px;font-size:12px;padding:8px 11px;border-radius:7px}.cash{color:#70441e;background:#fff8e9}.prepaid{color:#0063f2;background:#eaf3ff}.rd-amount{display:flex;justify-content:space-between;gap:10px;padding:7px 0;color:#697e9d;font-size:11px}.rd-amount:first-of-type{border-bottom:1px solid #e3eaf4}.rd-amount strong{color:#18233a;font-size:13px}.rd-primary,.rd-outline{width:100%;height:34px;border-radius:6px;font-size:12px!important;font-weight:600!important}.rd-primary{border:0;color:white;background:linear-gradient(120deg,#0869f1,#075ada);margin-top:5px}.rd-outline{color:#0062ff;border:1px solid #5895ff;background:white;margin-top:6px;height:29px}.rd-empty{text-align:center;background:white;padding:50px 20px;border:1px solid #e0e9f4;border-radius:10px;color:#687d9c}.rd-empty h2{font-size:20px;color:#233959}.rd-error{color:#b32626;font-size:11px}.rd-menu{display:none}@media(max-width:1050px){.rd-sidebar{width:228px}.rd-dashboard{padding:24px 18px}.rd-order{gap:12px;padding:14px}.rd-order-payment{min-width:220px}.rd-stat{gap:10px;padding:14px 12px}.rd-heading h1{font-size:23px}}@media(max-width:760px){.rd-sidebar{display:none;position:fixed;z-index:30;left:0;top:44px;height:calc(100dvh - 44px);width:220px}.rd-sidebar.open{display:block}.rd-menu{display:block;position:fixed;top:8px;left:12px;z-index:31;border:0;background:#08254b;color:white;border-radius:5px;padding:4px 10px}.rd-dashboard{padding:52px 14px 24px}.rd-heading{flex-wrap:wrap}.rd-stats{gap:8px}.rd-stat{padding:12px 8px;gap:8px;flex-direction:column;align-items:flex-start}.rd-stat-icon{width:32px;height:32px;font-size:22px}.rd-stat p{font-size:10px}.rd-stat strong{font-size:22px}.rd-filters{flex-wrap:wrap;gap:8px}.rd-filters label{flex-basis:100%}.rd-filters select{height:38px}.rd-order{flex-direction:column}.rd-order-payment{width:100%;border-left:0;border-top:1px solid #e3eaf4;padding:12px 0 0}.rd-order-meta{gap:8px}.rd-address{padding-left:0}.rd-content{padding-top:0}}
.ps{overflow:hidden!important;overflow-anchor:none;-ms-overflow-style:none;touch-action:auto}.ps__rail-x,.ps__rail-y{display:none;opacity:0;transition:opacity .2s linear;position:absolute}.ps__rail-x{height:15px;bottom:0}.ps__rail-y{width:15px;right:0}.ps--active-x>.ps__rail-x,.ps--active-y>.ps__rail-y{display:block;background:transparent}.ps:hover>.ps__rail-x,.ps:hover>.ps__rail-y,.ps--focus>.ps__rail-x,.ps--focus>.ps__rail-y,.ps--scrolling-x>.ps__rail-x,.ps--scrolling-y>.ps__rail-y{opacity:.6}.ps__thumb-x,.ps__thumb-y{background:#aaa;border-radius:6px;position:absolute;transition:background .2s linear,width .2s ease,height .2s ease}.ps__thumb-x{height:6px;bottom:2px}.ps__thumb-y{width:6px;right:2px}
`;
