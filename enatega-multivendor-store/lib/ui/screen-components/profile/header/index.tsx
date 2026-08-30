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
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
  })();

  return (
    <View className="w-full max-w-6xl self-center px-5 pt-7">
      <View
        className="rounded-3xl px-6 py-6 flex-row items-center justify-between border"
        style={{
          backgroundColor: appTheme.cartContainer,
          borderColor: appTheme.borderLineColor,
        }}
      >
        <View className="flex-row items-center flex-1">
          <View
            className="h-20 w-20 rounded-3xl items-center justify-center overflow-hidden"
            style={{ backgroundColor: "#8F173F" }}
          >
            {dataProfile?.logo ? (
              <Image
                source={{ uri: dataProfile.logo }}
                style={{ width: 80, height: 80 }}
                resizeMode="cover"
              />
            ) : (
              <Text className="text-white text-xl font-bold">{initials}</Text>
            )}
          </View>
          <View className="ml-5 flex-1">
            <Text
              className="text-2xl font-bold"
              style={{ color: appTheme.fontMainColor }}
            >
              {dataProfile?.name ?? "Restaurant profile"}
            </Text>
            <Text
              className="text-sm mt-1"
              style={{ color: appTheme.fontSecondColor }}
            >
              Store profile and business settings
            </Text>
          </View>
        </View>

        <View
          className="flex-row items-center rounded-full px-4 py-2"
          style={{
            backgroundColor: dataProfile?.isAvailable
              ? "#DCFCE7"
              : "#FEF3C7",
          }}
        >
          <Ionicons
            name={dataProfile?.isAvailable ? "checkmark-circle" : "pause-circle"}
            size={16}
            color={dataProfile?.isAvailable ? "#15803D" : "#B45309"}
          />
          <Text
            className="text-sm font-semibold ml-2"
            style={{ color: dataProfile?.isAvailable ? "#15803D" : "#B45309" }}
          >
            {dataProfile?.isAvailable ? "Accepting orders" : "Store offline"}
          </Text>
        </View>
      </View>
    </View>
  );
}
