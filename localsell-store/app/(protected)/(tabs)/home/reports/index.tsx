import { useMemo, useState } from "react";
import {
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useQuery } from "@apollo/client";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { useApptheme } from "@/lib/context/theme.context";
import { useUserContext } from "@/lib/context/global/user.context";
import { useCurrency } from "@/lib/utils/methods/use-currency";
import {
  STORE_COLLECTION_SUMMARY,
  STORE_ORDER_REPORT,
} from "@/lib/apollo/queries/delivery.query";
import SpinnerComponent from "@/lib/ui/useable-components/spinner";
type RangeKey = "WEEK" | "MONTH" | "YEAR";
type GroupBy = "DAY" | "MONTH";
function rangeFor(key: RangeKey): { startDate: string; endDate: string } {
  const now = new Date();
  const end = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999,
  );
  let start: Date;
  if (key === "WEEK") {
    const daysSinceMon = (now.getDay() + 6) % 7;
    start = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - daysSinceMon,
    );
  } else if (key === "MONTH") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  } else {
    start = new Date(now.getFullYear(), 0, 1);
  }
  return { startDate: start.toISOString(), endDate: end.toISOString() };
}
export default function ReportsScreen() {
  const { appTheme } = useApptheme();
  const { t } = useTranslation();
  const { format } = useCurrency();
  const { width } = useWindowDimensions();
  const wide = width >= 1000;
  const { userId: storeId, dataProfile } = useUserContext();
  const [rangeKey, setRangeKey] = useState<RangeKey>("MONTH");
  const [groupBy, setGroupBy] = useState<GroupBy>("DAY");
  const range = useMemo(() => rangeFor(rangeKey), [rangeKey]);
  const { data: reportData, loading: loadingReport } = useQuery(
    STORE_ORDER_REPORT,
    {
      variables: {
        storeId,
        groupBy,
        startDate: range.startDate,
        endDate: range.endDate,
      },
      skip: !storeId,
      fetchPolicy: "cache-and-network",
    },
  );
  const { data: collectionData, loading: loadingCollection } = useQuery(
    STORE_COLLECTION_SUMMARY,
    {
      variables: {
        storeId,
        startDate: range.startDate,
        endDate: range.endDate,
      },
      skip: !storeId,
      fetchPolicy: "cache-and-network",
    },
  );
  const report = reportData?.storeOrderReport;
  const totals = report?.totals;
  const buckets: {
    bucket: string;
    label: string;
    delivered: number;
    cancelled: number;
    netEarnings: number;
  }[] = report?.buckets ?? [];
  const collection = collectionData?.storeCollectionSummary;
  return (
    <SafeAreaView
      edges={["bottom", "left", "right"]}
      style={{ backgroundColor: appTheme.themeBackground }}
      className="flex-1"
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          padding: width < 600 ? 16 : 32,
          paddingBottom: 48,
        }}
      >
        <View style={{ width: "100%", maxWidth: 1240, alignSelf: "center" }}>
          <Text
            className="text-2xl font-bold"
            style={{ color: appTheme.fontMainColor }}
          >
            {t("Reports")}
          </Text>
          <Text
            className="text-sm mt-1 mb-4"
            style={{ color: appTheme.fontSecondColor }}
          >
            {t("Orders, collection and cancellations for your store.")}
          </Text>
          <View
            style={{
              flexDirection: wide ? "row" : "column",
              justifyContent: "space-between",
              gap: 16,
              paddingVertical: 18,
              marginBottom: 8,
            }}
          >
            <Chips
              options={[
                { key: "WEEK", label: t("This Week") },
                { key: "MONTH", label: t("This Month") },
                { key: "YEAR", label: t("This Year") },
              ]}
              value={rangeKey}
              onChange={(v) => setRangeKey(v as RangeKey)}
            />
            <Chips
              options={[
                { key: "DAY", label: t("Day-wise") },
                { key: "MONTH", label: t("Month-wise") },
              ]}
              value={groupBy}
              onChange={(v) => setGroupBy(v as GroupBy)}
            />
          </View>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 16,
              marginBottom: 8,
            }}
          >
            {[
              {
                label: t("Total orders"),
                value: String(totals?.orders ?? 0),
                note: t("Orders placed"),
                accent: appTheme.primary,
              },
              {
                label: t("Gross sales"),
                value: format(totals?.grossSales ?? 0),
                note: t("Before commission"),
                accent: appTheme.primary,
              },
              {
                label: t("Net earnings"),
                value: format(totals?.netEarnings ?? 0),
                note: t("After commission"),
                accent: "#16815d",
              },
              {
                label: t("Cancelled"),
                value: String(totals?.cancelled ?? 0),
                note: t("Cancelled orders"),
                accent: "#bf5b35",
              },
            ].map((item) => (
              <View
                key={item.label}
                style={{
                  width: width < 600 ? "100%" : undefined,
                  flex: width < 600 ? undefined : 1,
                  minWidth: 170,
                  padding: 22,
                  borderRadius: 16,
                  backgroundColor: appTheme.cartContainer,
                  borderWidth: 1,
                  borderColor: appTheme.borderLineColor,
                }}
              >
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <View
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: 4,
                      backgroundColor: item.accent,
                    }}
                  />
                  <Text
                    style={{
                      color: appTheme.fontSecondColor,
                      fontSize: 13,
                      fontWeight: "500",
                    }}
                  >
                    {item.label}
                  </Text>
                </View>
                <Text
                  style={{
                    color: appTheme.fontMainColor,
                    fontSize: 30,
                    fontWeight: "700",
                    marginTop: 14,
                  }}
                >
                  {loadingReport && !totals ? "?" : item.value}
                </Text>
                <Text
                  style={{
                    color: appTheme.fontSecondColor,
                    fontSize: 12,
                    marginTop: 6,
                  }}
                >
                  {item.note}
                </Text>
              </View>
            ))}
          </View>
          <View
            style={{
              flexDirection: wide ? "row" : "column",
              gap: 20,
              alignItems: "flex-start",
            }}
          >
            <View
              style={{
                flex: wide ? 1.3 : undefined,
                width: wide ? undefined : "100%",
                minWidth: 0,
              }}
            >
              {/* Orders summary */}
              <Section title={t("Orders")}>
                {loadingReport && !totals ? (
                  <SpinnerComponent />
                ) : (
                  <>
                    <View className="flex-row flex-wrap">
                      <Stat
                        label={t("Delivered")}
                        value={String(totals?.delivered ?? 0)}
                      />
                      <Stat
                        label={t("Pickup")}
                        value={String(totals?.pickup ?? 0)}
                      />
                      <Stat
                        label={t("My delivery")}
                        value={String(totals?.selfDelivery ?? 0)}
                      />
                      <Stat
                        label={t("LocalSell fleet")}
                        value={String(totals?.platformDelivery ?? 0)}
                      />
                    </View>
                    <View className="mt-3">
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "600",
                          color: appTheme.fontMainColor,
                          marginBottom: 12,
                        }}
                      >
                        {t("Order breakdown")}
                      </Text>
                      <View
                        style={{
                          flexDirection: "row",
                          paddingVertical: 10,
                          borderBottomWidth: 1,
                          borderColor: appTheme.borderLineColor,
                        }}
                      >
                        {[
                          t("Period"),
                          t("Delivered"),
                          t("Cancelled"),
                          t("Net earnings"),
                        ].map((label, index) => (
                          <Text
                            key={label}
                            style={{
                              flex: index === 0 ? 1.4 : 1,
                              textAlign: index === 0 ? "left" : "right",
                              fontSize: 11,
                              color: appTheme.fontSecondColor,
                            }}
                          >
                            {label}
                          </Text>
                        ))}
                      </View>
                      {buckets.map((b) => (
                        <View
                          key={b.bucket}
                          className="flex-row items-center justify-between py-2.5 border-b-[0.5px]"
                          style={{ borderColor: appTheme.borderLineColor }}
                        >
                          <Text
                            style={{
                              flex: 1.4,
                              fontSize: 12,
                              color: appTheme.fontMainColor,
                            }}
                          >
                            {b.label}
                          </Text>
                          <Text
                            style={{
                              flex: 1,
                              textAlign: "right",
                              fontSize: 12,
                              color: appTheme.fontMainColor,
                            }}
                          >
                            {b.delivered}
                          </Text>
                          <Text
                            style={{
                              flex: 1,
                              textAlign: "right",
                              fontSize: 12,
                              color: appTheme.fontMainColor,
                            }}
                          >
                            {b.cancelled}
                          </Text>
                          <Text
                            style={{
                              flex: 1,
                              textAlign: "right",
                              fontSize: 12,
                              fontWeight: "600",
                              color: appTheme.fontMainColor,
                            }}
                          >
                            {format(b.netEarnings)}
                          </Text>
                        </View>
                      ))}
                      {buckets.length === 0 && !loadingReport && (
                        <Text
                          className="text-sm py-3"
                          style={{ color: appTheme.fontSecondColor }}
                        >
                          {t("No orders in this period")}
                        </Text>
                      )}
                    </View>
                  </>
                )}
              </Section>
            </View>
            <View
              style={{
                flex: wide ? 1 : undefined,
                width: wide ? undefined : "100%",
                minWidth: 0,
              }}
            >
              {/* Collection (COD cash reconciliation) */}
              <Section title={t("Collection — cash you hold")}>
                {loadingCollection && !collection ? (
                  <SpinnerComponent />
                ) : (
                  <>
                    <View className="flex-row flex-wrap">
                      <Stat
                        label={t("Your commission rate")}
                        value={`${dataProfile?.commissionRate ?? 0}%`}
                      />
                      <Stat
                        label={t("COD cash collected")}
                        value={format(collection?.codCashCollected ?? 0)}
                      />
                      <Stat
                        label={t("Commission owed")}
                        value={format(collection?.commissionOwed ?? 0)}
                      />
                      <Stat
                        label={t("GST collected")}
                        value={format(collection?.gstCollected ?? 0)}
                      />
                      <Stat
                        label={t("Net after commission")}
                        value={format(collection?.netAfterCommission ?? 0)}
                      />
                      <Stat
                        label={t("Unbilled commission")}
                        value={format(collection?.unbilledCommission ?? 0)}
                      />
                      <Stat
                        label={t("Outstanding bills")}
                        value={format(collection?.outstandingBillsTotal ?? 0)}
                      />
                    </View>
                    {(collection?.outstandingBills ?? []).map(
                      (bill: {
                        _id: string;
                        invoiceNumber?: string;
                        commissionTotal: number;
                        status: string;
                      }) => (
                        <View
                          key={bill._id}
                          className="flex-row items-center justify-between py-2.5 border-b-[0.5px]"
                          style={{ borderColor: appTheme.borderLineColor }}
                        >
                          <Text
                            className="text-sm"
                            style={{ color: appTheme.fontMainColor }}
                          >
                            {bill.invoiceNumber || bill._id.slice(-6)}
                          </Text>
                          <Text
                            className="text-xs"
                            style={{ color: appTheme.fontSecondColor }}
                          >
                            {format(bill.commissionTotal)} · {bill.status}
                          </Text>
                        </View>
                      ),
                    )}
                  </>
                )}
              </Section>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
