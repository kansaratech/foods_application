import { useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useQuery } from "@apollo/client";
import { useTranslation } from "react-i18next";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

import { useApptheme } from "@/lib/context/theme.context";
import { useUserContext } from "@/lib/context/global/user.context";
import { useCurrency } from "@/lib/utils/methods/use-currency";
import { ORDERS_BY_REST_ID } from "@/lib/apollo/queries/orders";
import { STORE_TRANSACTIONS_HISTORY } from "@/lib/apollo/queries";
import OrderLoader from "@/lib/ui/useable-components/order-loader";
import { IOrderTabsComponentProps } from "@/lib/utils/interfaces";
import useSafeKeepAwake from "@/lib/hooks/useSafeKeepAwake";
import WebOrderHistory from "../history-table";

type View2 = "ORDERS" | "TRANSACTIONS";
type StatusFilter = "ALL" | "DELIVERED" | "CANCELLED";
type RangeKey = "7" | "30" | "90" | "ALL";

const STATUS_TABS: { key: StatusFilter; label: string; statuses?: string[] }[] = [
  { key: "ALL", label: "All" },
  { key: "DELIVERED", label: "Delivered", statuses: ["DELIVERED", "COMPLETED"] },
  { key: "CANCELLED", label: "Cancelled", statuses: ["CANCELLED"] },
];
const RANGE_TABS: { key: RangeKey; label: string; days: number | null }[] = [
  { key: "7", label: "7 days", days: 7 },
  { key: "30", label: "30 days", days: 30 },
  { key: "90", label: "90 days", days: 90 },
  { key: "ALL", label: "All time", days: null },
];

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}
function fmtDate(v?: string) {
  if (!v) return "";
  const d = new Date(/^\d+$/.test(v) ? Number(v) : v);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString();
}
function modeLabel(
  order: { deliveryMode?: string; isPickedUp?: boolean; storeDeliveryAgent?: { name?: string } | null },
  t: (s: string) => string,
) {
  const mode = order.deliveryMode ?? (order.isPickedUp ? "PICKUP" : "PLATFORM");
  if (mode === "PICKUP") return t("Pickup");
  if (mode === "SELF") return `${t("Self")}${order.storeDeliveryAgent?.name ? ` · ${order.storeDeliveryAgent.name}` : ""}`;
  return t("LocalSell");
}

interface Col<T> {
  key: string;
  label: string;
  width: number;
  render: (row: T) => React.ReactNode;
  align?: "right";
}

