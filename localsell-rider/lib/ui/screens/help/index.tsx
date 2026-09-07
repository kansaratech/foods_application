import WorkspacePage from "@/lib/ui/layouts/workspace-page";
// Core
import { SafeAreaView } from "react-native-safe-area-context";

// Components
import { useApptheme } from "@/lib/context/global/theme.context";
import HelpMain from "../../screen-components/home/help/view/main";

const HelpScreen = () => {
  // Hooks
  const { appTheme } = useApptheme();
  return (
    <WorkspacePage
      title="Help & Support"
      description="Find answers and get help with your deliveries."
      compact
    >
      <SafeAreaView
        edges={["bottom", "right", "left"]}
        className="w-full h-full"
        style={{ backgroundColor: appTheme.screenBackground }}
      >
        <HelpMain />
      </SafeAreaView>
    </WorkspacePage>
  );
};

export default HelpScreen;
