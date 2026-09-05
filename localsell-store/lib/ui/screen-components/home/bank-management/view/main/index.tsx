import { UPDATE_BUSINESS_DETAILS } from "@/lib/apollo/mutations/store.mutation";
import { STORE_PROFILE } from "@/lib/apollo/queries/store.query";
import { useUserContext } from "@/lib/context/global/user.context";
import { useApptheme } from "@/lib/context/theme.context";
import { CustomContinueButton } from "@/lib/ui/useable-components";

import { useMutation } from "@apollo/client";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { showMessage } from "react-native-flash-message";

type FieldKey = "bankName" | "accountName" | "accountCode" | "accountNumber";

const FIELDS: {
  key: FieldKey;
  label: string;
  placeholder: string;
  numeric?: boolean;
}[] = [
  { key: "bankName", label: "Bank Name", placeholder: "e.g. State Bank of India" },
  {
    key: "accountName",
    label: "Account Name",
    placeholder: "Account holder's full name",
  },
  {
    key: "accountCode",
    label: "IBAN / SWIFT / IFSC",
    placeholder: "e.g. SBIN0001234",
  },
  {
    key: "accountNumber",
    label: "Account Number",
    placeholder: "Bank account number",
    numeric: true,
  },
];

export default function BankManagementMain() {
  const { appTheme } = useApptheme();
  const { t } = useTranslation();
  const { bottom } = useSafeAreaInsets();
  const { userId, dataProfile } = useUserContext();

  const existing = dataProfile?.bussinessDetails;
  const initial = useMemo(
    () => ({
      bankName: existing?.bankName ?? "",
      accountName: existing?.accountName ?? "",
      accountCode: existing?.accountCode ?? "",
      accountNumber: existing?.accountNumber
        ? String(existing.accountNumber)
        : "",
    }),
    [existing],
  );

  const [formData, setFormData] = useState(initial);
  const [errorField, setErrorField] = useState<FieldKey | "">("");

  useEffect(() => {
    setFormData(initial);
  }, [initial]);

  const [mutateBankDetails, { loading }] = useMutation(UPDATE_BUSINESS_DETAILS, {
    onError: () =>
      showMessage({
        message: t("Failed to update bank details"),
        type: "danger",
      }),
    onCompleted: () => {
      setErrorField("");
      showMessage({
        message: t("Your bank details have been updated successfully"),
        type: "success",
      });
    },
    refetchQueries: [
      { query: STORE_PROFILE, variables: { restaurantId: userId } },
    ],
  });

  const set = (key: FieldKey, value: string) => {
    setErrorField("");
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = () => {
    const missing = FIELDS.find((f) => !formData[f.key].trim());
    if (missing) {
      setErrorField(missing.key);
      showMessage({
        message: t(`${missing.label} is required`),
        type: "danger",
      });
      return;
    }
    mutateBankDetails({
      variables: {
        updateRestaurantBussinessDetailsId: userId,
        bussinessDetails: {
          bankName: formData.bankName.trim(),
          accountName: formData.accountName.trim(),
          accountNumber: Number(formData.accountNumber),
          accountCode: formData.accountCode.trim(),
        },
      },
    });
  };

  return (
    <KeyboardAvoidingView
      className="flex-1"
      style={{ backgroundColor: appTheme.themeBackground }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 20,
          paddingBottom: bottom + 32,
          alignItems: "center",
        }}
      >
        <View className="w-full max-w-[480px]">
          <Text
            className="text-sm mb-6"
            style={{ color: appTheme.fontSecondColor }}
          >
            {t(
              "Used for settlements and withdrawals. Only your team can see this.",
            )}
          </Text>

          <View className="gap-y-4">
            {FIELDS.map((field) => (
              <View key={field.key}>
                <Text
                  className="text-sm font-semibold mb-2"
                  style={{ color: appTheme.fontMainColor }}
                >
                  {t(field.label)}
                </Text>
                <TextInput
                  value={formData[field.key]}
                  onChangeText={(v) => set(field.key, v)}
                  placeholder={t(field.placeholder)}
                  placeholderTextColor={appTheme.fontSecondColor}
                  keyboardType={field.numeric ? "number-pad" : "default"}
                  autoCapitalize={
                    field.key === "accountCode" ? "characters" : "words"
                  }
                  className="h-12 rounded-xl border px-4 text-base outline-none"
                  style={{
                    color: appTheme.fontMainColor,
                    borderColor:
                      errorField === field.key
                        ? appTheme.textErrorColor
                        : appTheme.borderLineColor,
                    backgroundColor: appTheme.themeBackground,
                  }}
                />
              </View>
            ))}
          </View>

          <View className="mt-8">
            <CustomContinueButton
              title={loading ? t("Please wait") : t("Confirm")}
              disabled={loading}
              isLoading={loading}
              onPress={handleSubmit}
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
