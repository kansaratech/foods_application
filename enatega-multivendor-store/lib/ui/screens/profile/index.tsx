// Components
import { useApptheme } from "@/lib/context/theme.context";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ProfileHeader from "../../screen-components/profile/header";
import ProfileMain from "../../screen-components/profile/view/main";

export default function ComponentName() {
  const { appTheme } = useApptheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      className="w-full h-full"
      style={{
        backgroundColor: appTheme.themeBackground,
        paddingTop: insets.top,
      }}
    >
      <View className="w-full max-w-6xl self-center px-5 pt-7">
        <Text className="text-3xl font-bold" style={{ color: appTheme.fontMainColor }}>
          Profile
        </Text>
        <Text className="text-sm mt-1" style={{ color: appTheme.fontSecondColor }}>
          Review your restaurant details and account preferences.
        </Text>
      </View>
      <ProfileHeader />
      <ProfileMain />
    </View>
  );
}