function DataTable<T>({ cols, rows, keyOf }: { cols: Col<T>[]; rows: T[]; keyOf: (r: T) => string }) {
  const { appTheme } = useApptheme();
  const total = cols.reduce((s, c) => s + c.width, 0);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator style={{ flexGrow: 0 }}>
      <View style={{ width: total }}>
        <View
          className="flex-row px-3 py-2.5 rounded-t-xl"
          style={{ backgroundColor: appTheme.sidebarIconBackground }}
        >
          {cols.map((c) => (
            <Text
              key={c.key}
              numberOfLines={1}
              className="text-[11px] font-bold uppercase"
              style={{
                width: c.width,
                color: appTheme.fontSecondColor,
                letterSpacing: 0.5,
                textAlign: c.align === "right" ? "right" : "left",
              }}
            >
              {c.label}
            </Text>
          ))}
        </View>
        {rows.map((row, i) => (
          <View
            key={keyOf(row)}
            className="flex-row px-3 py-3 border-b-[0.5px] items-center"
            style={{
              borderColor: appTheme.borderLineColor,
              backgroundColor: i % 2 ? "transparent" : appTheme.cartContainer,
            }}
          >
            {cols.map((c) => {
              const content = c.render(row);
              return (
                <View
                  key={c.key}
                  style={{ width: c.width, alignItems: c.align === "right" ? "flex-end" : "flex-start" }}
                >
                  {typeof content === "string" || typeof content === "number" ? (
                    <Text className="text-xs" style={{ color: appTheme.fontMainColor }} numberOfLines={2}>
                      {content}
                    </Text>
                  ) : (
                    content
                  )}
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function Chips<T extends string>({
  options,
  value,
  onChange,
  soft,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  soft?: boolean;
}) {
  const { appTheme } = useApptheme();
  const { t } = useTranslation();
  return (
    <View className="flex-row gap-2">
      {options.map((o) => {
        const active = o.key === value;
        return (
          <TouchableOpacity
            key={o.key}
            onPress={() => onChange(o.key)}
            className="px-3 py-2 rounded-lg items-center border flex-1"
            style={{
              borderColor: active ? appTheme.primary : appTheme.borderLineColor,
              backgroundColor: active ? (soft ? appTheme.lowOpacityPrimaryColor : appTheme.primary) : "transparent",
            }}
          >
            <Text
              className="text-xs font-semibold"
              style={{ color: active ? (soft ? appTheme.primary : appTheme.white) : appTheme.fontSecondColor }}
            >
              {t(o.label)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function StatusPill({ text }: { text: string }) {
  const { appTheme } = useApptheme();
  const s = text.toUpperCase();
  const color =
    s === "CANCELLED" || s === "FAILED"
      ? appTheme.error
      : s === "DELIVERED" || s === "COMPLETED" || s === "PAID"
        ? "#16A34A"
        : appTheme.primary;
  return (
    <View className="px-2 py-0.5 rounded-full self-start" style={{ backgroundColor: `${color}22` }}>
      <Text className="text-[11px] font-semibold" style={{ color }}>
        {text}
      </Text>
    </View>
  );
}

function HomeDeliveredOrdersMain(_props: IOrderTabsComponentProps & { initialView?: View2 }) {
  const { t } = useTranslation();
  const { appTheme } = useApptheme();
  const { format } = useCurrency();
  const { userId: storeId } = useUserContext();
  const tabBarHeight = useBottomTabBarHeight();
  const { width } = useWindowDimensions();
  const isWideWeb = Platform.OS === "web" && width >= 900;
  useSafeKeepAwake();

  const [view, setView] = useState<View2>(_props.initialView ?? "ORDERS");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [rangeKey, setRangeKey] = useState<RangeKey>("7");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const activeTab = STATUS_TABS.find((s) => s.key === statusFilter);
  const rangeDays = RANGE_TABS.find((r) => r.key === rangeKey)?.days ?? null;
  const starting_date = useMemo(() => (rangeDays ? isoDaysAgo(rangeDays) : undefined), [rangeDays]);

  const { data, loading, refetch } = useQuery(ORDERS_BY_REST_ID, {
    variables: {
      restaurant: storeId,
      page,
      rows: 25,
      orderStatus: activeTab?.statuses ?? null,
      starting_date,
      search: search || undefined,
    },
    skip: !storeId || view !== "ORDERS",
    fetchPolicy: "cache-and-network",
  });
  const orders: any[] = data?.ordersByRestId?.orders ?? [];
  const totalCount = data?.ordersByRestId?.totalCount ?? 0;
  const totalPages = data?.ordersByRestId?.totalPages ?? 1;

  const { data: txData, loading: txLoading } = useQuery(STORE_TRANSACTIONS_HISTORY, {
    variables: { pagination: { pageSize: 50, pageNo: 1 } },
    skip: !storeId || view !== "TRANSACTIONS",
    fetchPolicy: "cache-and-network",
  });
  const txns: any[] = txData?.transactionHistory?.data ?? [];

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };
  const applySearch = () => {
    setSearch(searchInput.trim());
    setPage(1);
  };

  const orderCols: Col<any>[] = [
    { key: "id", label: t("Order #"), width: 130, render: (r) => `#${r.orderId}` },
    { key: "date", label: t("Date"), width: 150, render: (r) => fmtDate(r.deliveredAt || r.cancelledAt || r.createdAt) },
    { key: "cust", label: t("Customer"), width: 150, render: (r) => r.user?.name || t("Customer") },
    { key: "phone", label: t("Phone"), width: 120, render: (r) => r.user?.phone || "—" },
    { key: "items", label: t("Items"), width: 60, render: (r) => String(r.items?.length ?? 0) },
    { key: "mode", label: t("Delivery"), width: 150, render: (r) => modeLabel(r, t) },
    { key: "pay", label: t("Payment"), width: 90, render: (r) => r.paymentMethod },
    { key: "amt", label: t("Amount"), width: 90, align: "right", render: (r) => format(r.orderAmount ?? 0) },
    { key: "status", label: t("Status"), width: 110, render: (r) => <StatusPill text={r.orderStatus} /> },
    {
      key: "reason",
      label: t("Note"),
      width: 160,
      render: (r) => (r.orderStatus === "CANCELLED" ? r.reason || "—" : ""),
    },
  ];

  const txCols: Col<any>[] = [
    { key: "id", label: t("Txn #"), width: 150, render: (r) => r.transactionId || r._id?.slice(-8) },
    { key: "date", label: t("Date"), width: 160, render: (r) => fmtDate(r.createdAt) },
    { key: "type", label: t("Type"), width: 110, render: () => t("Payout") },
    { key: "amt", label: t("Amount"), width: 110, align: "right", render: (r) => format(r.amountTransferred ?? 0) },
    { key: "status", label: t("Status"), width: 120, render: (r) => <StatusPill text={r.status} /> },
  ];

  const renderOrderCard = ({ item }: { item: any }) => {
    const cancelled = item.orderStatus === "CANCELLED";
    return (
      <View
        className="rounded-2xl border px-4 py-3 mb-3"
        style={{ borderColor: appTheme.borderLineColor, backgroundColor: appTheme.cartContainer }}
      >
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-bold" style={{ color: appTheme.fontMainColor }}>#{item.orderId}</Text>
          <StatusPill text={item.orderStatus} />
        </View>
        <Text className="text-sm mt-1" style={{ color: appTheme.fontMainColor }}>
          {item.user?.name || t("Customer")}{item.user?.phone ? ` · ${item.user.phone}` : ""}
        </Text>
        <Text className="text-xs mt-1" style={{ color: appTheme.fontSecondColor }}>
          {(item.items?.length ?? 0)} {t("items")} · {modeLabel(item, t)} · {item.paymentMethod} · {format(item.orderAmount ?? 0)}
        </Text>
        <Text className="text-xs mt-1" style={{ color: appTheme.fontSecondColor }}>
          {fmtDate(item.deliveredAt || item.cancelledAt || item.createdAt)}
        </Text>
        {cancelled && item.reason ? (
          <Text className="text-xs mt-1" style={{ color: appTheme.error }}>{t("Reason")}: {item.reason}</Text>
        ) : null}
      </View>
    );
  };

  const renderTxCard = ({ item }: { item: any }) => (
    <View
      className="rounded-2xl border px-4 py-3 mb-3 flex-row items-center justify-between"
      style={{ borderColor: appTheme.borderLineColor, backgroundColor: appTheme.cartContainer }}
    >
      <View>
        <Text className="text-sm font-bold" style={{ color: appTheme.fontMainColor }}>
          {item.transactionId || (item._id ? `#${item._id.slice(-8)}` : t("Payout"))}
        </Text>
        <Text className="text-xs mt-1" style={{ color: appTheme.fontSecondColor }}>{fmtDate(item.createdAt)}</Text>
      </View>
      <View className="items-end">
        <Text className="text-sm font-bold" style={{ color: appTheme.fontMainColor }}>{format(item.amountTransferred ?? 0)}</Text>
        <StatusPill text={item.status} />
      </View>
    </View>
  );

  const busy = view === "ORDERS" ? loading : txLoading;
  const listData = view === "ORDERS" ? orders : txns;

  return (
    <View
      className="flex-1 items-center px-5"
      style={[style.container, { backgroundColor: appTheme.themeBackground, paddingTop: 18 }]}
    >
      <View className="w-full lg:max-w-6xl">
        <Chips
          options={[
            { key: "ORDERS" as View2, label: "Orders" },
            { key: "TRANSACTIONS" as View2, label: "Transactions" },
          ]}
          value={view}
          onChange={setView}
        />

        {view === "ORDERS" && (
          <>
            <View className="mt-2">
              <Chips options={RANGE_TABS} value={rangeKey} onChange={(k) => { setRangeKey(k); setPage(1); }} />
            </View>
            <View className="mt-2">
              <Chips options={STATUS_TABS} value={statusFilter} onChange={(k) => { setStatusFilter(k); setPage(1); }} soft />
            </View>
            <View className="flex-row gap-2 mt-2">
              <TextInput
                className="flex-1 h-11 rounded-xl border px-4"
                placeholder={t("Search order # or customer")}
                placeholderTextColor={appTheme.fontSecondColor}
                style={{ color: appTheme.fontMainColor, borderColor: appTheme.borderLineColor }}
                value={searchInput}
                onChangeText={setSearchInput}
                onSubmitEditing={applySearch}
                returnKeyType="search"
              />
              <TouchableOpacity
                onPress={applySearch}
                className="h-11 px-5 rounded-xl items-center justify-center"
                style={{ backgroundColor: appTheme.primary }}
              >
                <Text className="text-xs font-semibold" style={{ color: appTheme.white }}>{t("Search")}</Text>
              </TouchableOpacity>
            </View>
            <Text className="text-xs mt-3" style={{ color: appTheme.fontSecondColor }}>
              {totalCount} {t("orders")}
            </Text>
          </>
        )}
      </View>

      <View className="flex-1 w-full lg:max-w-6xl lg:self-center mt-3">
        {busy && listData.length === 0 ? (
          <OrderLoader label={t("Loading")} />
        ) : isWideWeb ? (
          <ScrollView contentContainerStyle={{ paddingBottom: tabBarHeight + 24 }}>
            {view === "ORDERS" ? (
              <DataTable cols={orderCols} rows={orders} keyOf={(r) => r._id} />
            ) : (
              <DataTable cols={txCols} rows={txns} keyOf={(r) => r._id || r.transactionId} />
            )}
            {listData.length === 0 && (
              <Text className="text-sm text-center mt-10" style={{ color: appTheme.fontSecondColor }}>{t("No records")}</Text>
            )}
            {view === "ORDERS" && totalPages > 1 && (
              <Pager page={page} totalPages={totalPages} setPage={setPage} />
            )}
          </ScrollView>
        ) : (
          <FlatList
            className="w-full"
            data={listData}
            keyExtractor={(item, i) => item._id || item.transactionId || String(i)}
            renderItem={view === "ORDERS" ? renderOrderCard : renderTxCard}
            refreshing={refreshing}
            onRefresh={view === "ORDERS" ? onRefresh : undefined}
            contentContainerStyle={{ paddingBottom: tabBarHeight + 24 }}
            ListEmptyComponent={
              <Text className="text-sm text-center mt-10" style={{ color: appTheme.fontSecondColor }}>{t("No records")}</Text>
            }
            ListFooterComponent={
              view === "ORDERS" && totalPages > 1 ? <Pager page={page} totalPages={totalPages} setPage={setPage} /> : null
            }
          />
        )}
      </View>
    </View>
  );
}

function Pager({
  page,
  totalPages,
  setPage,
}: {
  page: number;
  totalPages: number;
  setPage: (fn: (p: number) => number) => void;
}) {
  const { appTheme } = useApptheme();
  const { t } = useTranslation();
  return (
    <View className="flex-row items-center justify-center gap-6 py-4">
      <TouchableOpacity disabled={page <= 1} onPress={() => setPage((p) => Math.max(1, p - 1))}>
        <Text style={{ color: page <= 1 ? appTheme.fontSecondColor : appTheme.primary }}>{t("Prev")}</Text>
      </TouchableOpacity>
      <Text style={{ color: appTheme.fontMainColor }}>{page} / {totalPages}</Text>
      <TouchableOpacity disabled={page >= totalPages} onPress={() => setPage((p) => Math.min(totalPages, p + 1))}>
        <Text style={{ color: page >= totalPages ? appTheme.fontSecondColor : appTheme.primary }}>{t("Next")}</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function OrderHistory(props: IOrderTabsComponentProps) {
  const [legacy, setLegacy] = useState(false);
  if (Platform.OS !== "web") return <HomeDeliveredOrdersMain {...props} />;
  if (!legacy) return <WebOrderHistory onTransactions={() => setLegacy(true)} />;
  return (
    <View style={{ flex: 1 }}>
      <TouchableOpacity onPress={() => setLegacy(false)} style={{ padding: 16 }}>
        <Text style={{ color: "#1559e9" }}>Back to Order History</Text>
      </TouchableOpacity>
      <HomeDeliveredOrdersMain {...props} initialView="TRANSACTIONS" />
    </View>
  );
}

const style = StyleSheet.create({ container: { flex: 1 } });
