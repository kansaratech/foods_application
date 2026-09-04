import { useApptheme } from "@/lib/context/theme.context";
import { Ionicons } from "@expo/vector-icons";
import { ScrollView, Text, View } from "react-native";

const features = [
  {
    icon: "receipt-outline" as const,
    title: "Order operations",
    text: "Receive, prepare and complete delivery or pickup orders from one focused workspace.",
  },
  {
    icon: "restaurant-outline" as const,
    title: "Menu management",
    text: "Keep categories, products, add-ons and availability accurate throughout the day.",
  },
  {
    icon: "wallet-outline" as const,
    title: "Business visibility",
    text: "Review earnings, settlements and store information without switching tools.",
  },
];

export default function AboutLocalSell() {
  const { appTheme } = useApptheme();

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: appTheme.themeBackground }}
      contentContainerStyle={{ padding: 24, paddingBottom: 96 }}
    >
      <View className="w-full max-w-5xl self-center">
        <View className="rounded-3xl p-8 overflow-hidden" style={{ backgroundColor: appTheme.brand }}>
          <View className="self-start rounded-full bg-white/10 px-4 py-2 mb-5">
            <Text className="text-[#BFD6F7] text-sm font-semibold">LocalSell Merchant</Text>
          </View>
          <Text className="text-white text-4xl font-bold">Made for busy restaurant teams</Text>
          <Text className="text-white/75 text-base leading-7 mt-4 max-w-3xl">
            LocalSell brings daily store operations together so owners and teams can spend less time managing tools and more time serving customers.
          </Text>
        </View>

        <View className="mt-7">
          <Text className="text-2xl font-bold" style={{ color: appTheme.fontMainColor }}>
            One place to run your store
          </Text>
          <Text className="text-sm mt-2" style={{ color: appTheme.fontSecondColor }}>
            Clear tools, dependable workflows and the information your team needs now.
          </Text>
          <View className="flex-row flex-wrap gap-4 mt-5">
            {features.map((feature) => (
              <View
                key={feature.title}
                className="min-w-64 flex-1 rounded-3xl border p-6"
                style={{ backgroundColor: appTheme.cartContainer, borderColor: appTheme.borderLineColor }}
              >
                <View
                  className="h-12 w-12 rounded-2xl items-center justify-center"
                  style={{ backgroundColor: appTheme.lowOpacityPrimaryColor }}
                >
                  <Ionicons name={feature.icon} size={23} color={appTheme.primary} />
                </View>
                <Text className="text-lg font-bold mt-5" style={{ color: appTheme.fontMainColor }}>
                  {feature.title}
                </Text>
                <Text className="text-sm leading-6 mt-2" style={{ color: appTheme.fontSecondColor }}>
                  {feature.text}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View
          className="rounded-3xl border p-6 mt-7 flex-row items-center"
          style={{ backgroundColor: appTheme.cartContainer, borderColor: appTheme.borderLineColor }}
        >
          <Ionicons name="help-circle-outline" size={28} color={appTheme.primary} />
          <View className="ml-4 flex-1">
            <Text className="font-bold" style={{ color: appTheme.fontMainColor }}>Need assistance?</Text>
            <Text className="text-sm mt-1" style={{ color: appTheme.fontSecondColor }}>
              Open Help from the menu or contact your LocalSell account manager.
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
