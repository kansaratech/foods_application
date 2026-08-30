import { useApptheme } from "@/lib/context/theme.context";
import { ActivityIndicator, Text, View } from "react-native";

export default function OrderLoader({ label = "Loading orders" }: { label?: string }) {
  const { appTheme } = useApptheme();

  return (
    <View className="flex-1 items-center justify-center px-6">
      <View
        className="min-w-72 items-center rounded-3xl border px-10 py-9"
        style={{
          backgroundColor: appTheme.cartContainer,
          borderColor: appTheme.borderLineColor,
        }}
      >
        <View
          className="h-14 w-14 rounded-full items-center justify-center"
          style={{ backgroundColor: appTheme.lowOpacityPrimaryColor }}
        >
          <ActivityIndicator size="small" color={appTheme.primary} />
        </View>
        <Text className="text-base font-semibold mt-4" style={{ color: appTheme.fontMainColor }}>
          {label}
        </Text>
        <Text className="text-xs mt-2" style={{ color: appTheme.fontSecondColor }}>
          Fetching the latest information…
        </Text>
      </View>
    </View>
  );
}