function Chips({
  options,
  value,
  onChange,
}: {
  options: { key: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  const { appTheme } = useApptheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignSelf: "flex-start",
        padding: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: appTheme.borderLineColor,
        backgroundColor: appTheme.cartContainer,
      }}
    >
      {options.map((o) => {
        const active = o.key === value;
        return (
          <TouchableOpacity
            key={o.key}
            onPress={() => onChange(o.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 11,
              borderRadius: 8,
              backgroundColor: active ? appTheme.primary : "transparent",
            }}
          >
            <Text
              className="text-xs font-semibold"
              style={{
                color: active ? appTheme.white : appTheme.fontSecondColor,
              }}
            >
              {o.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const { appTheme } = useApptheme();
  return (
    <View
      style={{
        padding: 22,
        marginTop: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: appTheme.borderLineColor,
        backgroundColor: appTheme.cartContainer,
      }}
    >
      <Text
        className="text-base font-bold mb-3"
        style={{ color: appTheme.fontMainColor }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  const { appTheme } = useApptheme();
  return (
    <View
      style={{
        width: "50%",
        paddingRight: 12,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderColor: appTheme.borderLineColor,
      }}
    >
      <Text className="text-xs" style={{ color: appTheme.fontSecondColor }}>
        {label}
      </Text>
      <Text
        className="text-lg font-semibold mt-1"
        style={{ color: appTheme.fontMainColor }}
      >
        {value}
      </Text>
    </View>
  );
}
