// Core
import { useEffect, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import ReactNativeModal from "react-native-modal";

// GraphQL
import { useMutation, useQuery } from "@apollo/client";
import { RIDER_CASH_SUMMARY } from "@/lib/apollo/queries";
import { RIDER_REPORT_DEPOSIT } from "@/lib/apollo/mutations/withdraw-request.mutation";

// Hooks
import { useApptheme } from "@/lib/context/global/theme.context";
import { useUserContext } from "@/lib/context/global/user.context";
import { useTranslation } from "react-i18next";

// Components
import { FlashMessageComponent, NoRecordFound } from "@/lib/ui/useable-components";
import SpinnerComponent from "@/lib/ui/useable-components/spinner";

const inrFmt = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const money = (n: number) => `₹${inrFmt.format(Number.isFinite(n) ? n : 0)}`;
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

  const [showReport, setShowReport] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("upi");
  const [reference, setReference] = useState("");

  const [reportDeposit, { loading: reporting }] = useMutation(RIDER_REPORT_DEPOSIT, {
    onCompleted: () => {
      FlashMessageComponent({ message: t("Deposit reported — waiting for admin to confirm") });
      setShowReport(false);
      setAmount("");
      setReference("");
      refetch();
    },
    onError: (e) =>
      FlashMessageComponent({
        message: e.message || e.graphQLErrors?.[0]?.message || t("Something went wrong"),
      }),
  });

  useEffect(() => {
    if (userId) refetch();
  }, [userId]);

  const s = data?.riderCashSummary;
  const openEntries = (s?.entries ?? []).filter((e: { remitted: boolean }) => !e.remitted);
  const pendingDeposit = s?.pendingDepositTotal ?? 0;

  const submitReport = () => {
    const value = parseFloat(amount);
    if (Number.isNaN(value) || value <= 0) {
      FlashMessageComponent({ message: t("Enter the amount you deposited") });
      return;
    }
    reportDeposit({ variables: { amount: value, method, reference: reference || null } });
  };

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
            "Hand the full COD cash you collected to the admin — your fees and tips are paid separately into your wallet",
          )}
        </Text>
        {!!s?.cashLimit && (
          <View className="w-full mt-1">
            <View
              className="h-2 rounded-full overflow-hidden"
              style={{ backgroundColor: appTheme.borderLineColor }}
            >
              <View
                style={{
                  width: `${Math.min(100, ((s?.outstanding ?? 0) / s.cashLimit) * 100)}%`,
                  height: "100%",
                  backgroundColor:
                    (s?.outstanding ?? 0) >= s.cashLimit ? "#C0392B" : appTheme.primary,
                }}
              />
            </View>
            <Text
              className="text-center text-[11px] mt-1"
              style={{ color: appTheme.secondaryTextColor }}
            >
              {money(s?.outstanding ?? 0)} / {money(s.cashLimit)} —{" "}
              {(s?.outstanding ?? 0) >= s.cashLimit
                ? t("deposit to take cash orders again")
                : t("cash order limit")}
            </Text>
          </View>
        )}
      </View>

      {/* Report a deposit */}
      <View className="mx-4 mb-2">
        {pendingDeposit > 0 && (
          <Text
            className="text-center text-[12px] mb-2"
            style={{ color: appTheme.secondaryTextColor }}
          >
            {money(pendingDeposit)} {t("reported, waiting for admin to confirm")}
          </Text>
        )}
        <TouchableOpacity
          onPress={() => setShowReport(true)}
          disabled={(s?.outstanding ?? 0) <= 0}
          className="p-3 rounded-lg items-center"
          style={{
            backgroundColor: (s?.outstanding ?? 0) > 0 ? appTheme.primary : appTheme.borderLineColor,
          }}
        >
          <Text className="font-semibold text-[14px]" style={{ color: appTheme.white }}>
            {t("I deposited cash")}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Wallet vs held */}
      <View
        className="flex-row justify-around mx-4 mb-2 p-4 rounded-lg"
        style={{ backgroundColor: appTheme.themeBackground }}
      >
        <View className="items-center">
          <Text className="text-[12px]" style={{ color: appTheme.secondaryTextColor }}>
            {t("Wallet balance")}
          </Text>
          <Text className="font-semibold text-[16px]" style={{ color: appTheme.fontMainColor }}>
            {money(s?.walletBalance ?? 0)}
          </Text>
        </View>
        <View className="items-center">
          <Text className="text-[12px]" style={{ color: appTheme.secondaryTextColor }}>
            {t("Available to withdraw")}
          </Text>
          <Text className="font-semibold text-[16px]" style={{ color: appTheme.fontMainColor }}>
            {money(s?.availableToWithdraw ?? 0)}
          </Text>
        </View>
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
                  {day(e.deliveredAt)} · {t("cash")} {money(e.collectedTotal)} · {t("to wallet")}{" "}
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
              (r: {
                _id: string;
                createdAt: string;
                method: string | null;
                entryCount: number;
                amount: number;
                status?: string;
              }) => (
                <View
                  key={r._id}
                  className="flex-row justify-between items-center px-5 py-3 border-b-[0.5px]"
                  style={{ borderColor: appTheme.borderLineColor }}
                >
                  <Text className="text-[13px]" style={{ color: appTheme.secondaryTextColor }}>
                    {day(r.createdAt)} · {r.method || t("cash")}
                    {r.status && r.status !== "CONFIRMED" ? ` · ${t(r.status)}` : ""}
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

      <ReactNativeModal
        isVisible={showReport}
        onBackdropPress={() => setShowReport(false)}
        avoidKeyboard
      >
        <View className="p-5 rounded-lg" style={{ backgroundColor: appTheme.themeBackground }}>
          <Text className="font-semibold text-[16px] mb-3" style={{ color: appTheme.fontMainColor }}>
            {t("I deposited cash")}
          </Text>
          <Text className="text-[12px] mb-1" style={{ color: appTheme.secondaryTextColor }}>
            {t("Amount")} (₹) — {t("you owe")} {money(s?.outstanding ?? 0)}
          </Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder={money(s?.outstanding ?? 0)}
            placeholderTextColor={appTheme.secondaryTextColor}
            className="border rounded px-3 py-2 mb-3"
            style={{ borderColor: appTheme.borderLineColor, color: appTheme.fontMainColor }}
          />
          <View className="flex-row gap-2 mb-3">
            {["upi", "bank", "cash"].map((m) => (
              <TouchableOpacity
                key={m}
                onPress={() => setMethod(m)}
                className="px-3 py-1 rounded-full border"
                style={{
                  borderColor: appTheme.borderLineColor,
                  backgroundColor: method === m ? appTheme.primary : "transparent",
                }}
              >
                <Text
                  className="text-[12px] capitalize"
                  style={{ color: method === m ? "#fff" : appTheme.fontMainColor }}
                >
                  {m}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            value={reference}
            onChangeText={setReference}
            placeholder={t("Reference / UPI txn no. (optional)")}
            placeholderTextColor={appTheme.secondaryTextColor}
            className="border rounded px-3 py-2 mb-4"
            style={{ borderColor: appTheme.borderLineColor, color: appTheme.fontMainColor }}
          />
          <TouchableOpacity
            onPress={submitReport}
            disabled={reporting}
            className="p-3 rounded-lg items-center"
            style={{ backgroundColor: appTheme.primary, opacity: reporting ? 0.6 : 1 }}
          >
            <Text className="font-semibold text-[14px]" style={{ color: "#fff" }}>
              {t("Submit")}
            </Text>
          </TouchableOpacity>
        </View>
      </ReactNativeModal>
    </ScrollView>
  );
}
