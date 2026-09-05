import { useApptheme } from "@/lib/context/theme.context";
import { ProfileScreen } from "@/lib/ui/screens";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Profile() {
  const { appTheme } = useApptheme();

  return (
    <SafeAreaView
      className="w-full h-full"
      style={{
        backgroundColor: appTheme.themeBackground,
      }}
    >
      <ProfileScreen />
    </SafeAreaView>
  );
}
