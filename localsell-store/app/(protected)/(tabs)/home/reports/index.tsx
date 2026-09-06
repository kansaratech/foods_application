import { useMemo, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useQuery } from "@apollo/client";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";

import { useApptheme } from "@/lib/context/theme.context";
import { useUserContext } from "@/lib/context/global/user.context";
import { useCurrency } from "@/lib/utils/methods/use-currency";
import { STORE_COLLECTION_SUMMARY, STORE_ORDER_REPORT } from "@/lib/apollo/queries/delivery.query";
import SpinnerComponent from "@/lib/ui/useable-components/spinner";

type RangeKey = "WEEK" | "MONTH" | "YEAR";
type GroupBy = "DAY" | "MONTH";

function rangeFor(key: RangeKey): { startDate: string; endDate: string } {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  let start: Date;
  if (key === "WEEK") {
    const daysSinceMon = (now.getDay() + 6) % 7;
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceMon);
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
  const { userId: storeId } = useUserContext();

  const [rangeKey, setRangeKey] = useState<RangeKey>("MONTH");
  const [groupBy, setGroupBy] = useState<GroupBy>("DAY");
  const range = useMemo(() => rangeFor(rangeKey), [rangeKey]);

  const { data: reportData, loading: loadingReport } = useQuery(STORE_ORDER_REPORT, {
    variables: { storeId, groupBy, startDate: range.startDate, endDate: range.endDate },
    skip: !storeId,
    fetchPolicy: "cache-and-network",
  });
  const { data: collectionData, loading: loadingCollection } = useQuery(STORE_COLLECTION_SUMMARY, {
    variables: { storeId, startDate: range.startDate, endDate: range.endDate },
    skip: !storeId,
    fetchPolicy: "cache-and-network",
  });

  const report = reportData?.storeOrderReport;
  const totals = report?.totals;
  const buckets: any[] = report?.buckets ?? [];
  const collection = collectionData?.storeCollectionSummary;

  return (
    <SafeAreaView edges={["bottom", "left", "right"]} style={{ backgroundColor: appTheme.themeBackground }} className="flex-1">
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
        <Text className="text-2xl font-bold" style={{ color: appTheme.fontMainColor }}>
          {t("Reports")}
        </Text>
        <Text className="text-sm mt-1 mb-4" style={{ color: appTheme.fontSecondColor }}>
          {t("Orders, collection and cancellations for your store.")}
        </Text>

        <Chips
          options={[
            { key: "WEEK", label: t("This Week") },
            { key: "MONTH", label: t("This Month") },
            { key: "YEAR", label: t("This Year") },
          ]}
          value={rangeKey}
          onChange={(v) => setRangeKey(v as RangeKey)}
        />
        <View className="h-2" />
        <Chips
          options={[
            { key: "DAY", label: t("Day-wise") },
            { key: "MONTH", label: t("Month-wise") },
          ]}
          value={groupBy}
          onChange={(v) => setGroupBy(v as GroupBy)}
        />

        {/* Orders summary */}
        <Section title={t("Orders")}>
          {loadingReport && !totals ? (
            <SpinnerComponent />
          ) : (
            <>
              <View className="flex-row flex-wrap">
                <Stat label={t("Total orders")} value={String(totals?.orders ?? 0)} />
                <Stat label={t("Delivered")} value={String(totals?.delivered ?? 0)} />
                <Stat label={t("Cancelled")} value={String(totals?.cancelled ?? 0)} />
                <Stat label={t("Pickup")} value={String(totals?.pickup ?? 0)} />
                <Stat label={t("My delivery")} value={String(totals?.selfDelivery ?? 0)} />
                <Stat label={t("LocalSell fleet")} value={String(totals?.platformDelivery ?? 0)} />
                <Stat label={t("Gross sales")} value={format(totals?.grossSales ?? 0)} />
                <Stat label={t("Net earnings")} value={format(totals?.netEarnings ?? 0)} />
              </View>

              <View className="mt-3">
                {buckets.map((b) => (
                  <View
                    key={b.bucket}
                    className="flex-row items-center justify-between py-2.5 border-b-[0.5px]"
                    style={{ borderColor: appTheme.borderLineColor }}
                  >
                    <Text className="text-sm" style={{ color: appTheme.fontMainColor }}>
                      {b.label}
                    </Text>
                    <Text className="text-xs" style={{ color: appTheme.fontSecondColor }}>
                      {b.delivered}✓ · {b.cancelled}✕ · {format(b.netEarnings)}
                    </Text>
                  </View>
                ))}
                {buckets.length === 0 && !loadingReport && (
                  <Text className="text-sm py-3" style={{ color: appTheme.fontSecondColor }}>
                    {t("No orders in this period")}
                  </Text>
                )}
              </View>
            </>
          )}
        </Section>

        {/* Collection (COD cash reconciliation) */}
        <Section title={t("Collection — cash you hold")}>
          {loadingCollection && !collection ? (
            <SpinnerComponent />
          ) : (
            <>
              <View className="flex-row flex-wrap">
                <Stat label={t("COD cash collected")} value={format(collection?.codCashCollected ?? 0)} />
                <Stat label={t("Commission owed")} value={format(collection?.commissionOwed ?? 0)} />
                <Stat label={t("GST collected")} value={format(collection?.gstCollected ?? 0)} />
                <Stat label={t("Net after commission")} value={format(collection?.netAfterCommission ?? 0)} />
                <Stat label={t("Unbilled commission")} value={format(collection?.unbilledCommission ?? 0)} />
                <Stat label={t("Outstanding bills")} value={format(collection?.outstandingBillsTotal ?? 0)} />
              </View>
              {(collection?.outstandingBills ?? []).map((bill: any) => (
                <View
                  key={bill._id}
                  className="flex-row items-center justify-between py-2.5 border-b-[0.5px]"
                  style={{ borderColor: appTheme.borderLineColor }}
                >
                  <Text className="text-sm" style={{ color: appTheme.fontMainColor }}>
                    {bill.invoiceNumber || bill._id.slice(-6)}
                  </Text>
                  <Text className="text-xs" style={{ color: appTheme.fontSecondColor }}>
                    {format(bill.commissionTotal)} · {bill.status}
                  </Text>
                </View>
              ))}
            </>
          )}
        </Section>
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
    <View className="flex-row gap-2">
      {options.map((o) => {
        const active = o.key === value;
        return (
          <TouchableOpacity
            key={o.key}
            onPress={() => onChange(o.key)}
            className="px-4 py-2 rounded-full border"
            style={{
              borderColor: active ? appTheme.primary : appTheme.borderLineColor,
              backgroundColor: active ? appTheme.primary : "transparent",
            }}
          >
            <Text className="text-xs font-semibold" style={{ color: active ? appTheme.white : appTheme.fontSecondColor }}>
              {o.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { appTheme } = useApptheme();
  return (
    <View
      className="rounded-2xl border p-4 mt-5"
      style={{ borderColor: appTheme.borderLineColor, backgroundColor: appTheme.cartContainer }}
    >
      <Text className="text-base font-bold mb-3" style={{ color: appTheme.fontMainColor }}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const { appTheme } = useApptheme();
  return (
    <View className="w-1/2 mb-3 pr-2">
      <Text className="text-xs" style={{ color: appTheme.fontSecondColor }}>
        {label}
      </Text>
      <Text className="text-base font-semibold mt-0.5" style={{ color: appTheme.fontMainColor }}>
        {value}
      </Text>
    </View>
  );
}
