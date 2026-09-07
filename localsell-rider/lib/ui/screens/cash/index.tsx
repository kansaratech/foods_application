import WorkspacePage from "@/lib/ui/layouts/workspace-page";
// Core
import { SafeAreaView } from "react-native-safe-area-context";

// Hooks
import { useApptheme } from "@/lib/context/global/theme.context";

// Components
import CashMain from "../../screen-components/home/cash/view/main";

const CashScreen = () => {
  const { appTheme } = useApptheme();
  return (
    <WorkspacePage
      title="Cash collection"
      description="Track collected cash and outstanding remittances."
    >
      <SafeAreaView
        edges={["bottom", "right", "left"]}
        className="w-full h-full"
        style={{ backgroundColor: appTheme.screenBackground }}
      >
        <CashMain />
      </SafeAreaView>
    </WorkspacePage>
  );
};

export default CashScreen;
