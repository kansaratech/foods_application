import { useUserContext } from "@/lib/context/global/user.context";
import { useApptheme } from "@/lib/context/theme.context";
import { Ionicons } from "@expo/vector-icons";
import { Image, Text, View } from "react-native";

export default function ProfileHeader() {
  const { appTheme } = useApptheme();
  const { dataProfile } = useUserContext();

  const initials = (() => {
    const name = dataProfile?.name;
    if (!name || typeof name !== "string") return "SR";
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
  })();

  const isAvailable = !!dataProfile?.isAvailable;

  return (
    <View className="w-full max-w-6xl self-center px-5 pt-6">
      <View
        className="rounded-3xl px-5 py-5 border"
        style={{
          backgroundColor: appTheme.cartContainer,
          borderColor: appTheme.borderLineColor,
        }}
      >
        <View className="flex-row items-center">
          <View
            className="h-16 w-16 rounded-2xl items-center justify-center overflow-hidden"
            style={{ backgroundColor: appTheme.brand }}
          >
            {dataProfile?.logo ? (
              <Image
                source={{ uri: dataProfile.logo }}
                style={{ width: 64, height: 64 }}
                resizeMode="cover"
              />
            ) : (
              <Text className="text-white text-lg font-bold">{initials}</Text>
            )}
          </View>
          <View className="ml-4 flex-1">
            <Text
              className="text-lg font-bold"
              style={{ color: appTheme.fontMainColor }}
              numberOfLines={2}
            >
              {dataProfile?.name ?? "Restaurant profile"}
            </Text>
            <Text
              className="text-xs mt-0.5"
              style={{ color: appTheme.fontSecondColor }}
              numberOfLines={1}
            >
              Store profile and business settings
            </Text>
          </View>
        </View>

        <View
          className="self-start flex-row items-center rounded-full px-3 py-1.5 mt-4"
          style={{ backgroundColor: isAvailable ? "#DCFCE7" : "#FEF3C7" }}
        >
          <Ionicons
            name={isAvailable ? "checkmark-circle" : "pause-circle"}
            size={15}
            color={isAvailable ? "#15803D" : "#B45309"}
          />
          <Text
            className="text-xs font-semibold ml-1.5"
            style={{ color: isAvailable ? "#15803D" : "#B45309" }}
          >
            {isAvailable ? "Accepting orders" : "Store offline"}
          </Text>
        </View>
      </View>
    </View>
  );
}
