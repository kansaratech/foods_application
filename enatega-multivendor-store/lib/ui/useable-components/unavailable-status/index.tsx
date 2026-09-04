import { useUserContext } from "@/lib/context/global/user.context";
import { usePathname } from "expo-router";
import { isBoolean } from "lodash";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
export default function UnavailableStatus() {
  // Hooks
  const { t } = useTranslation();
  const pathName = usePathname();
  const { dataProfile } = useUserContext();
  const insets = useSafeAreaInsets();

  // States
  const [isAvailable, setIsAvailable] = useState(true);

  // UseEffects
  useEffect(() => {
    if (!isBoolean(dataProfile?.isAvailable)) return;
    setIsAvailable(dataProfile?.isAvailable);
  }, [dataProfile?.isAvailable]);

  if (pathName === "/login") return null;
  if (!isBoolean(isAvailable)) return null;
  if (isAvailable) return null;

  return (
    <View
      style={{
        // Warning amber — matches the "Store offline" status colour used
        // elsewhere; deliberately not the brand navy so it reads as an alert.
        backgroundColor: "#B45309",
        paddingTop: insets.top - 9, // Ensures it stays below the notch
        paddingHorizontal: 16,
        paddingBottom: 5,
        position: "absolute",
        width: "100%",
        zIndex: 50,
      }}
    >
      <Text style={{ color: "white", textAlign: "center", fontWeight: "600", fontSize: 12 }}>
        {t("Store offline")} · {t("Turn on availability to receive orders")}
      </Text>
    </View>
  );
}
