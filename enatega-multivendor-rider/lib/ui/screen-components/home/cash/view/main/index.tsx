// Core
import { useEffect } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";

// GraphQL
import { useQuery } from "@apollo/client";
import { RIDER_CASH_SUMMARY } from "@/lib/apollo/queries";

// Hooks
import { useApptheme } from "@/lib/context/global/theme.context";
import { useUserContext } from "@/lib/context/global/user.context";
import { useTranslation } from "react-i18next";

// Components
import { NoRecordFound } from "@/lib/ui/useable-components";
import SpinnerComponent from "@/lib/ui/useable-components/spinner";

const money = (n: number) => `₹${(n ?? 0).toFixed(2)}`;
const day = (d: string) =>
  new Date(d).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });

export default function CashMain() {
  const { appTheme } = useApptheme();
  const { t } = useTranslation();
  const { userId } = useUserContext();

  const { data, loading, refetch } = useQuery(RIDER_CASH_SUMMARY, {
    variables: { riderId: userId },
    skip: !userId,
    fetchPolicy: "cache-and-network",
  });

  useEffect(() => {
    if (userId) refetch();
  }, [userId]);

  const s = data?.riderCashSummary;
  const openEntries = (s?.entries ?? []).filter((e: { remitted: boolean }) => !e.remitted);

  if (loading && !s) return <SpinnerComponent />;

  return (
    <ScrollView
      className="w-full h-full"
      style={{ backgroundColor: appTheme.screenBackground }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => refetch()} />}
    >
      {/* Outstanding card */}
      <View
        className="flex flex-col gap-2 items-center m-4 p-5 rounded-lg"
        style={{ backgroundColor: appTheme.themeBackground }}
      >
        <Text className="text-[16px] font-[600]" style={{ color: appTheme.secondaryTextColor }}>
          {t("Cash you owe the platform")}
        </Text>
        <Text className="font-semibold text-[32px]" style={{ color: appTheme.fontMainColor }}>
          {money(s?.outstanding ?? 0)}
        </Text>
        <Text className="text-center text-[12px]" style={{ color: appTheme.secondaryTextColor }}>
          {t(
            "COD cash you collected on delivery, minus your fees and tips — hand it to the admin to settle",
          )}
        </Text>
      </View>

      {/* Lifetime */}
      <View
        className="flex-row justify-around mx-4 mb-2 p-4 rounded-lg"
        style={{ backgroundColor: appTheme.themeBackground }}
      >
        <View className="items-center">
          <Text className="text-[12px]" style={{ color: appTheme.secondaryTextColor }}>
            {t("Lifetime collected")}
          </Text>
          <Text className="font-semibold text-[16px]" style={{ color: appTheme.fontMainColor }}>
            {money(s?.lifetimeCollected ?? 0)}
          </Text>
        </View>
        <View className="items-center">
          <Text className="text-[12px]" style={{ color: appTheme.secondaryTextColor }}>
            {t("Lifetime handed over")}
          </Text>
          <Text className="font-semibold text-[16px]" style={{ color: appTheme.fontMainColor }}>
            {money(s?.lifetimeRemitted ?? 0)}
          </Text>
        </View>
      </View>

      {/* Unsettled deliveries */}
      <Text
        className="font-bold text-[15px] px-5 py-3 mt-2"
        style={{
          backgroundColor: appTheme.themeBackground,
          color: appTheme.fontMainColor,
          borderBottomColor: appTheme.borderLineColor,
          borderBottomWidth: 1,
        }}
      >
        {t("Unsettled deliveries")}
      </Text>
      <View style={{ backgroundColor: appTheme.themeBackground }}>
        {openEntries.map(
          (e: {
            _id: string;
            orderNumber: string;
            deliveredAt: string;
            collectedTotal: number;
            riderKeeps: number;
            owedToPlatform: number;
          }) => (
            <View
              key={e._id}
              className="flex-row justify-between items-center px-5 py-3 border-b-[0.5px]"
              style={{ borderColor: appTheme.borderLineColor }}
            >
              <View>
                <Text className="font-semibold text-[14px]" style={{ color: appTheme.fontMainColor }}>
                  {e.orderNumber}
                </Text>
                <Text className="text-[12px]" style={{ color: appTheme.secondaryTextColor }}>
                  {day(e.deliveredAt)} · {t("collected")} {money(e.collectedTotal)} · {t("you kept")}{" "}
                  {money(e.riderKeeps)}
                </Text>
              </View>
              <Text className="font-bold text-[15px]" style={{ color: appTheme.fontMainColor }}>
                {money(e.owedToPlatform)}
              </Text>
            </View>
          ),
        )}
        {!openEntries.length && <NoRecordFound />}
      </View>

      {/* Remittance history */}
      {!!s?.remittances?.length && (
        <>
          <Text
            className="font-bold text-[15px] px-5 py-3 mt-4"
            style={{
              backgroundColor: appTheme.themeBackground,
              color: appTheme.fontMainColor,
              borderBottomColor: appTheme.borderLineColor,
              borderBottomWidth: 1,
            }}
          >
            {t("Handovers")}
          </Text>
          <View style={{ backgroundColor: appTheme.themeBackground }}>
            {s.remittances.map(
              (r: { _id: string; createdAt: string; method: string | null; entryCount: number; amount: number }) => (
                <View
                  key={r._id}
                  className="flex-row justify-between items-center px-5 py-3 border-b-[0.5px]"
                  style={{ borderColor: appTheme.borderLineColor }}
                >
                  <Text className="text-[13px]" style={{ color: appTheme.secondaryTextColor }}>
                    {day(r.createdAt)} · {r.method || t("cash")} · {r.entryCount} {t("deliveries")}
                  </Text>
                  <Text className="font-semibold text-[14px]" style={{ color: appTheme.fontMainColor }}>
                    {money(r.amount)}
                  </Text>
                </View>
              ),
            )}
          </View>
        </>
      )}

      <View className="h-10" />
    </ScrollView>
  );
}
