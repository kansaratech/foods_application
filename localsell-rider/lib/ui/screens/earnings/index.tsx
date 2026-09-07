import WorkspacePage from "@/lib/ui/layouts/workspace-page";
// Hooks
import { useApptheme } from "@/lib/context/global/theme.context";

// Core
import { SafeAreaView } from "react-native-safe-area-context";

// Components
import EarningsMain from "../../screen-components/earnings/view/main";

export default function EarningsScreen() {
  // Hooks
  const { appTheme } = useApptheme();
  return (
    <WorkspacePage
      title="Earnings"
      description="Review your delivery earnings and recent activity."
    >
      <SafeAreaView
        edges={["bottom", "left", "right"]}
        style={{ backgroundColor: appTheme.screenBackground }}
      >
        <EarningsMain />
      </SafeAreaView>
    </WorkspacePage>
  );
}
