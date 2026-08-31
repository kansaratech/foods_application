// Core
import { SafeAreaView } from "react-native-safe-area-context";

// Components
import { useApptheme } from "@/lib/context/theme.context";
import EarningsMain from "../../screen-components/earnings/view/main";

export default function EarningsScreen() {
  // Hooks
  const { appTheme } = useApptheme();
  return (
    <SafeAreaView edges={["bottom", "left", "right"]}
      style={{ backgroundColor: appTheme.themeBackground }}
      className="h-full w-full"
    >
      <EarningsMain />
    </SafeAreaView>
  );
}
