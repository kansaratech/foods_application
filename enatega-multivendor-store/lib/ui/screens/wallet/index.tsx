// Core
import { SafeAreaView } from "react-native-safe-area-context";

// Components
import { useApptheme } from "@/lib/context/theme.context";
import WalletMain from "../../screen-components/wallet/view/main";

export default function WalletScreen() {
  // Hooks
  const { appTheme } = useApptheme();

  return (
    <SafeAreaView edges={["bottom", "left", "right"]}
      className="w-full h-full"
      style={{
        backgroundColor: appTheme.themeBackground,
      }}
    >
      <WalletMain />
    </SafeAreaView>
  );
}
