// Interfaces
import { IWithdrawModalProps } from "@/lib/utils/interfaces/withdraw.interface";

// Core
import { Platform, Text, TextInput, View } from "react-native";
import { ReactNativeModal } from "react-native-modal";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Components
import { CustomContinueButton } from "@/lib/ui/useable-components";

// Hooks
import { useApptheme } from "@/lib/context/theme.context";
import { useCurrency } from "@/lib/utils/methods/use-currency";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export default function WithdrawModal({
  isBottomModalOpen,
  setIsBottomModalOpen,
  currentTotal,
  handleFormSubmission,
  amountErrMsg,
  setAmountErrMsg,
  withdrawRequestLoading,
}: IWithdrawModalProps) {
  // Hooks
  const { appTheme } = useApptheme();
  const { t } = useTranslation();
  const { symbol, format } = useCurrency();
  const insets = useSafeAreaInsets();

  // States
  const [withdrawAmount, setWithdrawAmount] = useState("");

  const isWeb = Platform.OS === "web";

  function handleTextChange(val: string) {
    setWithdrawAmount(val);
    setAmountErrMsg("");
  }

  return (
    <ReactNativeModal
      isVisible={isBottomModalOpen}
      animationIn={isWeb ? "fadeIn" : "slideInUp"}
      animationOut={isWeb ? "fadeOut" : "slideOutDown"}
      onBackdropPress={() => setIsBottomModalOpen(false)}
      onBackButtonPress={() => setIsBottomModalOpen(false)}
      useNativeDriver
      backdropOpacity={0.45}
      style={{
        margin: 0,
        justifyContent: isWeb ? "center" : "flex-end",
        alignItems: "center",
      }}
    >
      <View
        style={{
          backgroundColor: appTheme.themeBackground,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.18,
          shadowRadius: 24,
          elevation: 12,
          paddingBottom: isWeb ? 20 : 20 + insets.bottom,
        }}
        className={`w-[92%] max-w-[420px] p-5 ${
          isWeb ? "rounded-3xl" : "rounded-t-3xl w-full"
        }`}
      >
        <Text
          className="text-lg font-bold mb-4"
          style={{ color: appTheme.fontMainColor }}
        >
          {t("Withdraw")}
        </Text>

        <View
          className="flex-row items-center justify-between border-b pb-3 mb-4"
          style={{ borderColor: appTheme.borderLineColor }}
        >
          <Text
            className="text-sm"
            style={{ color: appTheme.fontSecondColor }}
          >
            {t("Available Amount")}
          </Text>
          <Text
            className="text-lg font-bold"
            style={{ color: appTheme.fontMainColor }}
          >
            {format(currentTotal ?? 0)}
          </Text>
        </View>

        <Text
          className="text-sm font-semibold mb-2"
          style={{ color: appTheme.fontMainColor }}
        >
          {t("Enter Amount")}
        </Text>
        <View
          className="h-12 flex-row items-center rounded-xl border px-3"
          style={{
            borderColor: amountErrMsg
              ? appTheme.textErrorColor
              : appTheme.borderLineColor,
          }}
        >
          <Text
            className="text-base font-semibold mr-1"
            style={{ color: appTheme.fontSecondColor }}
          >
            {symbol}
          </Text>
          <TextInput
            value={withdrawAmount}
            onChangeText={handleTextChange}
            maxLength={12}
            placeholder="0.00"
            placeholderTextColor={appTheme.fontSecondColor}
            keyboardType="number-pad"
            returnKeyType="done"
            style={{ color: appTheme.fontMainColor }}
            className="flex-1 h-full text-base outline-none"
          />
        </View>
        {!!amountErrMsg && (
          <Text
            className="text-sm mt-2"
            style={{ color: appTheme.textErrorColor }}
          >
            {amountErrMsg}
          </Text>
        )}

        <CustomContinueButton
          title={
            withdrawRequestLoading ? t("Please wait") : t("Confirm Withdraw")
          }
          disabled={withdrawRequestLoading}
          onPress={() =>
            handleFormSubmission(Number(withdrawAmount)).then(() =>
              setWithdrawAmount(""),
            )
          }
          style={{ marginTop: 20 }}
        />
      </View>
    </ReactNativeModal>
  );
}
