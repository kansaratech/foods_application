import { useApptheme } from "@/lib/context/theme.context";
import { Ionicons } from "@expo/vector-icons";
import { ScrollView, Text, View } from "react-native";

const sections = [
  {
    title: "Information we use",
    text: "We process restaurant profile details, staff account information, menu content, order activity, device information and settlement records needed to provide the merchant service.",
  },
  {
    title: "How information is used",
    text: "Information is used to authenticate accounts, operate orders, maintain menus, calculate earnings, support settlements, prevent abuse and improve service reliability.",
  },
  {
    title: "Sharing and service providers",
    text: "Information may be shared with delivery participants and trusted infrastructure, payment, notification and support providers only when required to operate the service or meet legal obligations.",
  },
  {
    title: "Security and retention",
    text: "We use access controls and technical safeguards appropriate to the information handled. Records are retained only for operational, contractual and legal requirements.",
  },
  {
    title: "Your choices",
    text: "Restaurant administrators can review and update store information in the app. For access, correction or deletion requests that are not available in the app, contact your LocalSell account manager.",
  },
];

export default function PrivacyPolicy() {
  const { appTheme } = useApptheme();

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: appTheme.themeBackground }}
      contentContainerStyle={{ padding: 24, paddingBottom: 96 }}
    >
      <View className="w-full max-w-4xl self-center">
        <View className="rounded-3xl p-8" style={{ backgroundColor: appTheme.brand }}>
          <View className="h-12 w-12 rounded-2xl bg-white/10 items-center justify-center mb-5">
            <Ionicons name="shield-checkmark-outline" size={25} color="#BFD6F7" />
          </View>
          <Text className="text-white text-4xl font-bold">Privacy at LocalSell</Text>
          <Text className="text-white/75 text-base leading-7 mt-4">
            A clear overview of how information is handled in the LocalSell Merchant service.
          </Text>
          <Text className="text-[#BFD6F7] text-xs font-semibold mt-5">Updated 29 August 2026</Text>
        </View>

        <View
          className="rounded-3xl border px-7 mt-6"
          style={{ backgroundColor: appTheme.cartContainer, borderColor: appTheme.borderLineColor }}
        >
          {sections.map((section, index) => (
            <View
              key={section.title}
              className="py-6"
              style={{
                borderBottomWidth: index === sections.length - 1 ? 0 : 1,
                borderBottomColor: appTheme.borderLineColor,
              }}
            >
              <Text className="text-lg font-bold" style={{ color: appTheme.fontMainColor }}>
                {section.title}
              </Text>
              <Text className="text-sm leading-6 mt-2" style={{ color: appTheme.fontSecondColor }}>
                {section.text}
              </Text>
            </View>
          ))}
        </View>

        <View className="rounded-3xl p-6 mt-6" style={{ backgroundColor: appTheme.lowOpacityPrimaryColor }}>
          <Text className="font-bold" style={{ color: appTheme.fontMainColor }}>Questions about privacy?</Text>
          <Text className="text-sm leading-6 mt-2" style={{ color: appTheme.fontSecondColor }}>
            Contact your LocalSell account manager for privacy questions or account-data requests.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
