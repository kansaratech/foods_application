import { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useMutation } from "@apollo/client";
import { useTranslation } from "react-i18next";
import { showMessage } from "react-native-flash-message";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useApptheme } from "@/lib/context/theme.context";
import { useUserContext } from "@/lib/context/global/user.context";
import { STORE_PROFILE } from "@/lib/apollo/queries";
import { UPDATE_DELIVERY_OPTIONS } from "@/lib/apollo/mutations/delivery.mutation";
import CustomSwitch from "@/lib/ui/useable-components/switch-button";
import SpinnerComponent from "@/lib/ui/useable-components/spinner";

type Provider = "PLATFORM" | "SELF" | "BOTH";

const PROVIDERS: { value: Provider; title: string; hint: string }[] = [
  { value: "PLATFORM", title: "LocalSell delivery fleet", hint: "The LocalSell hyperlocal riders pick up and deliver every order." },
  { value: "SELF", title: "My own delivery people", hint: "You deliver with your own staff. Add them under Delivery Staff." },
  { value: "BOTH", title: "Both — I choose per order", hint: "Assign your own person or push the order to the LocalSell fleet after you accept it." },
];

export default function DeliverySettingsScreen() {
  const { appTheme } = useApptheme();
  const { t } = useTranslation();
  const { userId: restaurantId, dataProfile, refetchProfile, loadingProfile } = useUserContext();

  const [pickup, setPickup] = useState(true);
  const [delivery, setDelivery] = useState(true);
  const [provider, setProvider] = useState<Provider>("PLATFORM");

  useEffect(() => {
    if (!dataProfile) return;
    setPickup(dataProfile.pickup ?? true);
    setDelivery(dataProfile.delivery ?? true);
    setProvider((dataProfile.deliveryProvider as Provider) ?? "PLATFORM");
  }, [dataProfile]);

  const [save, { loading: saving }] = useMutation(UPDATE_DELIVERY_OPTIONS, {
    refetchQueries: [{ query: STORE_PROFILE, variables: { restaurantId } }],
    onCompleted: () => {
      showMessage({ message: t("Delivery settings updated"), type: "success" });
      refetchProfile?.();
    },
    onError: (e) => showMessage({ message: e.message, type: "danger" }),
  });

  const dirty = useMemo(
    () =>
      !dataProfile ||
      pickup !== (dataProfile.pickup ?? true) ||
      delivery !== (dataProfile.delivery ?? true) ||
      provider !== ((dataProfile.deliveryProvider as Provider) ?? "PLATFORM"),
    [dataProfile, pickup, delivery, provider],
  );

  const onSave = () => {
    if (!pickup && !delivery) {
      showMessage({ message: t("Enable at least one of pickup or delivery"), type: "warning" });
      return;
    }
    save({ variables: { restId: restaurantId, pickup, delivery, deliveryProvider: provider } });
  };

  return (
    <SafeAreaView edges={["bottom", "left", "right"]} style={{ backgroundColor: appTheme.themeBackground }} className="flex-1">
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
        <Text className="text-2xl font-bold" style={{ color: appTheme.fontMainColor }}>
          {t("Delivery Settings")}
        </Text>
        <Text className="text-sm mt-1 mb-6" style={{ color: appTheme.fontSecondColor }}>
          {t("Control how customers can receive orders from your store.")}
        </Text>

        {loadingProfile && !dataProfile ? (
          <SpinnerComponent />
        ) : (
          <>
            <View
              className="rounded-2xl border px-4 py-2 mb-6"
              style={{ borderColor: appTheme.borderLineColor, backgroundColor: appTheme.cartContainer }}
            >
              <Row label={t("Pickup")} hint={t("Customers collect the order at your store.")}>
                <CustomSwitch value={pickup} onToggle={setPickup} />
              </Row>
              <View style={{ height: 1, backgroundColor: appTheme.borderLineColor }} />
              <Row label={t("Delivery")} hint={t("The order is delivered to the customer's address.")}>
                <CustomSwitch value={delivery} onToggle={setDelivery} />
              </Row>
            </View>

            {delivery && (
              <>
                <Text className="text-base font-semibold mb-3" style={{ color: appTheme.fontMainColor }}>
                  {t("Who delivers?")}
                </Text>
                {PROVIDERS.map((p) => {
                  const active = provider === p.value;
                  return (
                    <TouchableOpacity
                      key={p.value}
                      onPress={() => setProvider(p.value)}
                      className="rounded-2xl border px-4 py-4 mb-3 flex-row items-start gap-3"
                      style={{
                        borderColor: active ? appTheme.primary : appTheme.borderLineColor,
                        backgroundColor: active ? appTheme.lowOpacityPrimaryColor : appTheme.cartContainer,
                      }}
                    >
                      <Ionicons
                        name={active ? "radio-button-on" : "radio-button-off"}
                        size={20}
                        color={active ? appTheme.primary : appTheme.fontSecondColor}
                      />
                      <View className="flex-1">
                        <Text className="text-sm font-semibold" style={{ color: appTheme.fontMainColor }}>
                          {t(p.title)}
                        </Text>
                        <Text className="text-xs mt-1" style={{ color: appTheme.fontSecondColor }}>
                          {t(p.hint)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </>
            )}

            <TouchableOpacity
              disabled={!dirty || saving}
              onPress={onSave}
              className="h-14 rounded-2xl items-center justify-center mt-4"
              style={{ backgroundColor: !dirty || saving ? appTheme.secondaryTextColor : appTheme.primary }}
            >
              {saving ? (
                <SpinnerComponent color={appTheme.white} />
              ) : (
                <Text className="text-base font-semibold" style={{ color: appTheme.white }}>
                  {t("Save changes")}
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  const { appTheme } = useApptheme();
  return (
    <View className="flex-row items-center justify-between py-4">
      <View className="flex-1 pr-4">
        <Text className="text-sm font-semibold" style={{ color: appTheme.fontMainColor }}>
          {label}
        </Text>
        <Text className="text-xs mt-1" style={{ color: appTheme.fontSecondColor }}>
          {hint}
        </Text>
      </View>
      {children}
    </View>
  );
}
